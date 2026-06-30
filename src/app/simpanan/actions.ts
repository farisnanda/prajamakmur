"use server";

import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type SavingsFormState = { message?: string; errors?: Record<string, string[]> };
export type BulkMandatorySavingsState = { message?: string; errors?: Record<string, string[]> };

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
  if (!session || !["SUPER_ADMIN", "ADMIN_KOPERASI", "BENDAHARA"].includes(session.user.role)) {
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
    return { message: "Penarikan hanya diperbolehkan untuk Simpanan Sukarela." };
  }

  const [setting, member] = await Promise.all([
    prisma.savingsSetting.findUnique({ where: { id: "default" } }),
    prisma.member.findUnique({
      where: { id: data.memberId },
      select: { employmentStatus: true, isActive: true },
    }),
  ]);
  if (!setting) return { message: "Pengaturan nominal simpanan belum tersedia." };
  if (!member?.isActive) return { message: "Anggota tidak ditemukan atau sudah nonaktif." };

  if (data.savingsType === "POKOK" && data.amount !== setting.principalAmount.toNumber()) {
    return { message: `Simpanan Pokok harus sebesar Rp${setting.principalAmount.toNumber().toLocaleString("id-ID")}.` };
  }
  const mandatoryAmount = member.employmentStatus === "PNS"
    ? setting.mandatoryPnsAmount?.toNumber() ?? 300000
    : setting.mandatoryPppkAmount?.toNumber() ?? 200000;
  if (data.savingsType === "WAJIB" && data.amount !== mandatoryAmount) {
    return { message: `Simpanan Wajib anggota ini harus sebesar Rp${mandatoryAmount.toLocaleString("id-ID")}.` };
  }

  const periodKey = data.savingsType === "POKOK"
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
    const deposits = totals.find((item) => item.transactionType === "SETORAN")?._sum.amount?.toNumber() ?? 0;
    const withdrawals = totals.find((item) => item.transactionType === "PENARIKAN")?._sum.amount?.toNumber() ?? 0;
    if (data.amount > deposits - withdrawals) return { message: "Saldo Simpanan Sukarela tidak mencukupi." };
  }

  try {
    await prisma.savingsTransaction.create({
      data: {
        receiptNumber: `TRX-${Date.now()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
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
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { message: data.savingsType === "POKOK" ? "Simpanan Pokok anggota ini sudah dibayar." : "Simpanan Wajib untuk periode tersebut sudah dibayar." };
    }
    return { message: "Transaksi belum dapat disimpan." };
  }

  revalidatePath("/simpanan");
  redirect("/simpanan?success=created");
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

  if (!setting) return { message: "Pengaturan nominal simpanan belum tersedia." };
  if (!members.length) return { message: "Tidak ada anggota aktif yang dipilih." };

  const existingMemberIds = new Set(existingTransactions.map((item) => item.memberId));
  const membersToCreate = members.filter((member) => !existingMemberIds.has(member.id));

  if (!membersToCreate.length) {
    return { message: "Semua anggota terpilih sudah tercatat untuk periode ini." };
  }

  await prisma.savingsTransaction.createMany({
    data: membersToCreate.map((member, index) => ({
      receiptNumber: `TRX-${Date.now()}-${index}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
      memberId: member.id,
      savingsType: "WAJIB",
      transactionType: "SETORAN",
      amount: new Prisma.Decimal(
        member.employmentStatus === "PNS"
          ? setting.mandatoryPnsAmount?.toNumber() ?? 300000
          : setting.mandatoryPppkAmount?.toNumber() ?? 200000,
      ),
      periodKey: data.period,
      transactionDate: data.transactionDate,
      note: data.note || null,
      createdById: session.user.id,
    })),
  });

  const skippedCount = members.length - membersToCreate.length;

  revalidatePath("/simpanan");
  redirect(`/simpanan?success=batch&created=${membersToCreate.length}&skipped=${skippedCount}&period=${data.period}`);
}
