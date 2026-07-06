"use server";

import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function allocateAnnuity(
  principal: number,
  annualRate: number,
  monthlyPayment: number,
  paidPrincipal: number,
  amount: number,
) {
  let remainingPrincipal = Math.max(0, principal - paidPrincipal),
    remainingPayment = amount,
    principalComponent = 0,
    interestComponent = 0;
  const rate = annualRate / 100 / 12;
  for (
    let i = 0;
    i < 100 && remainingPayment > 0.005 && remainingPrincipal > 0.005;
    i++
  ) {
    const chunk = Math.min(
        remainingPayment,
        monthlyPayment || remainingPayment,
      ),
      interest = Math.min(chunk, remainingPrincipal * rate),
      principalPart = Math.min(remainingPrincipal, chunk - interest);
    interestComponent += interest;
    principalComponent += principalPart;
    remainingPrincipal -= principalPart;
    remainingPayment -= chunk;
  }
  if (remainingPayment > 0) {
    interestComponent += remainingPayment;
  }
  return { principalComponent, interestComponent };
}

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
    include: { payments: true },
  });
  if (!loan || loan.status !== "ACTIVE" || !loan.monthlyPayment)
    redirect("/pinjaman/pembayaran?error=invalid");
  const monthly = loan.monthlyPayment.toNumber();
  const total = monthly * loan.tenureMonths;
  let paid = loan.payments.reduce(
    (sum, payment) => sum + payment.amount.toNumber(),
    0,
  );
  let paidPrincipal = loan.payments.reduce(
    (sum, payment) => sum + payment.principalComponent.toNumber(),
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
    const { principalComponent, interestComponent } = allocateAnnuity(
      loan.principalAmount.toNumber(),
      loan.interestRate.toNumber(),
      monthly,
      paidPrincipal,
      amount,
    );
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
    paidPrincipal += principalComponent;
  }
  if (!rows.length) redirect("/pinjaman/pembayaran?error=exceeds");
  const totalAmount = rows.reduce((sum, row) => sum + row.amount.toNumber(), 0);
  await prisma.$transaction(async (tx) => {
    const cash = await tx.cashAccount.findUnique({
      where: { code: "KAS_UMUM" },
    });
    if (!cash) throw new Error("Kas Umum belum tersedia.");
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
    }
    await tx.cashAccount.update({
      where: { id: cash.id },
      data: { balance: { increment: totalAmount } },
    });
    await tx.cashTransaction.create({
      data: {
        reference: `KAS-ANGSURAN-${loan.loanNumber}-${Date.now()}`,
        accountId: cash.id,
        type: "INFLOW",
        amount: new Prisma.Decimal(totalAmount),
        transactionDate: parsed.data.paymentDate,
        description: `Pembayaran ${rows.length} angsuran pinjaman ${loan.loanNumber}`,
        note: parsed.data.note || null,
      },
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
      payments: { select: { amount: true, principalComponent: true } },
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
    const paidPrincipal = loan.payments.reduce(
      (sum, payment) => sum + payment.principalComponent.toNumber(),
      0,
    );
    const amount = Math.min(monthly, outstanding),
      allocation = allocateAnnuity(
        loan.principalAmount.toNumber(),
        loan.interestRate.toNumber(),
        monthly,
        paidPrincipal,
        amount,
      ),
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
        where: { code: "KAS_UMUM" },
      });
      if (!cash) throw new Error("Kas Umum belum tersedia.");
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
      await tx.cashTransaction.create({
        data: {
          reference: `KAS-ANGSURAN-${parsed.data.period}-${Date.now()}`,
          accountId: cash.id,
          type: "INFLOW",
          amount: new Prisma.Decimal(totalIn),
          transactionDate: parsed.data.paymentDate,
          description: `Pembayaran pinjaman serentak ${parsed.data.period}`,
          note: parsed.data.note || null,
        },
      });
    });
  revalidatePath("/pinjaman/pembayaran");
  revalidatePath("/pengajuan-pinjaman");
  revalidatePath("/dashboard");
  redirect(
    `/pinjaman/pembayaran?success=bulk&created=${rows.length}&skipped=${loans.length - rows.length}`,
  );
}
