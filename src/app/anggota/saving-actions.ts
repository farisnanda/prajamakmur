"use server";

import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { logError } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export type VoluntarySavingsState = {
  message?: string;
  errors?: Record<string, string[]>;
};

const schema = z.object({
  amount: z.coerce
    .number()
    .positive("Nominal harus lebih dari nol.")
    .max(10_000_000_000, "Nominal terlalu besar."),
  transactionDate: z.coerce.date({ error: "Tanggal tidak valid." }),
  note: z.string().trim().max(200).optional(),
});

/**
 * Catat saldo simpanan sukarela yang sudah ada sebelum aplikasi dipakai
 * (migrasi dari Excel). Hanya menambah saldo simpanan anggota: tidak ada
 * kas masuk dan tidak ada jurnal, karena uangnya sudah diterima sebelumnya.
 */
export async function addVoluntarySavings(
  memberId: string,
  _state: VoluntarySavingsState,
  formData: FormData,
): Promise<VoluntarySavingsState> {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    !["SUPER_ADMIN", "ADMIN_KOPERASI", "BENDAHARA"].includes(session.user.role)
  )
    return { message: "Anda tidak memiliki akses untuk mencatat simpanan." };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { id: true, isActive: true },
  });
  if (!member?.isActive) return { message: "Anggota tidak ditemukan atau sudah nonaktif." };

  try {
    await prisma.savingsTransaction.create({
      data: {
        receiptNumber: `SLD-${Date.now()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
        memberId: member.id,
        savingsType: "SUKARELA",
        transactionType: "SETORAN",
        amount: new Prisma.Decimal(parsed.data.amount),
        periodKey: null,
        transactionDate: parsed.data.transactionDate,
        note: parsed.data.note || "Saldo awal simpanan sukarela (migrasi dari Excel)",
        createdById: session.user.id,
      },
    });
  } catch (error) {
    logError("add-savings", error, { memberId });
    return { message: "Simpanan belum dapat disimpan. Silakan coba lagi." };
  }

  revalidatePath(`/anggota/${member.id}`);
  revalidatePath("/simpanan");
  await audit({
    action: "SAVINGS_MIGRATE",
    entity: "Member",
    entityId: member.id,
    summary: `Mencatat saldo simpanan sukarela Rp${parsed.data.amount.toLocaleString("id-ID")} (migrasi)`,
  });
  revalidatePath("/simpanan/sukarela");
  redirect(`/anggota/${member.id}?tab=simpanan&success=voluntary`);
}

const mandatorySchema = z.object({
  fromMonth: z.string().regex(/^\d{4}-\d{2}$/, "Pilih bulan awal."),
  toMonth: z.string().regex(/^\d{4}-\d{2}$/, "Pilih bulan akhir."),
  amount: z.coerce
    .number()
    .positive("Nominal harus lebih dari nol.")
    .max(1_000_000_000, "Nominal terlalu besar."),
  note: z.string().trim().max(200).optional(),
});

const MAX_MONTHS = 120;

/**
 * Catat simpanan wajib bulanan yang sudah dibayar sebelum aplikasi dipakai
 * (migrasi dari Excel), satu setoran per bulan dari bulan awal sampai akhir.
 * Bulan yang sudah tercatat dilewati. Tidak ada kas dan jurnal yang dibuat.
 */
export async function addMandatorySavings(
  memberId: string,
  _state: VoluntarySavingsState,
  formData: FormData,
): Promise<VoluntarySavingsState> {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    !["SUPER_ADMIN", "ADMIN_KOPERASI", "BENDAHARA"].includes(session.user.role)
  )
    return { message: "Anda tidak memiliki akses untuk mencatat simpanan." };

  const parsed = mandatorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const { fromMonth, toMonth, amount, note } = parsed.data;

  const [fy, fm] = fromMonth.split("-").map(Number);
  const [ty, tm] = toMonth.split("-").map(Number);
  const total = (ty - fy) * 12 + (tm - fm) + 1;
  if (total < 1)
    return { errors: { toMonth: ["Bulan akhir tidak boleh sebelum bulan awal."] } };
  if (total > MAX_MONTHS)
    return { errors: { toMonth: [`Maksimal ${MAX_MONTHS} bulan sekali catat.`] } };

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { id: true, isActive: true },
  });
  if (!member?.isActive)
    return { message: "Anggota tidak ditemukan atau sudah nonaktif." };

  const stamp = Date.now();
  const rows = Array.from({ length: total }, (_, index) => {
    const date = new Date(fy, fm - 1 + index, 1);
    const periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return {
      receiptNumber: `WJB-${stamp}-${index}-${crypto.randomUUID().slice(0, 5).toUpperCase()}`,
      memberId: member.id,
      savingsType: "WAJIB" as const,
      transactionType: "SETORAN" as const,
      amount: new Prisma.Decimal(amount),
      periodKey,
      transactionDate: date,
      note: note || "Simpanan wajib sebelum migrasi (tanpa pencatatan kas)",
      createdById: session.user.id,
    };
  });

  let created = 0;
  try {
    const result = await prisma.savingsTransaction.createMany({
      data: rows,
      skipDuplicates: true,
    });
    created = result.count;
  } catch (error) {
    logError("add-savings", error, { memberId });
    return { message: "Simpanan belum dapat disimpan. Silakan coba lagi." };
  }

  revalidatePath(`/anggota/${member.id}`);
  revalidatePath("/simpanan");
  await audit({
    action: "SAVINGS_MIGRATE",
    entity: "Member",
    entityId: member.id,
    summary: `Mencatat simpanan wajib ${fromMonth} sampai ${toMonth} (${created} bulan baru, ${total - created} dilewati) @ Rp${amount.toLocaleString("id-ID")} (migrasi)`,
  });
  revalidatePath("/simpanan/wajib");
  redirect(
    `/anggota/${member.id}?tab=simpanan&success=mandatory&n=${created}&skip=${total - created}`,
  );
}
