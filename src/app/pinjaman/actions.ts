"use server";

import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type LoanFormState = {
  message?: string;
  errors?: Record<string, string[]>;
};

const loanSchema = z.object({
  memberId: z.string().min(1, "Pilih anggota."),
  principalAmount: z.coerce.number().positive("Nominal harus lebih dari nol."),
  interestRate: z.coerce
    .number()
    .refine((value) => value === 10, "Bunga pinjaman wajib 10% per tahun."),
  tenureMonths: z.coerce
    .number()
    .int()
    .min(1, "Tenor minimal 1 bulan.")
    .max(20, "Tenor maksimal 20 bulan."),
  purpose: z.string().trim().min(3, "Tujuan pinjaman minimal 3 karakter."),
  applicationDate: z.coerce.date(),
  note: z.string().trim().optional(),
});

async function requireLoanAccess() {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    !["SUPER_ADMIN", "ADMIN_KOPERASI", "BENDAHARA"].includes(session.user.role)
  ) {
    throw new Error("Anda tidak memiliki akses untuk mengelola pinjaman.");
  }
  return session;
}

function maximumFor(status: "PNS" | "PPPK" | "PPPK_PARUH_WAKTU") {
  return status === "PNS" ? 50_000_000 : 40_000_000;
}

export async function createMemberLoanApplication(
  _state: LoanFormState,
  formData: FormData,
): Promise<LoanFormState> {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ANGGOTA")
    return { message: "Akses anggota diperlukan." };
  const parsed = loanSchema
    .omit({ memberId: true, applicationDate: true })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const member = await prisma.member.findFirst({
    where: { user: { id: session.user.id }, isActive: true },
  });
  if (!member) return { message: "Akun belum terhubung ke anggota aktif." };
  const active = await prisma.loan.aggregate({
    where: { memberId: member.id, status: "ACTIVE" },
    _sum: { principalAmount: true },
  });
  const remaining =
    maximumFor(member.employmentStatus) -
    (active._sum.principalAmount?.toNumber() ?? 0);
  if (parsed.data.principalAmount > remaining)
    return {
      message: `Nominal melebihi sisa limit Rp${remaining.toLocaleString("id-ID")}.`,
    };
  const pending = await prisma.loan.count({
    where: {
      memberId: member.id,
      status: {
        in: ["SUBMITTED", "SALARY_TREASURER_APPROVED", "FINAL_APPROVED"],
      },
    },
  });
  if (pending) return { message: "Masih ada pengajuan yang sedang diproses." };
  await prisma.loan.create({
    data: {
      ...parsed.data,
      principalAmount: new Prisma.Decimal(parsed.data.principalAmount),
      interestRate: new Prisma.Decimal(10),
      loanNumber: `PJM-${Date.now()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`,
      memberId: member.id,
      applicationDate: new Date(),
      note: parsed.data.note || null,
      createdById: session.user.id,
    },
  });
  revalidatePath("/dashboard");
  revalidatePath("/pengajuan-pinjaman");
  revalidatePath("/pinjaman");
  redirect("/pengajuan-pinjaman?success=submitted");
}

async function workflowLoan(
  formData: FormData,
  role: string | string[],
  expected: "SUBMITTED" | "SALARY_TREASURER_APPROVED" | "FINAL_APPROVED",
) {
  const session = await getServerSession(authOptions);
  const roles = Array.isArray(role) ? role : [role];
  if (!session || !roles.includes(session.user.role))
    throw new Error("Anda tidak memiliki akses untuk tahap ini.");
  const loanId = z.string().min(1).parse(formData.get("loanId"));
  const loan = await prisma.loan.findUnique({ where: { id: loanId } });
  if (!loan || loan.status !== expected) redirect("/pinjaman?error=invalid");
  return { loan, loanId };
}

