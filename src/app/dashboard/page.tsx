import {
  ArrowDownLeft,
  BadgeCheck,
  CircleDollarSign,
  CreditCard,
  Landmark,
  Wallet,
} from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";

const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
const savingsLabels = {
  POKOK: "Simpanan Pokok",
  WAJIB: "Simpanan Wajib",
  SUKARELA: "Simpanan Sukarela",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  if (session.user.role === "ANGGOTA") {
    const query = await searchParams;
    const bulanFilter = /^\d{4}-\d{2}$/.test(query.bulan ?? "")
      ? query.bulan!
      : "";
    const member = await prisma.member.findFirst({
      where: { user: { id: session.user.id } },
      include: {
        savings: { orderBy: { transactionDate: "desc" }, take: 8 },
        loans: {
          where: {
            status: {
              in: [
                "SUBMITTED",
                "SALARY_TREASURER_APPROVED",
                "FINAL_APPROVED",
                "ACTIVE",
                "LUNAS",
              ],
            },
          },
          include: {
            payments: {
              select: {
                id: true,
                receiptNumber: true,
                amount: true,
                principalComponent: true,
                interestComponent: true,
                installmentNumber: true,
                paymentDate: true,
              },
            },
          },
          orderBy: { applicationDate: "desc" },
        },
      },
    });
    return (
      <MemberDashboard
        user={session.user}
        member={member}
        bulanFilter={bulanFilter}
      />
    );
  }

  return <AdminDashboard user={session.user} />;
}

type MemberDashboardData = NonNullable<
  Awaited<
    ReturnType<
      typeof prisma.member.findFirst<{
        include: {
          savings: { orderBy: { transactionDate: "desc" }; take: 8 };
          loans: {
            where: { status: { in: ("SUBMITTED" | "ACTIVE")[] } };
            include: {
              payments: {
                select: {
                  id: true;
                  receiptNumber: true;
                  amount: true;
                  principalComponent: true;
                  interestComponent: true;
                  installmentNumber: true;
                  paymentDate: true;
                };
              };
            };
            orderBy: { applicationDate: "desc" };
          };
        };
      }>
    >
  >
>;

