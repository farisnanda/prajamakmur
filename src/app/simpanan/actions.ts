"use server";

import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { cashChannelCode } from "@/lib/cashAccounts";
import { audit } from "@/lib/audit";
import { logError } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { recordPrincipalSavings } from "@/lib/principalSavings";

export type SavingsFormState = {
  message?: string;
  errors?: Record<string, string[]>;
};
export type BulkMandatorySavingsState = {
  message?: string;
  errors?: Record<string, string[]>;
};

const schema = z.object({
  memberId: z.string().min(1, "Pilih anggota."),
  savingsType: z.enum(["POKOK", "WAJIB", "SUKARELA"]),
  transactionType: z.enum(["SETORAN", "PENARIKAN"]),
  cashChannel: z.enum(["BANK", "TUNAI"]),
  amount: z.coerce.number().positive("Nominal harus lebih dari nol."),
  period: z.string().optional(),
  transactionDate: z.coerce.date(),
  note: z.string().trim().optional(),
});

const bulkMandatorySchema = z.object({
  transactionDate: z.coerce.date(),
  period: z.string().regex(/^\d{4}-\d{2}$/, "Periode wajib diisi."),
  cashChannel: z.enum(["BANK", "TUNAI"]),
  note: z.string().trim().optional(),
  memberIds: z.array(z.string().min(1)).min(1, "Pilih minimal satu anggota."),
});

async function requireSavingsAccess() {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    !["SUPER_ADMIN", "ADMIN_KOPERASI", "BENDAHARA"].includes(session.user.role)
  ) {
    throw new Error("Anda tidak memiliki akses untuk mencatat simpanan.");
  }

  return session;
}

