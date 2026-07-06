"use server";

import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  amount: z.coerce.number().positive("Nominal harus lebih dari nol."),
  period: z.string().optional(),
  transactionDate: z.coerce.date(),
  note: z.string().trim().optional(),
});

const bulkMandatorySchema = z.object({
  transactionDate: z.coerce.date(),
  period: z.string().regex(/^\d{4}-\d{2}$/, "Periode wajib diisi."),
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
        where: { code: "KAS_UMUM" },
      });
      if (!cash) throw new Error("Kas Umum belum tersedia.");
      if (
        data.transactionType === "PENARIKAN" &&
        cash.balance.toNumber() < data.amount
      )
        throw new Error("Saldo Kas Umum tidak mencukupi.");
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
      await tx.cashAccount.update({
        where: { id: cash.id },
        data: {
          balance: { [incoming ? "increment" : "decrement"]: data.amount },
        },
      });
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
    return { message: "Transaksi belum dapat disimpan." };
  }

  const destination =
    data.savingsType === "POKOK"
      ? "/simpanan/pokok"
      : data.savingsType === "WAJIB"
        ? "/simpanan/wajib"
        : "/simpanan/sukarela";
  revalidatePath("/simpanan");
  revalidatePath(destination);
  revalidatePath("/akuntansi/arus-kas");
  revalidatePath("/dashboard");
  redirect(`${destination}?success=created`);
}

export async function createBulkMandatorySavings(
  _state: BulkMandatorySavingsState,
  formData: FormData,
): Promise<BulkMandatorySavingsState> {
  const session = await requireSavingsAccess();
  const parsed = bulkMandatorySchema.safeParse({
    transactionDate: formData.get("transactionDate"),
    period: formData.get("period"),
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
      where: { code: "KAS_UMUM" },
    });
    if (!cash) throw new Error("Kas Umum belum tersedia.");
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

  revalidatePath("/simpanan");
  revalidatePath("/simpanan/wajib");
  revalidatePath("/akuntansi/arus-kas");
  revalidatePath("/dashboard");
  redirect(
    `/simpanan/wajib?success=batch&created=${membersToCreate.length}&skipped=${skippedCount}&period=${data.period}`,
  );
}
