import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

/** Nama aksi yang tercatat, dan label untuk layar Jejak Audit. */
export const AUDIT_ACTIONS = {
  ACCOUNT_CREATE: "Buat akun",
  ACCOUNT_UPDATE: "Ubah akun / role",
  PASSWORD_RESET: "Reset password",
  PASSWORD_CHANGE: "Ganti password sendiri",
  MEMBER_CREATE: "Tambah anggota",
  MEMBER_UPDATE: "Ubah anggota",
  MEMBER_IMPORT: "Impor anggota",
  PRINCIPAL_FILL: "Isi simpanan pokok anggota aktif",
  SAVINGS_RECORD: "Catat simpanan",
  SAVINGS_MIGRATE: "Catat simpanan lama (migrasi)",
  LOAN_MIGRATE: "Catat pinjaman berjalan (migrasi)",
  LOAN_APPROVE: "Persetujuan pinjaman",
  LOAN_REJECT: "Tolak pinjaman",
  LOAN_DISBURSE: "Pencairan pinjaman",
  LOAN_PAYMENT: "Catat angsuran",
  LOAN_REBALANCE: "Hitung ulang bunga dan pokok",
  WITHDRAWAL_TRANSFER: "Transfer penarikan sukarela",
  ACCOUNTING_ENTRY: "Catat kas atau belanja",
  SETTINGS_SAVINGS: "Ubah nominal simpanan",
  SETTINGS_LANDING: "Ubah konten landing",
  NEWS_CHANGE: "Berita",
} as const;

export type AuditAction = keyof typeof AUDIT_ACTIONS;

export type AuditEntry = {
  action: AuditAction;
  summary: string;
  entity?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
};

/**
 * Catat satu aksi oleh pengguna yang sedang masuk. Tidak pernah membuat aksi
 * utama gagal: kalau pencatatan gagal, errornya hanya masuk log.
 */
export async function audit(entry: AuditEntry) {
  try {
    const session = await getServerSession(authOptions);
    await prisma.auditLog.create({
      data: {
        actorId: session?.user.id ?? null,
        actorName: session?.user.name ?? "Tidak dikenal",
        actorRole: session?.user.role ?? "-",
        action: entry.action,
        entity: entry.entity ?? null,
        entityId: entry.entityId ?? null,
        summary: entry.summary,
        metadata: entry.metadata,
      },
    });
  } catch (error) {
    logError("audit", error, { action: entry.action });
  }
}