export async function approveBySalaryTreasurer(formData: FormData) {
  const { loanId } = await workflowLoan(formData, "BENDAHARA", "SUBMITTED");
  await prisma.loan.update({
    where: { id: loanId },
    data: {
      status: "SALARY_TREASURER_APPROVED",
      salaryTreasurerApprovedAt: new Date(),
    },
  });
  revalidatePath("/pinjaman");
  redirect("/pinjaman?success=salary-approved");
}
export async function approveByChairman(formData: FormData) {
  const { loan, loanId } = await workflowLoan(
    formData,
    "KETUA_KOPERASI",
    "SALARY_TREASURER_APPROVED",
  );
  const [cash, reserved] = await Promise.all([
    prisma.cashAccount.findUnique({
      where: { code: "KAS_UMUM" },
      select: { balance: true },
    }),
    prisma.loan.aggregate({
      where: { status: "FINAL_APPROVED" },
      _sum: { principalAmount: true },
    }),
  ]);
  const available =
    (cash?.balance.toNumber() ?? 0) -
    (reserved._sum.principalAmount?.toNumber() ?? 0);
  if (loan.principalAmount.toNumber() > available)
    redirect(
      `/pinjaman?error=insufficient-cash&required=${loan.principalAmount.toString()}&available=${Math.max(0, available)}`,
    );
  await prisma.loan.update({
    where: { id: loanId },
    data: {
      status: "FINAL_APPROVED",
      finalApprovedAt: new Date(),
      approvedAt: new Date(),
    },
  });
  revalidatePath("/pinjaman");
  redirect("/pinjaman?success=final-approved");
}
export async function rejectBySalaryTreasurer(formData: FormData) {
  await rejectLoan(formData, "BENDAHARA", "SUBMITTED");
}
export async function rejectByChairman(formData: FormData) {
  await rejectLoan(formData, "KETUA_KOPERASI", "SALARY_TREASURER_APPROVED");
}
async function rejectLoan(
  formData: FormData,
  role: "BENDAHARA" | "KETUA_KOPERASI",
  expected: "SUBMITTED" | "SALARY_TREASURER_APPROVED",
) {
  const { loanId } = await workflowLoan(formData, role, expected);
  const rejectionNote = z
    .string()
    .trim()
    .min(5)
    .parse(formData.get("rejectionNote"));
  await prisma.loan.update({
    where: { id: loanId },
    data: { status: "REJECTED", rejectionNote, rejectedAt: new Date() },
  });
  revalidatePath("/pinjaman");
  revalidatePath("/pengajuan-pinjaman");
  redirect("/pinjaman?success=rejected");
}
export async function disburseLoan(formData: FormData) {
  const { loan, loanId } = await workflowLoan(
    formData,
    ["ADMIN_KOPERASI", "SUPER_ADMIN"],
    "FINAL_APPROVED",
  );
  const referenceResult = z
    .string()
    .trim()
    .min(3)
    .safeParse(formData.get("transferReference"));
  if (!referenceResult.success) redirect("/pinjaman?error=invalid-reference");
  const reference = referenceResult.data;
  const principal = loan.principalAmount.toNumber(),
    rate = loan.interestRate.toNumber() / 100 / 12;
  const payment = Math.ceil(
    rate === 0
      ? principal / loan.tenureMonths
      : (principal * rate * (1 + rate) ** loan.tenureMonths) /
          ((1 + rate) ** loan.tenureMonths - 1),
  );
  const disbursedNow = new Date();
  // Angsuran pertama jatuh tempo di awal bulan berikutnya setelah pengajuan
  // diajukan (bukan tanggal pencairan), karena potongan gaji tidak selalu
  // cair di tanggal yang sama setiap bulan.
  const start = new Date(
    loan.applicationDate.getFullYear(),
    loan.applicationDate.getMonth() + 1,
    1,
  );
  const due = new Date(start);
  due.setMonth(due.getMonth() + loan.tenureMonths);
  const cashBefore = await prisma.cashAccount.findUnique({
    where: { code: "KAS_UMUM" },
    select: { balance: true },
  });
  if (!cashBefore || cashBefore.balance.toNumber() < principal)
    redirect(
      `/pinjaman?error=insufficient-cash&required=${principal}&available=${cashBefore?.balance.toString() ?? 0}`,
    );
  await prisma.$transaction(async (tx) => {
    const cash = await tx.cashAccount.findUnique({
      where: { code: "KAS_UMUM" },
    });
    if (!cash || cash.balance.toNumber() < principal)
      throw new Error(
        "Saldo Kas Umum tidak mencukupi untuk pencairan pinjaman.",
      );
    await tx.loan.update({
      where: { id: loanId },
      data: {
        status: "ACTIVE",
        disbursedAt: disbursedNow,
        transferReference: reference,
        startDate: start,
        dueDate: due,
        monthlyPayment: new Prisma.Decimal(payment),
      },
    });
    await tx.cashAccount.update({
      where: { id: cash.id },
      data: { balance: { decrement: principal } },
    });
    await tx.cashTransaction.create({
      data: {
        reference: `KAS-PENCAIRAN-${loan.loanNumber}`,
        accountId: cash.id,
        type: "OUTFLOW",
        amount: loan.principalAmount,
        transactionDate: disbursedNow,
        description: `Pencairan pinjaman ${loan.loanNumber}`,
        note: `Transfer ${reference}`,
      },
    });
    await tx.bookkeepingEntry.create({
      data: {
        reference: `BK-PENCAIRAN-${loan.loanNumber}`,
        transactionDate: disbursedNow,
        description: `Pencairan pinjaman ${loan.loanNumber}`,
        debitAccount: "Piutang Pinjaman Anggota",
        creditAccount: cash.name,
        amount: loan.principalAmount,
      },
    });
  });
  revalidatePath("/pinjaman");
  revalidatePath("/dashboard");
  revalidatePath("/akuntansi/hasil-usaha");
  redirect("/pinjaman?success=disbursed");
}