function MemberDashboard({
  user,
  member,
  bulanFilter,
}: {
  user: Parameters<typeof Topbar>[0]["user"];
  member: MemberDashboardData | null;
  bulanFilter: string;
}) {
  if (!member)
    return (
      <>
        <AppSidebar />
        <Topbar
          user={user}
          title="Dashboard Anggota"
          subtitle="Ringkasan keanggotaan dan keuangan Anda"
        />
        <main className="min-h-screen bg-slate-50 px-4 pb-12 pt-24 sm:px-6 lg:ml-[280px] lg:px-10 lg:pt-28">
          <div className="rounded-card border border-amber-200 bg-amber-50 p-8">
            <h3 className="text-lg font-bold text-amber-900">
              Akun belum terhubung ke data anggota
            </h3>
            <p className="mt-2 text-sm text-amber-700">
              Hubungi administrator koperasi untuk menghubungkan akun login
              dengan nomor anggota Anda.
            </p>
          </div>
        </main>
      </>
    );

  const balance = (type: "POKOK" | "WAJIB" | "SUKARELA") =>
    member.savings
      .filter((item) => item.savingsType === type)
      .reduce(
        (total, item) =>
          total +
          (item.transactionType === "SETORAN"
            ? item.amount.toNumber()
            : -item.amount.toNumber()),
        0,
      );
  const activeLoans = member.loans
    .filter((loan) => loan.status === "ACTIVE")
    .map((loan) => {
      const contractTotal =
        (loan.monthlyPayment?.toNumber() ?? 0) * loan.tenureMonths;
      const paid = loan.payments.reduce(
        (sum, payment) => sum + payment.amount.toNumber(),
        0,
      );
      const outstanding = Math.max(0, contractTotal - paid);
      const remainingPrincipal = contractTotal
        ? loan.principalAmount.toNumber() * (outstanding / contractTotal)
        : loan.principalAmount.toNumber();
      return { ...loan, paid, outstanding, remainingPrincipal };
    })
    .filter((loan) => loan.outstanding > 0);
  const submittedLoans = member.loans.filter((loan) =>
    ["SUBMITTED", "SALARY_TREASURER_APPROVED", "FINAL_APPROVED"].includes(
      loan.status,
    ),
  );
  const usedLimit = activeLoans.reduce(
    (total, loan) => total + loan.remainingPrincipal,
    0,
  );
  const maximumLimit =
    member.employmentStatus === "PNS" ? 50_000_000 : 40_000_000;
  const remainingLimit = Math.max(0, maximumLimit - usedLimit);
  const usagePercent = Math.min(
    100,
    maximumLimit ? (usedLimit / maximumLimit) * 100 : 0,
  );
  const activeIds = new Set(activeLoans.map((loan) => loan.id));
  const visibleLoans = member.loans.filter(
    (loan) =>
      submittedLoans.some((item) => item.id === loan.id) ||
      activeIds.has(loan.id),
  );

  return (
    <>
      <AppSidebar />
      <Topbar
        user={user}
        title={`Halo, ${member.name}`}
        subtitle={`${member.memberNumber} · ${member.employmentStatus === "PPPK_PARUH_WAKTU" ? "PPPK Paruh Waktu" : member.employmentStatus}`}
      />
      <main className="min-h-screen bg-slate-50 px-4 pb-12 pt-24 sm:px-6 lg:ml-[280px] lg:px-10 lg:pt-28">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MemberStat
            label="Simpanan Pokok"
            value={rupiah(balance("POKOK"))}
            note="Setoran awal keanggotaan"
            icon={Landmark}
            color="blue"
          />
          <MemberStat
            label="Simpanan Wajib"
            value={rupiah(balance("WAJIB"))}
            note="Akumulasi iuran bulanan"
            icon={Wallet}
            color="emerald"
          />
          <MemberStat
            label="Simpanan Sukarela"
            value={rupiah(balance("SUKARELA"))}
            note="Saldo yang dapat ditarik"
            icon={CircleDollarSign}
            color="violet"
          />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-12">
          <div className="overflow-hidden rounded-card bg-gradient-to-br from-blue-700 via-blue-800 to-blue-950 p-6 text-white shadow-md sm:p-7 xl:col-span-7">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-200">
                  Limit Pinjaman Anda
                </p>
                <h3 className="mt-2 text-3xl font-bold">
                  {rupiah(remainingLimit)}
                </h3>
                <p className="mt-2 text-sm text-blue-100">
                  Sisa dari plafon {rupiah(maximumLimit)} untuk status{" "}
                  {member.employmentStatus === "PNS"
                    ? "PNS"
                    : "PPPK/PPPK Paruh Waktu"}
                </p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                <CreditCard size={28} />
              </div>
            </div>
            <div className="mt-7 h-3 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-cyan-300"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <div className="mt-3 flex justify-between text-xs font-semibold text-blue-200">
              <span>Terpakai {rupiah(usedLimit)}</span>
              <span>{usagePercent.toFixed(0)}% dari limit</span>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs text-blue-200">Pinjaman berjalan</p>
                <p className="mt-1 text-xl font-bold">{activeLoans.length}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs text-blue-200">Menunggu persetujuan</p>
                <p className="mt-1 text-xl font-bold">
                  {submittedLoans.length}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-card border border-slate-200/70 bg-white p-6 shadow-sm sm:p-7 xl:col-span-5">
            <h3 className="text-base font-semibold text-slate-900 sm:text-lg">Pinjaman Saya</h3>
            <p className="text-sm text-slate-500">
              Pinjaman aktif dan pengajuan terakhir
            </p>
            <div className="mt-5 space-y-3">
              {visibleLoans.map((loan) => (
                <div
                  key={loan.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-slate-900">
                        {rupiah(loan.principalAmount.toNumber())}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {loan.loanNumber} · {loan.tenureMonths} bulan
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${loan.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                    >
                      {loan.status === "ACTIVE" ? "Berjalan" : "Diajukan"}
                    </span>
                  </div>
                  {loan.status === "ACTIVE" && (
                    <>
                      <p className="mt-3 text-sm font-semibold text-blue-700">
                        Angsuran {rupiah(loan.monthlyPayment?.toNumber() ?? 0)}{" "}
                        / bulan
                      </p>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{
                            width: `${Math.min(100, (loan.payments.length / loan.tenureMonths) * 100)}%`,
                          }}
                        />
                      </div>
                      <p className="mt-2 text-xs font-semibold text-slate-500">
                        Angsuran ke-{loan.payments.length}/{loan.tenureMonths}
                      </p>
                    </>
                  )}
                </div>
              ))}
              {!visibleLoans.length && (
                <div className="rounded-2xl bg-slate-50 px-5 py-10 text-center">
                  <BadgeCheck className="mx-auto text-slate-300" size={30} />
                  <p className="mt-3 text-sm font-semibold text-slate-500">
                    Belum memiliki pinjaman
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Limit {rupiah(maximumLimit)} masih tersedia penuh.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
        <section className="mt-6 rounded-card border border-slate-200/70 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
                Riwayat Pembayaran Pinjaman
              </h3>
              <p className="text-sm text-slate-500">
                {bulanFilter
                  ? `Angsuran yang dibayarkan pada periode ${bulanFilter}`
                  : "Tanggal dan rincian angsuran yang telah dibayarkan"}
              </p>
            </div>
            <form className="flex items-center gap-2">
              <input
                name="bulan"
                type="month"
                defaultValue={bulanFilter}
                className="h-11 rounded-xl border border-slate-200 px-3 text-sm text-slate-900"
              />
              <button className="h-11 rounded-xl bg-blue-50 px-4 text-xs font-bold text-blue-700">
                Filter
              </button>
              {bulanFilter && (
                <Link
                  href="/dashboard"
                  className="text-xs font-bold text-slate-500"
                >
                  Reset
                </Link>
              )}
            </form>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Pinjaman</th>
                  <th>Angsuran Ke</th>
                  <th>Pokok</th>
                  <th>Bunga Jasa</th>
                  <th className="text-right">Total Bayar</th>
                </tr>
              </thead>
              <tbody>
                {member.loans
                  .flatMap((loan) =>
                    loan.payments.map((payment) => ({ loan, payment })),
                  )
                  .filter(({ payment }) =>
                    bulanFilter
                      ? new Intl.DateTimeFormat("sv-SE", {
                          year: "numeric",
                          month: "2-digit",
                        })
                          .format(payment.paymentDate)
                          .startsWith(bulanFilter)
                      : true,
                  )
                  .sort(
                    (a, b) =>
                      b.payment.paymentDate.getTime() -
                      a.payment.paymentDate.getTime(),
                  )
                  .slice(0, bulanFilter ? undefined : 10)
                  .map(({ loan, payment }) => (
                    <tr key={payment.id}>
                      <td>
                        {new Intl.DateTimeFormat("id-ID", {
                          dateStyle: "medium",
                        }).format(payment.paymentDate)}
                      </td>
                      <td>
                        <b>{loan.loanNumber}</b>
                        <p className="text-xs text-slate-400">
                          {payment.receiptNumber}
                        </p>
                      </td>
                      <td>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                          {payment.installmentNumber}/{loan.tenureMonths}
                        </span>
                      </td>
                      <td>{rupiah(payment.principalComponent.toNumber())}</td>
                      <td className="text-emerald-700">
                        {rupiah(payment.interestComponent.toNumber())}
                      </td>
                      <td className="text-right font-bold">
                        {rupiah(payment.amount.toNumber())}
                      </td>
                    </tr>
                  ))}
                {!member.loans.some((loan) => loan.payments.length) && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Belum ada pembayaran pinjaman.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 rounded-card border border-slate-200/70 bg-white p-6 shadow-sm sm:p-7">
          <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
            Riwayat Simpanan Terbaru
          </h3>
          <p className="text-sm text-slate-500">
            Delapan transaksi terakhir Anda
          </p>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase text-slate-400">
                  <th className="py-4">Jenis</th>
                  <th>Tanggal</th>
                  <th>Transaksi</th>
                  <th className="text-right">Nominal</th>
                </tr>
              </thead>
              <tbody>
                {member.savings.map((item) => (
                  <tr key={item.id} className="border-b border-slate-50">
                    <td className="py-4 font-bold text-slate-800">
                      {savingsLabels[item.savingsType]}
                    </td>
                    <td className="text-slate-500">
                      {new Intl.DateTimeFormat("id-ID", {
                        dateStyle: "medium",
                      }).format(item.transactionDate)}
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold ${item.transactionType === "SETORAN" ? "text-emerald-600" : "text-orange-600"}`}
                      >
                        <ArrowDownLeft size={15} />
                        {item.transactionType === "SETORAN"
                          ? "Setoran"
                          : "Penarikan"}
                      </span>
                    </td>
                    <td className="text-right font-bold text-slate-900">
                      {rupiah(item.amount.toNumber())}
                    </td>
                  </tr>
                ))}
                {!member.savings.length && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-12 text-center text-slate-400"
                    >
                      Belum ada transaksi simpanan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}

function MemberStat({
  label,
  value,
  note,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof Wallet;
  color: "blue" | "emerald" | "violet";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <div className="rounded-card border border-slate-200/70 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{value}</p>
          <p className="mt-2 text-xs font-semibold text-slate-400">{note}</p>
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${colors[color]}`}
        >
          <Icon size={23} />
        </div>
      </div>
    </div>
  );
}
