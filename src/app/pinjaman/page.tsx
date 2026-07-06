import {
  BadgeCheck,
  Banknote,
  CalendarClock,
  Clock3,
  Landmark,
} from "lucide-react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import {
  approveByChairman,
  approveBySalaryTreasurer,
  disburseLoan,
  rejectByChairman,
  rejectBySalaryTreasurer,
} from "@/app/pinjaman/actions";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
const date = (value: Date) =>
  new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(value);

export default async function LoansPage({
  searchParams,
}: {
  searchParams: Promise<{
    success?: string;
    error?: string;
    required?: string;
    available?: string;
  }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role === "ANGGOTA") redirect("/dashboard");
  const query = await searchParams;
  const queueStatus =
    session.user.role === "BENDAHARA"
      ? "SUBMITTED"
      : session.user.role === "KETUA_KOPERASI"
        ? "SALARY_TREASURER_APPROVED"
        : "FINAL_APPROVED";
  const queueTitle =
    session.user.role === "BENDAHARA"
      ? "Persetujuan Bendahara Gaji"
      : session.user.role === "KETUA_KOPERASI"
        ? "Persetujuan Akhir Ketua"
        : "Siap Ditransfer Admin";
  const queueAction =
    session.user.role === "BENDAHARA"
      ? approveBySalaryTreasurer
      : session.user.role === "KETUA_KOPERASI"
        ? approveByChairman
        : disburseLoan;
  const buttonLabel =
    session.user.role === "BENDAHARA"
      ? "Approve Tahap 1"
      : session.user.role === "KETUA_KOPERASI"
        ? "Approve Akhir"
        : "Catat Transfer";
  const requireReference = ["ADMIN_KOPERASI", "SUPER_ADMIN"].includes(
    session.user.role,
  );
  const rejectAction =
    session.user.role === "BENDAHARA"
      ? rejectBySalaryTreasurer
      : session.user.role === "KETUA_KOPERASI"
        ? rejectByChairman
        : undefined;
  const [queue, active, cash, reserved] = await Promise.all([
    prisma.loan.findMany({
      where: { status: queueStatus },
      include: { member: { select: { name: true, memberNumber: true } } },
      orderBy: { applicationDate: "desc" },
    }),
    prisma.loan.findMany({
      where: { status: "ACTIVE" },
      include: { member: { select: { name: true, memberNumber: true } } },
      orderBy: { startDate: "desc" },
    }),
    prisma.cashAccount.findUnique({
      where: { code: "KAS_UMUM" },
      select: { balance: true },
    }),
    prisma.loan.aggregate({
      where: { status: "FINAL_APPROVED" },
      _sum: { principalAmount: true },
    }),
  ]);
  return (
    <>
      <AppSidebar />
      <Topbar
        user={session.user}
        title="Pinjaman"
        subtitle="Approval berjenjang dan pencairan pinjaman anggota"
      />
      <main className="ml-[280px] min-h-screen bg-slate-50 px-8 pb-10 pt-32">
        {query.success && (
          <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
            Tahap pinjaman berhasil diproses.
          </div>
        )}
        {query.error && (
          <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {query.error === "insufficient-cash"
              ? `Kas Umum tidak mencukupi. Dana tersedia ${rupiah(Number(query.available ?? 0))}, sedangkan pengajuan membutuhkan ${rupiah(Number(query.required ?? 0))}.`
              : "Pengajuan tidak ditemukan atau sudah diproses."}
          </div>
        )}
        <section className="grid grid-cols-3 gap-5">
          <Summary
            label="Antrean Tahap Anda"
            value={`${queue.length} pengajuan`}
            icon={Clock3}
            tone="amber"
          />
          <Summary
            label="Pinjaman Berjalan"
            value={`${active.length} pinjaman`}
            icon={BadgeCheck}
            tone="emerald"
          />
          <Summary
            label="Kas Tersedia untuk Pinjaman"
            value={rupiah(
              Math.max(
                0,
                (cash?.balance.toNumber() ?? 0) -
                  (reserved._sum.principalAmount?.toNumber() ?? 0),
              ),
            )}
            icon={Banknote}
            tone="blue"
          />
        </section>
        <section className="mt-6 space-y-6">
          <LoanList
            title={queueTitle}
            loans={queue}
            action={queueAction}
            rejectAction={rejectAction}
            buttonLabel={buttonLabel}
            requireReference={requireReference}
          />
          <LoanList title="Pinjaman Berjalan" loans={active} />
        </section>
      </main>
    </>
  );
}

