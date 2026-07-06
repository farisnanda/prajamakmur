"use server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function markWithdrawalTransferred(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    !["BENDAHARA", "ADMIN_KOPERASI", "SUPER_ADMIN"].includes(session.user.role)
  )
    throw new Error("Akses Bendahara diperlukan.");
  const data = z
    .object({
      requestId: z.string().min(1),
      transferReference: z.string().trim().min(3),
      transferDate: z.coerce.date(),
    })
    .parse(Object.fromEntries(formData));
  const request = await prisma.savingsWithdrawalRequest.findUnique({
    where: { id: data.requestId },
    include: { member: true },
  });
  if (!request || request.status !== "SUBMITTED")
    redirect("/simpanan/sukarela/penarikan?error=invalid");
  await prisma.$transaction(async (tx) => {
    const cash = await tx.cashAccount.findUnique({
      where: { code: "KAS_UMUM" },
    });
    if (!cash || cash.balance.lessThan(request.amount))
      throw new Error("Saldo Kas Umum tidak mencukupi.");
    await tx.savingsTransaction.create({
      data: {
        receiptNumber: `TRX-${Date.now()}-${crypto.randomUUID().slice(0, 5).toUpperCase()}`,
        memberId: request.memberId,
        savingsType: "SUKARELA",
        transactionType: "PENARIKAN",
        amount: request.amount,
        transactionDate: data.transferDate,
        note: `Penarikan ${request.requestNumber} · Transfer ${data.transferReference}`,
        createdById: session.user.id,
      },
    });
    await tx.savingsWithdrawalRequest.update({
      where: { id: request.id },
      data: {
        status: "TRANSFERRED",
        transferReference: data.transferReference,
        transferredAt: data.transferDate,
      },
    });
    await tx.cashAccount.update({
      where: { id: cash.id },
      data: { balance: { decrement: request.amount } },
    });
    await tx.cashTransaction.create({
      data: {
        reference: `KAS-${request.requestNumber}`,
        accountId: cash.id,
        type: "OUTFLOW",
        amount: request.amount,
        transactionDate: data.transferDate,
        description: `Penarikan Simpanan Sukarela ${request.member.name}`,
        note: `Transfer ${data.transferReference}`,
      },
    });
    await tx.bookkeepingEntry.create({
      data: {
        reference: `BK-${request.requestNumber}`,
        transactionDate: data.transferDate,
        description: `Penarikan Simpanan Sukarela ${request.member.name}`,
        debitAccount: "Simpanan Sukarela Anggota",
        creditAccount: cash.name,
        amount: request.amount,
      },
    });
  });
  revalidatePath("/simpanan/sukarela");
  revalidatePath("/simpanan/sukarela/penarikan");
  revalidatePath("/penarikan-sukarela");
  revalidatePath("/akuntansi/arus-kas");
  revalidatePath("/dashboard");
  redirect("/simpanan/sukarela/penarikan?success=transferred");
}