export async function createLoanApplication(
  _state: LoanFormState,
  formData: FormData,
): Promise<LoanFormState> {
  const session = await requireLoanAccess();
  const parsed = loanSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const data = parsed.data;

  const member = await prisma.member.findUnique({
    where: { id: data.memberId },
    select: { isActive: true, employmentStatus: true },
  });
  if (!member?.isActive)
    return { message: "Anggota tidak ditemukan atau sudah nonaktif." };
  const maximumAmount =
    member.employmentStatus === "PNS" ? 50_000_000 : 40_000_000;
  if (data.principalAmount > maximumAmount) {
    return {
      message: `Maksimal pinjaman untuk ${member.employmentStatus === "PNS" ? "PNS" : "PPPK/PPPK Paruh Waktu"} adalah Rp${maximumAmount.toLocaleString("id-ID")}.`,
    };
  }

  await prisma.loan.create({
    data: {
      loanNumber: `PJM-${Date.now()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`,
      memberId: data.memberId,
      principalAmount: new Prisma.Decimal(data.principalAmount),
      interestRate: new Prisma.Decimal(10),
      tenureMonths: data.tenureMonths,
      purpose: data.purpose,
      applicationDate: data.applicationDate,
      note: data.note || null,
      createdById: session.user.id,
    },
  });

  revalidatePath("/pinjaman");
  redirect("/pinjaman?success=submitted");
}

export async function approveLoan(formData: FormData) {
  await requireLoanAccess();
  const loanId = z.string().min(1).parse(formData.get("loanId"));
  const loan = await prisma.loan.findUnique({ where: { id: loanId } });
  if (!loan || loan.status !== "SUBMITTED") redirect("/pinjaman?error=invalid");

  const principal = loan.principalAmount.toNumber();
  const monthlyRate = loan.interestRate.toNumber() / 100 / 12;
  const monthlyPayment =
    monthlyRate === 0
      ? Math.ceil(principal / loan.tenureMonths)
      : Math.ceil(
          (principal * monthlyRate * (1 + monthlyRate) ** loan.tenureMonths) /
            ((1 + monthlyRate) ** loan.tenureMonths - 1),
        );
  const startDate = new Date();
  const dueDate = new Date(startDate);
  dueDate.setMonth(dueDate.getMonth() + loan.tenureMonths);

  await prisma.loan.update({
    where: { id: loanId },
    data: {
      status: "ACTIVE",
      approvedAt: new Date(),
      startDate,
      dueDate,
      monthlyPayment: new Prisma.Decimal(monthlyPayment),
    },
  });

  revalidatePath("/pinjaman");
  redirect("/pinjaman?success=approved");
}