type LoanRow = Awaited<
  ReturnType<
    typeof prisma.loan.findMany<{
      include: { member: { select: { name: true; memberNumber: true } } };
    }>
  >
>[number];
function LoanList({
  title,
  loans,
  action,
  rejectAction,
  buttonLabel,
  requireReference = false,
}: {
  title: string;
  loans: LoanRow[];
  action?: (formData: FormData) => Promise<void>;
  rejectAction?: (formData: FormData) => Promise<void>;
  buttonLabel?: string;
  requireReference?: boolean;
}) {
  const pending = Boolean(action);
  return (
    <div className="rounded-[28px] border border-slate-100 bg-white p-7 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-500">
        {pending
          ? "Pengajuan yang menunggu tindakan Anda"
          : "Pinjaman yang telah dicairkan"}
      </p>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase text-slate-400">
              <th className="py-4">Anggota</th>
              <th>Pinjaman</th>
              <th>Tenor</th>
              <th>{pending ? "Diajukan" : "Angsuran"}</th>
              <th className="text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loans.map((loan) => (
              <tr key={loan.id} className="border-b border-slate-50 align-top">
                <td className="py-4">
                  <p className="font-bold text-slate-900">{loan.member.name}</p>
                  <p className="text-xs text-slate-400">
                    {loan.member.memberNumber} · {loan.loanNumber}
                  </p>
                </td>
                <td className="py-4">
                  <p className="font-bold text-slate-800">
                    {rupiah(loan.principalAmount.toNumber())}
                  </p>
                  <p className="text-xs text-slate-400">{loan.purpose}</p>
                </td>
                <td className="py-4">
                  <p className="font-semibold">{loan.tenureMonths} bulan</p>
                  <p className="text-xs text-slate-400">
                    {loan.interestRate.toNumber()}%/tahun
                  </p>
                </td>
                <td className="py-4">
                  {pending ? (
                    date(loan.applicationDate)
                  ) : (
                    <p className="font-bold text-blue-700">
                      {rupiah(loan.monthlyPayment?.toNumber() ?? 0)}
                      <span className="block text-xs font-normal text-slate-400">
                        per bulan
                      </span>
                    </p>
                  )}
                </td>
                <td className="py-4 text-right">
                  {action ? (
                    <div className="space-y-2">
                      <form
                        data-financial-transaction
                        action={action}
                        className="flex justify-end gap-2"
                      >
                        <input type="hidden" name="loanId" value={loan.id} />
                        {requireReference && (
                          <input
                            name="transferReference"
                            required
                            className="h-9 w-40 rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                            placeholder="No. referensi transfer"
                          />
                        )}
                        <button className="inline-flex h-9 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white">
                          <BadgeCheck size={15} />
                          {buttonLabel}
                        </button>
                      </form>
                      {rejectAction && (
                        <form
                          data-financial-transaction
                          action={rejectAction}
                          className="flex justify-end gap-2"
                        >
                          <input type="hidden" name="loanId" value={loan.id} />
                          <input
                            name="rejectionNote"
                            required
                            minLength={5}
                            className="h-9 w-56 rounded-lg border border-red-200 px-3 text-xs text-slate-900"
                            placeholder="Alasan penolakan wajib"
                          />
                          <button className="h-9 rounded-xl bg-red-600 px-4 text-xs font-bold text-white">
                            Tolak
                          </button>
                        </form>
                      )}
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
                      <CalendarClock size={15} />
                      {loan.dueDate ? date(loan.dueDate) : "-"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {!loans.length && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  Belum ada data pada tahap ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function Summary({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Landmark;
  tone: "amber" | "emerald" | "blue";
}) {
  const colors = {
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
  };
  return (
    <div className="rounded-[24px] border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${colors[tone]}`}
        >
          <Icon size={23} />
        </div>
      </div>
    </div>
  );
}
