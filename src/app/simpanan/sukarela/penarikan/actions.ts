"use server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { KAS_UMUM_BANK } from "@/lib/cashAccounts";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
class TransferError extends Error {
  constructor(readonly kind: "invalid" | "cash") {
    super(kind);
  }
}

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
  let failure: "invalid" | "cash" | null = null;
  try {
    await prisma.$transaction(async (tx) => {
      const cash = await tx.cashAccount.findUnique({
        where: { code: KAS_UMUM_BANK },
      });
      if (!cash) throw new TransferError("cash");
      // Ambil pengajuan hanya jika masih "SUBMITTED": satu transfer saja,
      // walau tombol ditekan dua kali atau dua petugas bersamaan.
      const claimed = await tx.savingsWithdrawalRequest.updateMany({
        where: { id: request.id, status: "SUBMITTED" },
        data: {
          status: "TRANSFERRED",
          transferReference: data.transferReference,
          transferredAt: data.transferDate,
        },
      });
      if (claimed.count === 0) throw new TransferError("invalid");
      // Kurangi kas hanya jika saldo cukup, dalam satu pernyataan atomik.
      const debited = await tx.cashAccount.updateMany({
        where: { id: cash.id, balance: { gte: request.amount } },
        data: { balance: { decrement: request.amount } },
      });
      if (debited.count === 0) throw new TransferError("cash");
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
  } catch (error) {
    if (!(error instanceof TransferError)) throw error;
    failure = error.kind;
  }
  if (failure === "cash") redirect("/simpanan/sukarela/penarikan?error=cash");
  if (failure === "invalid") redirect("/simpanan/sukarela/penarikan?error=invalid");
  await audit({
    action: "WITHDRAWAL_TRANSFER",
    entity: "SavingsWithdrawalRequest",
    entityId: request.id,
    summary: `Mentransfer penarikan ${request.requestNumber} ${request.member.name} Rp${request.amount.toNumber().toLocaleString("id-ID")} (transfer ${data.transferReference})`,
  });
  revalidatePath("/simpanan/sukarela");
  revalidatePath("/simpanan/sukarela/penarikan");
  revalidatePath("/penarikan-sukarela");
  revalidatePath("/akuntansi/arus-kas");
  revalidatePath("/dashboard");
  redirect("/simpanan/sukarela/penarikan?success=transferred");
}
