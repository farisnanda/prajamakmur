"use server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
async function access() {
  const s = await getServerSession(authOptions);
  if (
    !s ||
    !["SUPER_ADMIN", "ADMIN_KOPERASI", "BENDAHARA", "PENGURUS"].includes(
      s.user.role,
    )
  )
    throw new Error("Tidak memiliki akses akuntansi.");
}
export async function createCashTransaction(fd: FormData) {
  await access();
  const d = z
    .object({
      accountId: z.string().min(1),
      type: z.enum(["INFLOW", "OUTFLOW"]),
      amount: z.coerce.number().positive(),
      transactionDate: z.coerce.date(),
      description: z.string().trim().min(3),
      note: z.string().trim().optional(),
    })
    .parse(Object.fromEntries(fd));
  await prisma.$transaction(async (tx) => {
    const a = await tx.cashAccount.findUnique({ where: { id: d.accountId } });
    if (!a || (d.type === "OUTFLOW" && a.balance.toNumber() < d.amount))
      throw new Error("Saldo kas tidak mencukupi.");
    await tx.cashAccount.update({
      where: { id: a.id },
      data: {
        balance: { increment: d.type === "INFLOW" ? d.amount : -d.amount },
      },
    });
    await tx.cashTransaction.create({
      data: {
        reference: `KAS-${Date.now()}-${crypto.randomUUID().slice(0, 5).toUpperCase()}`,
        accountId: a.id,
        type: d.type,
        amount: new Prisma.Decimal(d.amount),
        transactionDate: d.transactionDate,
        description: d.description,
        note: d.note || null,
      },
    });
  });
  revalidatePath("/akuntansi/arus-kas");
  redirect("/akuntansi/arus-kas?success=created");
}
export async function createOperationalExpense(fd: FormData) {
  await access();
  const d = z
    .object({
      accountId: z.string().min(1),
      category: z.enum([
        "KESEJAHTERAAN_MANAJER",
        "KESEJAHTERAAN_PEGAWAI",
        "MAKAN_MINUM",
        "BANTUAN_TRANSPORTASI",
        "HONORARIUM_NARASUMBER",
        "HONORARIUM_SIDANG",
      ]),
      amount: z.coerce.number().positive(),
      transactionDate: z.coerce.date(),
      recipient: z.string().trim().optional(),
      description: z.string().trim().min(3),
      note: z.string().trim().optional(),
    })
    .parse(Object.fromEntries(fd));
  await prisma.$transaction(async (tx) => {
    const a = await tx.cashAccount.findUnique({ where: { id: d.accountId } });
    if (!a || a.balance.toNumber() < d.amount)
      throw new Error("Saldo sumber kas tidak mencukupi.");
    const no = `BO-${Date.now()}-${crypto.randomUUID().slice(0, 5).toUpperCase()}`;
    await tx.cashAccount.update({
      where: { id: a.id },
      data: { balance: { decrement: d.amount } },
    });
    await tx.operationalExpense.create({
      data: {
        expenseNumber: no,
        accountId: a.id,
        category: d.category,
        amount: new Prisma.Decimal(d.amount),
        transactionDate: d.transactionDate,
        recipient: d.recipient || null,
        description: d.description,
        note: d.note || null,
      },
    });
    await tx.cashTransaction.create({
      data: {
        reference: `KAS-${no}`,
        accountId: a.id,
        type: "OUTFLOW",
        amount: new Prisma.Decimal(d.amount),
        transactionDate: d.transactionDate,
        description: `Belanja operasional: ${d.description}`,
        note: d.note || null,
      },
    });
    await tx.bookkeepingEntry.create({
      data: {
        reference: `BK-${no}`,
        transactionDate: d.transactionDate,
        description: d.description,
        debitAccount: `Belanja Operasional - ${d.category}`,
        creditAccount: a.name,
        amount: new Prisma.Decimal(d.amount),
      },
    });
  });
  revalidatePath("/akuntansi/belanja-operasional");
  revalidatePath("/akuntansi/arus-kas");
  redirect("/akuntansi/belanja-operasional?success=created");
}
