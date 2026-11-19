"use server";

import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { allocatePayment } from "@/lib/annuity";
import { KAS_UMUM_BANK } from "@/lib/cashAccounts";
import { prisma } from "@/lib/prisma";

export async function createLoanInstallmentPayments(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    !["SUPER_ADMIN", "ADMIN_KOPERASI", "BENDAHARA"].includes(session.user.role)
  )
    throw new Error("Tidak memiliki akses pembayaran pinjaman.");
  const parsed = z
    .object({
      loanId: z.string().min(1),
      installmentCount: z.coerce.number().int().positive(),
      paymentDate: z.coerce.date(),
      note: z.string().trim().optional(),
    })
    .safeParse({
      loanId: formData.get("loanId"),
      installmentCount: formData.getAll("installments").length,
      paymentDate: formData.get("paymentDate"),
      note: formData.get("note"),
    });
  if (!parsed.success) redirect("/pinjaman/pembayaran?error=invalid");
  const loan = await prisma.loan.findUnique({
    where: { id: parsed.data.loanId },
    include: { payments: true, member: { select: { name: true } } },
  });
  if (!loan || loan.status !== "ACTIVE" || !loan.monthlyPayment)
    redirect("/pinjaman/pembayaran?error=invalid");
  const monthly = loan.monthlyPayment.toNumber();
  const total = monthly * loan.tenureMonths;
  let paid = loan.payments.reduce(
    (sum, payment) => sum + payment.amount.toNumber(),
    0,
  );
  // Seluruh bunga dibayar lebih dulu dari cicilan awal; sisanya mengurangi pokok.
  let paidInterest = loan.payments.reduce(
    (sum, payment) => sum + payment.interestComponent.toNumber(),
    0,
  );
  if (paid >= total - 1) redirect("/pinjaman/pembayaran?error=exceeds");
  const rows: {
    receiptNumber: string;
    loanId: string;
    amount: Prisma.Decimal;
    principalComponent: Prisma.Decimal;
    interestComponent: Prisma.Decimal;
    installmentNumber: number;
    paymentDate: Date;
    note: string | null;
  }[] = [];
  for (let i = 0; i < parsed.data.installmentCount; i++) {
    const outstanding = Math.max(0, total - paid);
    if (outstanding <= 0) break;
    const amount = Math.min(monthly, outstanding);
    const { principalComponent, interestComponent } = allocatePayment({
      principal: loan.principalAmount.toNumber(),
      monthly,
      months: loan.tenureMonths,
      paidInterest,
      amount,
    });
    rows.push({
      receiptNumber: `ANG-${Date.now()}-${i}-${crypto.randomUUID().slice(0, 5).toUpperCase()}`,
      loanId: loan.id,
      amount: new Prisma.Decimal(amount),
      principalComponent: new Prisma.Decimal(principalComponent),
      interestComponent: new Prisma.Decimal(interestComponent),
      installmentNumber: loan.payments.length + rows.length + 1,
      paymentDate: parsed.data.paymentDate,
      note: parsed.data.note || null,
    });
    paid += amount;
    paidInterest += interestComponent;
  }
  if (!rows.length) redirect("/pinjaman/pembayaran?error=exceeds");
  const totalAmount = rows.reduce((sum, row) => sum + row.amount.toNumber(), 0);
  await prisma.$transaction(async (tx) => {
    const cash = await tx.cashAccount.findUnique({
      where: { code: KAS_UMUM_BANK },
    });
    if (!cash) throw new Error("Kas Umum - Rekening Bank belum tersedia.");
    for (const row of rows) {
      const payment = await tx.loanPayment.create({ data: row });
      const interest = row.interestComponent.toNumber();
      if (interest > 0)
        await tx.businessIncome.create({
          data: {
            reference: `HU-${row.receiptNumber}`,
            loanId: loan.id,
            loanPaymentId: payment.id,
            amount: row.interestComponent,
            recognizedAt: row.paymentDate,
            description: `Bunga jasa angsuran ${loan.loanNumber}`,
          },
        });
      if (row.principalComponent.toNumber() > 0)
        await tx.cashTransaction.create({
          data: {
            reference: `KAS-POKOK-${row.receiptNumber}`,
            accountId: cash.id,
            type: "INFLOW",
            amount: row.principalComponent,
            transactionDate: row.paymentDate,
            description: `Pembayaran Pokok Pinjaman ${loan.member.name} angsuran ke-${row.installmentNumber}`,
            note: row.note,
          },
        });
      if (interest > 0)
        await tx.cashTransaction.create({
          data: {
            reference: `KAS-BUNGA-${row.receiptNumber}`,
            accountId: cash.id,
            type: "INFLOW",
            amount: row.interestComponent,
            transactionDate: row.paymentDate,
            description: `Pembayaran Bunga Pinjaman ${loan.member.name} angsuran ke-${row.installmentNumber}`,
            note: row.note,
          },
        });
    }
    await tx.cashAccount.update({
      where: { id: cash.id },
      data: { balance: { increment: totalAmount } },
    });
    if (paid >= total - 1)
      await tx.loan.update({
        where: { id: loan.id },
        data: { status: "LUNAS" },
      });
  });
  revalidatePath("/pinjaman/pembayaran");
  revalidatePath("/pengajuan-pinjaman");
  revalidatePath("/dashboard");
  redirect("/pinjaman/pembayaran?success=created");
}

