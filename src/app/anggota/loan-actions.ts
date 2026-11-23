"use server";

import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { annuityPayment, annuitySchedule } from "@/lib/annuity";
import { authOptions } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { logError } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export type RunningLoanState = {
  message?: string;
  errors?: Record<string, string[]>;
};

const RATE = 10; // bunga tetap 10% per tahun, sama dengan aturan pinjaman

const schema = z.object({
  principalAmount: z.coerce.number().positive("Nominal harus lebih dari nol.").max(1_000_000_000),
  tenureMonths: z.coerce
    .number()
    .int()
    .min(1, "Tenor minimal 1 bulan.")
    .max(20, "Tenor maksimal 20 bulan."),
  startMonth: z.string().regex(/^\d{4}-\d{2}$/, "Pilih bulan mulai angsuran."),
  paidInstallments: z.coerce.number().int().min(0, "Tidak boleh negatif.").default(0),
  purpose: z.string().trim().max(200).optional(),
});

/**
 * Catat pinjaman yang sudah berjalan sebelum aplikasi dipakai (migrasi dari Excel).
 * Pinjaman langsung berstatus Berjalan. Tidak ada kas, jurnal, atau pendapatan yang
 * dibuat, karena uangnya sudah dicairkan dan angsurannya sudah diterima sebelumnya.
 * Angsuran yang sudah dibayar dicatat agar sisa pokok dan angsuran berikutnya benar.
 */
export async function addRunningLoan(
  memberId: string,
  _state: RunningLoanState,
  formData: FormData,
): Promise<RunningLoanState> {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    !["SUPER_ADMIN", "ADMIN_KOPERASI", "BENDAHARA"].includes(session.user.role)
  )
    return { message: "Anda tidak memiliki akses untuk menambah pinjaman." };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const data = parsed.data;
  if (data.paidInstallments > data.tenureMonths)
    return { errors: { paidInstallments: ["Tidak boleh lebih dari tenor."] } };

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { id: true, name: true, isActive: true },
  });
  if (!member?.isActive) return { message: "Anggota tidak ditemukan atau sudah nonaktif." };

  const [year, month] = data.startMonth.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const due = new Date(start);
  due.setMonth(due.getMonth() + data.tenureMonths);
  // Angsuran pertama jatuh tempo awal bulan berikutnya setelah pengajuan.
  const applied = new Date(year, month - 2, 15);
  const monthly = annuityPayment(data.principalAmount, RATE, data.tenureMonths);
  const schedule = annuitySchedule(
    data.principalAmount,
    RATE,
    data.tenureMonths,
    data.paidInstallments,
  );
  const loanNumber = `PJM-${Date.now()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
  const settled = data.paidInstallments >= data.tenureMonths;

  try {
    await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.create({
        data: {
          loanNumber,
          memberId: member.id,
          principalAmount: new Prisma.Decimal(data.principalAmount),
          interestRate: new Prisma.Decimal(RATE),
          tenureMonths: data.tenureMonths,
          monthlyPayment: new Prisma.Decimal(monthly),
          purpose: data.purpose || "Pinjaman berjalan (migrasi dari Excel)",
          applicationDate: applied,
          disbursedAt: applied,
          transferReference: "MIGRASI",
          startDate: start,
          dueDate: due,
          status: settled ? "LUNAS" : "ACTIVE",
          note: "Dicatat manual dari data Excel sebelum aplikasi dipakai.",
          createdById: session.user.id,
        },
      });
      if (schedule.length) {
        await tx.loanPayment.createMany({
          data: schedule.map((row) => {
            const paidAt = new Date(year, month - 1 + (row.number - 1), 1);
            return {
              receiptNumber: `MIG-${loanNumber}-${row.number}`,
              loanId: loan.id,
              amount: new Prisma.Decimal(row.amount),
              principalComponent: new Prisma.Decimal(row.principalComponent),
              interestComponent: new Prisma.Decimal(row.interestComponent),
              installmentNumber: row.number,
              paymentDate: paidAt,
              periodKey: `${paidAt.getFullYear()}-${String(paidAt.getMonth() + 1).padStart(2, "0")}`,
              note: "Angsuran sebelum migrasi (tanpa pencatatan kas)",
            };
          }),
        });
      }
    });
  } catch (error) {
    logError("add-running-loan", error, { memberId });
    return { message: "Pinjaman belum dapat disimpan. Silakan coba lagi." };
  }

  await audit({
    action: "LOAN_MIGRATE",
    entity: "Loan",
    entityId: loanNumber,
    summary: `Mencatat pinjaman berjalan ${loanNumber} untuk ${member.name}: Rp${data.principalAmount.toLocaleString("id-ID")}, ${data.tenureMonths} bulan, mulai ${data.startMonth}, ${data.paidInstallments} angsuran sudah dibayar`,
  });
  revalidatePath(`/anggota/${member.id}`);
  revalidatePath("/pinjaman");
  revalidatePath("/pinjaman/pembayaran");
  revalidatePath("/dashboard");
  redirect(`/anggota/${member.id}?tab=pinjaman&success=loan`);
}
