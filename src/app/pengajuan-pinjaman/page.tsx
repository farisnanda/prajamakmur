import { Check, Circle, Clock3, FileCheck2 } from "lucide-react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MemberLoanApplicationForm } from "@/components/loans/MemberLoanApplicationForm";
import { LoanSimulator } from "@/components/loans/LoanSimulator";
import { LoanStatusBadge } from "@/components/loans/LoanStatusBadge";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
const statusInfo = {
  SUBMITTED: { label: "Menunggu Bendahara Gaji", activeStep: 0 },
  SALARY_TREASURER_APPROVED: {
    label: "Menunggu Ketua Koperasi",
    activeStep: 1,
  },
  FINAL_APPROVED: { label: "Menunggu Transfer Admin", activeStep: 2 },
  ACTIVE: { label: "Sudah Dicairkan", activeStep: 3 },
  REJECTED: { label: "Ditolak", activeStep: 0 },
  LUNAS: { label: "Lunas", activeStep: 3 },
} as const;
const steps = [
  "Bendahara Gaji",
  "Ketua Koperasi",
  "Transfer Admin",
  "Pinjaman Berjalan",
];

export default async function MemberLoanApplicationPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "ANGGOTA") redirect("/pinjaman");
  const query = await searchParams;
  const member = await prisma.member.findFirst({
    where: { user: { id: session.user.id }, isActive: true },
    include: {
      loans: {
        include: { payments: { orderBy: { paymentDate: "desc" } } },
        orderBy: { applicationDate: "desc" },
      },
    },
  });
  if (!member) redirect("/dashboard");
  const activeTotal = member.loans
    .filter((loan) => loan.status === "ACTIVE")
    .reduce((sum, loan) => sum + loan.principalAmount.toNumber(), 0);
  const limit = member.employmentStatus === "PNS" ? 50_000_000 : 40_000_000;
  const remainingLimit = Math.max(0, limit - activeTotal);
  const pending = member.loans.find((loan) =>
    ["SUBMITTED", "SALARY_TREASURER_APPROVED", "FINAL_APPROVED"].includes(
      loan.status,
    ),
  );

  return (
    <>
      <AppSidebar />
      <Topbar
        user={session.user}
        title="Pengajuan Pinjaman"
        subtitle="Ajukan dan pantau proses persetujuan pinjaman Anda"
      />
      <main className="min-h-screen bg-slate-50 px-4 pb-12 pt-24 sm:px-6 lg:ml-[280px] lg:px-10 lg:pt-28">
        {query.success && (
          <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
            Pengajuan berhasil dikirim ke Bendahara Gaji.
          </div>
        )}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Stat label="Plafon Anda" value={rupiah(limit)} />
          <Stat label="Pinjaman Berjalan" value={rupiah(activeTotal)} />
          <Stat label="Sisa Limit" value={rupiah(remainingLimit)} highlight />
        </section>

        <LoanSimulator />

        {pending && (
          <section className="mt-6 rounded-card border border-blue-100 bg-white p-7 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-blue-700">
                  <Clock3 size={20} />
                  <h3 className="text-lg font-bold">
                    Posisi Pengajuan Saat Ini
                  </h3>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {pending.loanNumber} ·{" "}
                  {rupiah(pending.principalAmount.toNumber())} ·{" "}
                  {pending.tenureMonths} bulan
                </p>
              </div>
              <span className="rounded-full bg-amber-100 px-4 py-2 text-xs font-bold text-amber-700">
                {statusInfo[pending.status].label}
              </span>
            </div>
            <Progress activeStep={statusInfo[pending.status].activeStep} />
            <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm">
              <p className="font-bold text-slate-800">{pending.purpose}</p>
              <p className="mt-1 text-slate-500">
                Diajukan{" "}
                {new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(
                  pending.applicationDate,
                )}{" "}
                · Bunga anuitas 10%
              </p>
            </div>
          </section>
        )}

        {!pending && (
          <section className="mt-6 rounded-card border border-slate-200/70 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <FileCheck2 size={23} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
                  Ajukan Pinjaman Baru
                </h3>
                <p className="text-sm text-slate-500">
                  Bunga tetap 10% per tahun, tenor maksimal 20 bulan.
                </p>
              </div>
            </div>
            <MemberLoanApplicationForm remainingLimit={remainingLimit} />
          </section>
        )}

        <section className="mt-6 rounded-card border border-slate-200/70 bg-white p-5 shadow-sm sm:p-7">
          <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
            Kewajiban Pinjaman Saya
          </h3>
          <p className="text-sm text-slate-500">
            Rincian total kewajiban, pembayaran, dan saldo yang belum dibayar
          </p>
          <div className="mt-5 space-y-4">
            {member.loans
              .filter((loan) => loan.status === "ACTIVE")
              .map((loan) => {
                const totalObligation =
                  (loan.monthlyPayment?.toNumber() ?? 0) * loan.tenureMonths;
                const paid = loan.payments.reduce(
                  (sum, payment) => sum + payment.amount.toNumber(),
                  0,
                );
                const outstanding = Math.max(0, totalObligation - paid);
                const progress = totalObligation
                  ? Math.min(100, (paid / totalObligation) * 100)
                  : 0;
                return (
                  <div
                    key={loan.id}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-slate-900">
                          {loan.loanNumber}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Pokok {rupiah(loan.principalAmount.toNumber())} ·
                          Angsuran{" "}
                          {rupiah(loan.monthlyPayment?.toNumber() ?? 0)}/bulan
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                        Berjalan
                      </span>
                    </div>
                    <div className="mt-5 grid gap-4 sm:grid-cols-3">
                      <Obligation
                        label="Total Kewajiban"
                        value={rupiah(totalObligation)}
                      />
                      <Obligation
                        label="Sudah Dibayar"
                        value={rupiah(paid)}
                        positive
                      />
                      <Obligation
                        label="Belum Dibayar"
                        value={rupiah(outstanding)}
                        warning
                      />
                    </div>
                    <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="mt-2 flex justify-between text-xs font-semibold text-slate-500">
                      <span>{loan.payments.length} pembayaran tercatat</span>
                      <span>{progress.toFixed(0)}% lunas</span>
                    </div>
                  </div>
                );
              })}
            {!member.loans.some((loan) => loan.status === "ACTIVE") && (
              <div className="py-10 text-center text-sm text-slate-400">
                Belum ada pinjaman berjalan.
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-card border border-slate-200/70 bg-white p-5 shadow-sm sm:p-7">
          <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
            Riwayat Pengajuan
          </h3>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase text-slate-400">
                  <th className="py-4">Nomor</th>
                  <th>Nominal</th>
                  <th>Tenor</th>
                  <th>Status</th>
                  <th>Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {member.loans.map((loan) => (
                  <tr key={loan.id} className="border-b border-slate-50">
                    <td className="py-4 font-bold text-slate-800">
                      {loan.loanNumber}
                    </td>
                    <td>{rupiah(loan.principalAmount.toNumber())}</td>
                    <td>{loan.tenureMonths} bulan</td>
                    <td>
                      <LoanStatusBadge
                        status={loan.status}
                        label={statusInfo[loan.status].label}
                        loanNumber={loan.loanNumber}
                        rejectionNote={loan.rejectionNote}
                      />
                    </td>
                    <td>
                      {new Intl.DateTimeFormat("id-ID", {
                        dateStyle: "medium",
                      }).format(loan.applicationDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}

function Progress({ activeStep }: { activeStep: number }) {
  return (
    <div className="mt-8 grid grid-cols-4">
      <div className="col-span-4 mb-[-22px] mx-[12.5%] h-1 bg-slate-200">
        <div
          className="h-full bg-blue-600 transition-all"
          style={{ width: `${(activeStep / 3) * 100}%` }}
        />
      </div>
      {steps.map((step, index) => {
        const done = index <= activeStep;
        return (
          <div
            key={step}
            className="relative flex flex-col items-center text-center"
          >
            <div
              className={`z-[1] flex h-11 w-11 items-center justify-center rounded-full border-4 border-white ${done ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-400"}`}
            >
              {index < activeStep ? <Check size={19} /> : <Circle size={15} />}
            </div>
            <p
              className={`mt-2 text-xs font-bold ${done ? "text-blue-700" : "text-slate-400"}`}
            >
              {step}
            </p>
          </div>
        );
      })}
    </div>
  );
}
function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-card border p-6 shadow-sm ${highlight ? "border-blue-600 bg-blue-600 text-white" : "border-slate-100 bg-white"}`}
    >
      <p
        className={`text-sm font-medium ${highlight ? "text-blue-100" : "text-slate-500"}`}
      >
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
function Obligation({
  label,
  value,
  positive = false,
  warning = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 ${positive ? "bg-emerald-50" : warning ? "bg-amber-50" : "bg-slate-50"}`}
    >
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p
        className={`mt-1 text-lg font-bold ${positive ? "text-emerald-700" : warning ? "text-amber-700" : "text-slate-900"}`}
      >
        {value}
      </p>
    </div>
  );
}
