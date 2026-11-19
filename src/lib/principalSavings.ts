import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { cashChannelCode, type CashChannel } from "@/lib/cashAccounts";

type Db = PrismaClient | Prisma.TransactionClient;

export const DEFAULT_PRINCIPAL_AMOUNT = 500_000;
/** Anggota aktif yang belum punya setoran simpanan pokok. */
export const missingPrincipalWhere = {
  isActive: true,
  savings: { none: { savingsType: "POKOK" as const, transactionType: "SETORAN" as const } },
};

export const AUTO_NOTE = "Simpanan pokok otomatis";

/** Nominal simpanan pokok dari pengaturan (default Rp500.000 bila belum diatur). */
export async function principalAmount(db: Db): Promise<number> {
  const setting = await db.savingsSetting.findUnique({ where: { id: "default" } });
  return setting?.principalAmount.toNumber() ?? DEFAULT_PRINCIPAL_AMOUNT;
}

/**
 * Catat simpanan pokok untuk sekumpulan anggota sekaligus, lengkap dengan
 * kas masuk dan jurnal pembukuan (sama seperti setoran simpanan biasa).
 * Anggota yang sudah punya simpanan pokok dilewati, jadi aman dipanggil ulang.
 * Harus dipanggil di dalam transaksi.
 */
export async function recordPrincipalSavings(
  tx: Prisma.TransactionClient,
  options: {
    members: { id: string; name: string }[];
    createdById: string;
    channel?: CashChannel;
    date?: Date;
    note?: string;
  },
): Promise<{ count: number; total: number }> {
  const { members, createdById, channel = "BANK", date = new Date(), note = AUTO_NOTE } = options;
  if (!members.length) return { count: 0, total: 0 };

  const already = await tx.savingsTransaction.findMany({
    where: {
      memberId: { in: members.map((m) => m.id) },
      savingsType: "POKOK",
      transactionType: "SETORAN",
    },
    select: { memberId: true },
  });
  const paid = new Set(already.map((row) => row.memberId));
  const targets = members.filter((member) => !paid.has(member.id));
  if (!targets.length) return { count: 0, total: 0 };

  const amount = await principalAmount(tx);
  const cash = await tx.cashAccount.findUnique({ where: { code: cashChannelCode(channel) } });
  if (!cash) throw new Error("Rekening kas belum tersedia.");

  const rows = targets.map((member) => ({
    member,
    receiptNumber: `TRX-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
  }));
  const decimal = new Prisma.Decimal(amount);

  await tx.savingsTransaction.createMany({
    data: rows.map(({ member, receiptNumber }) => ({
      receiptNumber,
      memberId: member.id,
      savingsType: "POKOK" as const,
      transactionType: "SETORAN" as const,
      amount: decimal,
      periodKey: "POKOK",
      transactionDate: date,
      note,
      createdById,
    })),
  });
  await tx.cashTransaction.createMany({
    data: rows.map(({ member, receiptNumber }) => ({
      reference: `KAS-${receiptNumber}`,
      accountId: cash.id,
      type: "INFLOW" as const,
      amount: decimal,
      transactionDate: date,
      description: `Setoran Simpanan POKOK - ${member.name}`,
      note,
    })),
  });
  await tx.bookkeepingEntry.createMany({
    data: rows.map(({ member, receiptNumber }) => ({
      reference: `BK-${receiptNumber}`,
      transactionDate: date,
      description: `Setoran Simpanan POKOK - ${member.name}`,
      debitAccount: cash.name,
      creditAccount: "Simpanan POKOK Anggota",
      amount: decimal,
    })),
  });
  const total = amount * rows.length;
  await tx.cashAccount.update({
    where: { id: cash.id },
    data: { balance: { increment: total } },
  });

  return { count: rows.length, total };
}