export async function createSavingsTransaction(
  _state: SavingsFormState,
  formData: FormData,
): Promise<SavingsFormState> {
  const session = await requireSavingsAccess();

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const data = parsed.data;

  if (data.transactionType === "PENARIKAN" && data.savingsType !== "SUKARELA") {
    return {
      message: "Penarikan hanya diperbolehkan untuk Simpanan Sukarela.",
    };
  }

  const [setting, member] = await Promise.all([
    prisma.savingsSetting.findUnique({ where: { id: "default" } }),
    prisma.member.findUnique({
      where: { id: data.memberId },
      select: { name: true, employmentStatus: true, isActive: true },
    }),
  ]);
  if (!setting)
    return { message: "Pengaturan nominal simpanan belum tersedia." };
  if (!member?.isActive)
    return { message: "Anggota tidak ditemukan atau sudah nonaktif." };

  if (
    data.savingsType === "POKOK" &&
    data.amount !== setting.principalAmount.toNumber()
  ) {
    return {
      message: `Simpanan Pokok harus sebesar Rp${setting.principalAmount.toNumber().toLocaleString("id-ID")}.`,
    };
  }
  const mandatoryAmount =
    member.employmentStatus === "PNS"
      ? (setting.mandatoryPnsAmount?.toNumber() ?? 300000)
      : (setting.mandatoryPppkAmount?.toNumber() ?? 200000);
  if (data.savingsType === "WAJIB" && data.amount !== mandatoryAmount) {
    return {
      message: `Simpanan Wajib anggota ini harus sebesar Rp${mandatoryAmount.toLocaleString("id-ID")}.`,
    };
  }

  const periodKey =
    data.savingsType === "POKOK"
      ? "POKOK"
      : data.savingsType === "WAJIB"
        ? data.period
        : null;
  if (data.savingsType === "WAJIB" && !/^\d{4}-\d{2}$/.test(periodKey ?? "")) {
    return { errors: { period: ["Periode wajib diisi."] } };
  }

  if (data.transactionType === "PENARIKAN") {
    const totals = await prisma.savingsTransaction.groupBy({
      by: ["transactionType"],
      where: { memberId: data.memberId, savingsType: "SUKARELA" },
      _sum: { amount: true },
    });
    const deposits =
      totals
        .find((item) => item.transactionType === "SETORAN")
        ?._sum.amount?.toNumber() ?? 0;
    const withdrawals =
      totals
        .find((item) => item.transactionType === "PENARIKAN")
        ?._sum.amount?.toNumber() ?? 0;
    if (data.amount > deposits - withdrawals)
      return { message: "Saldo Simpanan Sukarela tidak mencukupi." };
  }

  try {
    const receiptNumber = `TRX-${Date.now()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    await prisma.$transaction(async (tx) => {
      const cash = await tx.cashAccount.findUnique({
        where: { code: cashChannelCode(data.cashChannel) },
      });
      if (!cash) throw new Error("Rekening kas belum tersedia.");
      if (
        data.transactionType === "PENARIKAN" &&
        cash.balance.toNumber() < data.amount
      )
        throw new Error(`Saldo ${cash.name} tidak mencukupi.`);
      await tx.savingsTransaction.create({
        data: {
          receiptNumber,
          memberId: data.memberId,
          savingsType: data.savingsType,
          transactionType: data.transactionType,
          amount: new Prisma.Decimal(data.amount),
          periodKey,
          transactionDate: data.transactionDate,
          note: data.note || null,
          createdById: session.user.id,
        },
      });
      const incoming = data.transactionType === "SETORAN";
      // Penarikan: kurangi hanya jika saldo cukup, dalam satu pernyataan atomik.
      const moved = await tx.cashAccount.updateMany({
        where: incoming
          ? { id: cash.id }
          : { id: cash.id, balance: { gte: new Prisma.Decimal(data.amount) } },
        data: {
          balance: { [incoming ? "increment" : "decrement"]: data.amount },
        },
      });
      if (moved.count === 0) throw new Error(`Saldo ${cash.name} tidak mencukupi.`);
      await tx.cashTransaction.create({
        data: {
          reference: `KAS-${receiptNumber}`,
          accountId: cash.id,
          type: incoming ? "INFLOW" : "OUTFLOW",
          amount: new Prisma.Decimal(data.amount),
          transactionDate: data.transactionDate,
          description: `${incoming ? "Setoran" : "Penarikan"} Simpanan ${data.savingsType} - ${member.name}`,
          note: data.note || null,
        },
      });
      await tx.bookkeepingEntry.create({
        data: {
          reference: `BK-${receiptNumber}`,
          transactionDate: data.transactionDate,
          description: `${incoming ? "Setoran" : "Penarikan"} Simpanan ${data.savingsType} - ${member.name}`,
          debitAccount: incoming
            ? cash.name
            : `Simpanan ${data.savingsType} Anggota`,
          creditAccount: incoming
            ? `Simpanan ${data.savingsType} Anggota`
            : cash.name,
          amount: new Prisma.Decimal(data.amount),
        },
      });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        message:
          data.savingsType === "POKOK"
            ? "Simpanan Pokok anggota ini sudah dibayar."
            : "Simpanan Wajib untuk periode tersebut sudah dibayar.",
      };
    }
    if (error instanceof Error && error.message.startsWith("Saldo"))
      return { message: error.message };
    logError("create-savings", error, { memberId: data.memberId });
    return { message: "Transaksi belum dapat disimpan." };
  }

  const destination =
    data.savingsType === "POKOK"
      ? "/simpanan/pokok"
      : data.savingsType === "WAJIB"
        ? "/simpanan/wajib"
        : "/simpanan/sukarela";
  await audit({
    action: "SAVINGS_RECORD",
    entity: "Member",
    entityId: data.memberId,
    summary: `${data.transactionType === "SETORAN" ? "Setoran" : "Penarikan"} simpanan ${data.savingsType} ${member.name} Rp${data.amount.toLocaleString("id-ID")} (kas ${data.cashChannel})`,
  });
  revalidatePath("/simpanan");
  revalidatePath(destination);
  revalidatePath("/akuntansi/arus-kas");
  revalidatePath("/dashboard");
  redirect(`${destination}?success=created`);
}

const bulkPrincipalSchema = z.object({
  transactionDate: z.coerce.date(),
  cashChannel: z.enum(["BANK", "TUNAI"]),
  note: z.string().trim().optional(),
  memberIds: z.array(z.string().min(1)).min(1, "Pilih minimal satu anggota."),
});

/** Catat simpanan pokok sekaligus untuk banyak anggota (anggota yang sudah punya dilewati). */
export async function createBulkPrincipalSavings(
  _state: BulkMandatorySavingsState,
  formData: FormData,
): Promise<BulkMandatorySavingsState> {
  const session = await requireSavingsAccess();
  const parsed = bulkPrincipalSchema.safeParse({
    transactionDate: formData.get("transactionDate"),
    cashChannel: formData.get("cashChannel"),
    note: formData.get("note"),
    memberIds: formData.getAll("memberIds"),
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const data = parsed.data;

  const members = await prisma.member.findMany({
    where: { id: { in: data.memberIds }, isActive: true },
    select: { id: true, name: true },
  });
  if (!members.length)
    return { message: "Tidak ada anggota aktif yang dipilih." };

  let created = 0;
  try {
    const result = await prisma.$transaction(
      (tx) =>
        recordPrincipalSavings(tx, {
          members,
          createdById: session.user.id,
          channel: data.cashChannel,
          date: data.transactionDate,
          note: data.note || "Simpanan pokok",
        }),
      { timeout: 120_000, maxWait: 10_000 },
    );
    created = result.count;
  } catch (error) {
    return {
      message:
        error instanceof Error && error.message.includes("kas")
          ? error.message
          : "Transaksi belum dapat disimpan.",
    };
  }
  if (!created)
    return { message: "Semua anggota terpilih sudah memiliki simpanan pokok." };

  await audit({
    action: "SAVINGS_RECORD",
    summary: `Simpanan pokok serentak: ${created} anggota (kas ${data.cashChannel})`,
    metadata: { created, channel: data.cashChannel },
  });
  revalidatePath("/simpanan");
  revalidatePath("/simpanan/pokok");
  revalidatePath("/akuntansi/arus-kas");
  revalidatePath("/dashboard");
  redirect(
    `/simpanan/pokok?success=batch&created=${created}&skipped=${members.length - created}`,
  );
}

export async function createBulkMandatorySavings(
  _state: BulkMandatorySavingsState,
  formData: FormData,
): Promise<BulkMandatorySavingsState> {
  const session = await requireSavingsAccess();
  const parsed = bulkMandatorySchema.safeParse({
    transactionDate: formData.get("transactionDate"),
    period: formData.get("period"),
    cashChannel: formData.get("cashChannel"),
    note: formData.get("note"),
    memberIds: formData.getAll("memberIds"),
  });

  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const data = parsed.data;

  const [setting, members, existingTransactions] = await Promise.all([
    prisma.savingsSetting.findUnique({ where: { id: "default" } }),
    prisma.member.findMany({
      where: { id: { in: data.memberIds }, isActive: true },
      select: { id: true, employmentStatus: true },
    }),
    prisma.savingsTransaction.findMany({
      where: {
        memberId: { in: data.memberIds },
        savingsType: "WAJIB",
        periodKey: data.period,
      },
      select: { memberId: true },
    }),
  ]);

  if (!setting)
    return { message: "Pengaturan nominal simpanan belum tersedia." };
  if (!members.length)
    return { message: "Tidak ada anggota aktif yang dipilih." };

  const existingMemberIds = new Set(
    existingTransactions.map((item) => item.memberId),
  );
  const membersToCreate = members.filter(
    (member) => !existingMemberIds.has(member.id),
  );

  if (!membersToCreate.length) {
    return {
      message: "Semua anggota terpilih sudah tercatat untuk periode ini.",
    };
  }

  const rows = membersToCreate.map((member, index) => ({
    receiptNumber: `TRX-${Date.now()}-${index}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
    memberId: member.id,
    savingsType: "WAJIB" as const,
    transactionType: "SETORAN" as const,
    amount: new Prisma.Decimal(
      member.employmentStatus === "PNS"
        ? (setting.mandatoryPnsAmount?.toNumber() ?? 300000)
        : (setting.mandatoryPppkAmount?.toNumber() ?? 200000),
    ),
    periodKey: data.period,
    transactionDate: data.transactionDate,
    note: data.note || null,
    createdById: session.user.id,
  }));
  const total = rows.reduce((sum, row) => sum + row.amount.toNumber(), 0),
    batchRef = `WAJIB-${data.period}-${Date.now()}`;
  await prisma.$transaction(async (tx) => {
    const cash = await tx.cashAccount.findUnique({
      where: { code: cashChannelCode(data.cashChannel) },
    });
    if (!cash) throw new Error("Rekening kas belum tersedia.");
    await tx.savingsTransaction.createMany({ data: rows });
    await tx.cashAccount.update({
      where: { id: cash.id },
      data: { balance: { increment: total } },
    });
    await tx.cashTransaction.create({
      data: {
        reference: `KAS-${batchRef}`,
        accountId: cash.id,
        type: "INFLOW",
        amount: new Prisma.Decimal(total),
        transactionDate: data.transactionDate,
        description: `Setoran Simpanan Wajib serentak ${data.period} (${rows.length} anggota)`,
        note: data.note || null,
      },
    });
    await tx.bookkeepingEntry.create({
      data: {
        reference: `BK-${batchRef}`,
        transactionDate: data.transactionDate,
        description: `Setoran Simpanan Wajib serentak ${data.period}`,
        debitAccount: cash.name,
        creditAccount: "Simpanan Wajib Anggota",
        amount: new Prisma.Decimal(total),
      },
    });
  });

  const skippedCount = members.length - membersToCreate.length;

  await audit({
    action: "SAVINGS_RECORD",
    summary: `Simpanan wajib serentak periode ${data.period}: ${membersToCreate.length} anggota (kas ${data.cashChannel})`,
    metadata: { period: data.period, created: membersToCreate.length, channel: data.cashChannel },
  });
  revalidatePath("/simpanan");
  revalidatePath("/simpanan/wajib");
  revalidatePath("/akuntansi/arus-kas");
  revalidatePath("/dashboard");
  redirect(
    `/simpanan/wajib?success=batch&created=${membersToCreate.length}&skipped=${skippedCount}&period=${data.period}`,
  );
}
