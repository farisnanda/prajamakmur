"use server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function requestVoluntaryWithdrawal(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ANGGOTA")
    throw new Error("Akses anggota diperlukan.");
  const parsed = z
    .object({
      amount: z.coerce.number().positive(),
      bankName: z.string().trim().min(2),
      accountNumber: z.string().trim().min(5),
      accountHolder: z.string().trim().min(3),
      note: z.string().trim().optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/penarikan-sukarela?error=invalid");
  const member = await prisma.member.findFirst({
    where: { user: { id: session.user.id } },
  });
  if (!member) redirect("/dashboard");
  const totals = await prisma.savingsTransaction.groupBy({
    by: ["transactionType"],
    where: { memberId: member.id, savingsType: "SUKARELA" },
    _sum: { amount: true },
  });
  const deposits =
    totals
      .find((x) => x.transactionType === "SETORAN")
      ?._sum.amount?.toNumber() ?? 0;
  const withdrawals =
    totals
      .find((x) => x.transactionType === "PENARIKAN")
      ?._sum.amount?.toNumber() ?? 0;
  const pending = await prisma.savingsWithdrawalRequest.aggregate({
    where: { memberId: member.id, status: "SUBMITTED" },
    _sum: { amount: true },
  });
  const available =
    deposits - withdrawals - (pending._sum.amount?.toNumber() ?? 0);
  if (parsed.data.amount > available)
    redirect("/penarikan-sukarela?error=balance");
  await prisma.savingsWithdrawalRequest.create({
    data: {
      requestNumber: `PS-${Date.now()}-${crypto.randomUUID().slice(0, 5).toUpperCase()}`,
      memberId: member.id,
      amount: new Prisma.Decimal(parsed.data.amount),
      bankName: parsed.data.bankName,
      accountNumber: parsed.data.accountNumber,
      accountHolder: parsed.data.accountHolder,
      note: parsed.data.note || null,
    },
  });
  revalidatePath("/penarikan-sukarela");
  revalidatePath("/simpanan/sukarela/penarikan");
  redirect("/penarikan-sukarela?success=created");
}