export async function createBulkLoanPayments(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    !["SUPER_ADMIN", "ADMIN_KOPERASI", "BENDAHARA"].includes(session.user.role)
  )
    throw new Error("Tidak memiliki akses pembayaran pinjaman.");
  const parsed = z
    .object({
      memberIds: z.array(z.string()).min(1),
      period: z.string().regex(/^\d{4}-\d{2}$/),
      paymentDate: z.coerce.date(),
      note: z.string().trim().optional(),
    })
    .safeParse({
      memberIds: formData.getAll("memberIds"),
      period: formData.get("period"),
      paymentDate: formData.get("paymentDate"),
      note: formData.get("note"),
    });
  if (!parsed.success) redirect("/pinjaman/pembayaran?error=invalid");
  const loans = await prisma.loan.findMany({
    where: {
      memberId: { in: parsed.data.memberIds },
      status: "ACTIVE",
      monthlyPayment: { not: null },
    },
    select: {
      id: true,
      principalAmount: true,
      interestRate: true,
      tenureMonths: true,
      monthlyPayment: true,
      member: { select: { name: true } },
      payments: { select: { amount: true, interestComponent: true } },
    },
  });
  const existing = await prisma.loanPayment.findMany({
    where: {
      loanId: { in: loans.map((loan) => loan.id) },
      periodKey: parsed.data.period,
    },
    select: { loanId: true },
  });
  const existingIds = new Set(existing.map((payment) => payment.loanId));
  const rows = loans.flatMap((loan, index) => {
    const monthly = loan.monthlyPayment?.toNumber() ?? 0;
    const paid = loan.payments.reduce(
      (sum, payment) => sum + payment.amount.toNumber(),
      0,
    );
    const outstanding = Math.max(0, monthly * loan.tenureMonths - paid);
    const paidInterest = loan.payments.reduce(
      (sum, payment) => sum + payment.interestComponent.toNumber(),
      0,
    );
    const amount = Math.min(monthly, outstanding),
      allocation = allocatePayment({
        principal: loan.principalAmount.toNumber(),
        monthly,
        months: loan.tenureMonths,
        paidInterest,
        amount,
      }),
      interestComponent = allocation.interestComponent;
    return !existingIds.has(loan.id) && outstanding > 0
      ? [
          {
            receiptNumber: `ANG-${Date.now()}-${index}-${crypto.randomUUID().slice(0, 5).toUpperCase()}`,
            loanId: loan.id,
            amount: new Prisma.Decimal(amount),
            principalComponent: new Prisma.Decimal(
              allocation.principalComponent,
            ),
            interestComponent: new Prisma.Decimal(interestComponent),
            installmentNumber: loan.payments.length + 1,
            paymentDate: parsed.data.paymentDate,
            periodKey: parsed.data.period,
            note: parsed.data.note || null,
          },
        ]
      : [];
  });
  if (rows.length)
    await prisma.$transaction(async (tx) => {
      const cash = await tx.cashAccount.findUnique({
        where: { code: KAS_UMUM_BANK },
      });
      if (!cash) throw new Error("Kas Umum - Rekening Bank belum tersedia.");
      let totalIn = 0;
      for (const row of rows) {
        const payment = await tx.loanPayment.create({ data: row });
        totalIn += row.amount.toNumber();
        const loan = loans.find((x) => x.id === row.loanId)!;
        if (row.interestComponent.toNumber() > 0)
          await tx.businessIncome.create({
            data: {
              reference: `HU-${row.receiptNumber}`,
              loanId: row.loanId,
              loanPaymentId: payment.id,
              amount: row.interestComponent,
              recognizedAt: row.paymentDate,
              description: `Bunga jasa angsuran pinjaman`,
            },
          });
        if (row.principalComponent.toNumber() > 0)
          await tx.cashTransaction.create({
            data: {
              reference: `KAS-POKOK-${row.receiptNumber}`,
              accountId: cash.id,
              type: "INFLOW",
              amount: row.principalComponent,
              transactionDate: row.paymentDate,
              description: `Pembayaran Pokok Pinjaman ${loan.member.name} angsuran ke-${row.installmentNumber}`,
              note: row.note,
            },
          });
        if (row.interestComponent.toNumber() > 0)
          await tx.cashTransaction.create({
            data: {
              reference: `KAS-BUNGA-${row.receiptNumber}`,
              accountId: cash.id,
              type: "INFLOW",
              amount: row.interestComponent,
              transactionDate: row.paymentDate,
              description: `Pembayaran Bunga Pinjaman ${loan.member.name} angsuran ke-${row.installmentNumber}`,
              note: row.note,
            },
          });
        const previous = loan.payments.reduce(
          (n, p) => n + p.amount.toNumber(),
          0,
        );
        if (
          previous + row.amount.toNumber() >=
          (loan.monthlyPayment?.toNumber() ?? 0) * loan.tenureMonths - 1
        )
          await tx.loan.update({
            where: { id: row.loanId },
            data: { status: "LUNAS" },
          });
      }
      await tx.cashAccount.update({
        where: { id: cash.id },
        data: { balance: { increment: totalIn } },
      });
    });
  revalidatePath("/pinjaman/pembayaran");
  revalidatePath("/pengajuan-pinjaman");
  revalidatePath("/dashboard");
  redirect(
    `/pinjaman/pembayaran?success=bulk&created=${rows.length}&skipped=${loans.length - rows.length}`,
  );
}
