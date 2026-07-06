import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Clock3,
  Landmark,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { prisma } from "@/lib/prisma";

const rp = (v: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);
const monthName = (d: Date) =>
  new Intl.DateTimeFormat("id-ID", { month: "short" }).format(d);

export async function AdminDashboard({
  user,
}: {
  user: Parameters<typeof Topbar>[0]["user"];
}) {
  const now = new Date(),
    start = new Date(now.getFullYear(), now.getMonth() - 11, 1),
    monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [
    members,
    savings,
    loans,
    payments,
    cashAccounts,
    cashTx,
    expenses,
    incomes,
    pendingWithdrawals,
    recentSavings,
    allSavings,
    allPayments,
    externalCashIn,
    externalCashOut,
  ] = await Promise.all([
    prisma.member.count({ where: { isActive: true } }),
    prisma.savingsTransaction.findMany({
      where: { transactionDate: { gte: start } },
      select: {
        amount: true,
        transactionType: true,
        savingsType: true,
        transactionDate: true,
      },
    }),
    prisma.loan.findMany({
      select: {
        id: true,
        status: true,
        principalAmount: true,
        monthlyPayment: true,
        tenureMonths: true,
        applicationDate: true,
        loanNumber: true,
        member: { select: { name: true } },
      },
    }),
    prisma.loanPayment.findMany({
      where: { paymentDate: { gte: start } },
      select: { amount: true, paymentDate: true },
    }),
    prisma.cashAccount.findMany({
      select: { name: true, balance: true },
      orderBy: { name: "asc" },
    }),
    prisma.cashTransaction.findMany({
      where: { transactionDate: { gte: start } },
      select: { type: true, amount: true, transactionDate: true },
    }),
    prisma.operationalExpense.findMany({
      where: { transactionDate: { gte: start } },
      select: { amount: true, transactionDate: true },
    }),
    prisma.businessIncome.findMany({
      where: { recognizedAt: { gte: start } },
      select: { amount: true, recognizedAt: true },
    }),
    prisma.savingsWithdrawalRequest.count({ where: { status: "SUBMITTED" } }),
    prisma.savingsTransaction.findMany({
      take: 6,
      orderBy: { transactionDate: "desc" },
      select: {
        id: true,
        amount: true,
        savingsType: true,
        transactionType: true,
        transactionDate: true,
        member: { select: { name: true, memberNumber: true } },
      },
    }),
    prisma.savingsTransaction.groupBy({
      by: ["savingsType", "transactionType"],
      _sum: { amount: true },
    }),
    prisma.loanPayment.groupBy({
      by: ["loanId"],
      _sum: { amount: true },
    }),
    prisma.cashTransaction.aggregate({
      where: {
        type: "INFLOW",
        NOT: [
          { description: { startsWith: "Setoran Simpanan" } },
          { description: { startsWith: "Rekonsiliasi saldo bersih simpanan" } },
        ],
      },
      _sum: { amount: true },
    }),
    prisma.cashTransaction.aggregate({
      where: {
        type: "OUTFLOW",
        NOT: { description: { startsWith: "Penarikan Simpanan" } },
      },
      _sum: { amount: true },
    }),
  ]);
  const months = Array.from(
    { length: 12 },
    (_, i) => new Date(now.getFullYear(), now.getMonth() - 11 + i, 1),
  );
  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
  const trend = months.map((date) => {
    const k = key(date);
    const sv = savings
      .filter((x) => key(x.transactionDate) === k)
      .reduce(
        (n, x) =>
          n +
          (x.transactionType === "SETORAN"
            ? x.amount.toNumber()
            : -x.amount.toNumber()),
        0,
      );
    const ci = cashTx
      .filter((x) => key(x.transactionDate) === k && x.type === "INFLOW")
      .reduce((n, x) => n + x.amount.toNumber(), 0);
    const co = cashTx
      .filter((x) => key(x.transactionDate) === k && x.type === "OUTFLOW")
      .reduce((n, x) => n + x.amount.toNumber(), 0);
    return { label: monthName(date), savings: sv, inflow: ci, outflow: co };
  });
  const savingBalances = (["POKOK", "WAJIB", "SUKARELA"] as const).map(
    (type) => ({
      type,
      value: allSavings
        .filter((x) => x.savingsType === type)
        .reduce(
          (n, x) =>
            n +
            (x.transactionType === "SETORAN"
              ? (x._sum.amount?.toNumber() ?? 0)
              : -(x._sum.amount?.toNumber() ?? 0)),
          0,
        ),
    }),
  );
  const totalSavings = savingBalances.reduce((n, x) => n + x.value, 0),
    activeLoans = loans.filter((x) => x.status === "ACTIVE"),
    loanValue = activeLoans.reduce(
      (n, x) => n + x.principalAmount.toNumber(),
      0,
    ),
    cashBalance = cashAccounts.reduce((n, x) => n + x.balance.toNumber(), 0);
  const paidByLoan = new Map(
    allPayments.map((x) => [x.loanId, x._sum.amount?.toNumber() ?? 0]),
  );
  const outstandingLoans = activeLoans.reduce(
    (sum, loan) =>
      sum +
      Math.max(
        0,
        (loan.monthlyPayment?.toNumber() ?? 0) * loan.tenureMonths -
          (paidByLoan.get(loan.id) ?? 0),
      ),
    0,
  );
  const savingsIn = allSavings
    .filter((x) => x.transactionType === "SETORAN")
    .reduce((n, x) => n + (x._sum.amount?.toNumber() ?? 0), 0);
  const savingsOut = allSavings
    .filter((x) => x.transactionType === "PENARIKAN")
    .reduce((n, x) => n + (x._sum.amount?.toNumber() ?? 0), 0);
  const installmentIn = allPayments.reduce(
    (n, x) => n + (x._sum.amount?.toNumber() ?? 0),
    0,
  );
  const cashIn = externalCashIn._sum.amount?.toNumber() ?? 0;
  const cashOut = externalCashOut._sum.amount?.toNumber() ?? 0;
  const globalIncome = savingsIn + installmentIn + cashIn,
    globalExpense = savingsOut + cashOut,
    netFlow = globalIncome - globalExpense,
    totalManagedAssets = cashBalance;
  const monthExpense = expenses
      .filter((x) => x.transactionDate >= monthStart)
      .reduce((n, x) => n + x.amount.toNumber(), 0),
    totalIncome = incomes.reduce((n, x) => n + x.amount.toNumber(), 0);
  const pending = loans.filter((x) =>
    ["SUBMITTED", "SALARY_TREASURER_APPROVED", "FINAL_APPROVED"].includes(
      x.status,
    ),
  );
  const status = [
    {
      l: "Diajukan",
      v: loans.filter((x) => x.status === "SUBMITTED").length,
      c: "bg-amber-500",
    },
    {
      l: "Bendahara setuju",
      v: loans.filter((x) => x.status === "SALARY_TREASURER_APPROVED").length,
      c: "bg-cyan-500",
    },
    {
      l: "Siap dicairkan",
      v: loans.filter((x) => x.status === "FINAL_APPROVED").length,
      c: "bg-violet-500",
    },
    { l: "Berjalan", v: activeLoans.length, c: "bg-blue-600" },
    {
      l: "Ditolak",
      v: loans.filter((x) => x.status === "REJECTED").length,
      c: "bg-red-500",
    },
  ];
  return (
    <>
      <AppSidebar />
      <Topbar
        user={user}
        title="Dashboard Admin"
        subtitle={`Ringkasan koperasi · ${new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(now)}`}
      />
      <main className="ml-[280px] min-h-screen bg-slate-50 px-8 pb-10 pt-32">
        <section className="grid grid-cols-5 gap-4">
          <Stat
            icon={Users}
            label="Anggota Aktif"
            value={String(members)}
            note="anggota terdaftar"
          />
          <Stat
            icon={Wallet}
            label="Total Simpanan"
            value={rp(totalSavings)}
            note="saldo 12 bulan"
          />
          <Stat
            icon={Landmark}
            label="Pinjaman Berjalan"
            value={rp(loanValue)}
            note={`${activeLoans.length} pinjaman aktif`}
          />
          <Stat
            icon={Banknote}
            label="Total Saldo Kas"
            value={rp(cashBalance)}
            note={`${cashAccounts.length} rekening kas`}
          />
          <Stat
            icon={TrendingUp}
            label="Hasil Usaha"
            value={rp(totalIncome)}
            note="Bunga jasa yang telah terealisasi"
          />
        </section>
        <section className="mt-6 overflow-hidden rounded-[28px] bg-gradient-to-br from-blue-700 via-blue-800 to-blue-950 text-white shadow-xl shadow-blue-900/15">
          <div className="grid grid-cols-12">
            <div className="col-span-4 border-r border-white/10 p-7">
              <p className="text-sm font-semibold text-blue-200">
                Kondisi Keuangan Keseluruhan
              </p>
              <p className="mt-3 text-3xl font-bold">
                {rp(totalManagedAssets)}
              </p>
              <p className="mt-2 text-xs leading-5 text-blue-200">
                Aset terpantau dari saldo kas dan sisa piutang pinjaman
                berjalan.
              </p>
              <div className="mt-5 flex gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${netFlow >= 0 ? "bg-emerald-400/15 text-emerald-300" : "bg-red-400/15 text-red-300"}`}
                >
                  {netFlow >= 0 ? "Arus positif" : "Arus negatif"}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-300">
                  Akumulasi keseluruhan
                </span>
              </div>
            </div>
            <div className="col-span-8 grid grid-cols-3">
              <FinanceSummary
                label="Pemasukan Global"
                value={globalIncome}
                tone="green"
              />
              <FinanceSummary
                label="Pengeluaran Global"
                value={globalExpense}
                tone="red"
              />
              <FinanceSummary
                label="Arus Bersih"
                value={netFlow}
                tone={netFlow >= 0 ? "blue" : "red"}
              />
            </div>
          </div>
        </section>
        <section className="mt-6 grid grid-cols-12 gap-6">
          <div className="col-span-8 rounded-[28px] bg-white p-7 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold">
                  Perkembangan Keuangan 12 Bulan
                </h3>
                <p className="text-sm text-slate-500">
                  Simpanan bersih serta arus kas masuk dan keluar
                </p>
              </div>
              <span className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
                Data aktual
              </span>
            </div>
            <TrendChart data={trend} />
          </div>
          <div className="col-span-4 rounded-[28px] bg-white p-7 shadow-sm">
            <h3 className="text-lg font-bold">Pekerjaan Menunggu</h3>
            <p className="text-sm text-slate-500">
              Tindakan yang perlu segera diselesaikan
            </p>
            <div className="mt-5 space-y-3">
              <Task
                href="/pinjaman"
                label="Pengajuan pinjaman"
                value={pending.length}
              />
              <Task
                href="/pinjaman"
                label="Menunggu pencairan"
                value={
                  loans.filter((x) => x.status === "FINAL_APPROVED").length
                }
              />
              <Task
                href="/simpanan/sukarela/penarikan"
                label="Penarikan sukarela"
                value={pendingWithdrawals}
              />
            </div>
            {pending.length + pendingWithdrawals > 0 ? (
              <div className="mt-5 flex gap-3 rounded-2xl bg-amber-50 p-4 text-amber-800">
                <AlertTriangle className="shrink-0" size={20} />
                <p className="text-xs font-semibold">
                  Ada {pending.length + pendingWithdrawals} transaksi yang
                  memerlukan tindak lanjut pengelola.
                </p>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                Semua antrean telah ditangani.
              </div>
            )}
          </div>
        </section>
        <section className="mt-6 grid grid-cols-12 gap-6">
          <div className="col-span-5 rounded-[28px] bg-white p-7 shadow-sm">
            <h3 className="text-lg font-bold">Komposisi Simpanan</h3>
            <p className="text-sm text-slate-500">
              Saldo bersih per jenis simpanan
            </p>
            <div className="mt-6 space-y-5">
              {savingBalances.map((x) => (
                <div key={x.type}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>{x.type[0] + x.type.slice(1).toLowerCase()}</span>
                    <b>{rp(x.value)}</b>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{
                        width: `${totalSavings ? Math.max(2, (x.value / totalSavings) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="col-span-7 rounded-[28px] bg-white p-7 shadow-sm">
            <h3 className="text-lg font-bold">Kondisi Pinjaman</h3>
            <p className="text-sm text-slate-500">
              Posisi seluruh proses pinjaman
            </p>
            <div className="mt-6 grid grid-cols-5 gap-3">
              {status.map((x) => (
                <div key={x.l} className="rounded-2xl bg-slate-50 p-4">
                  <div className={`mb-4 h-2 w-8 rounded-full ${x.c}`} />
                  <p className="text-2xl font-bold">{x.v}</p>
                  <p className="mt-1 text-xs text-slate-500">{x.l}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-between rounded-2xl bg-blue-50 p-4 text-sm">
              <span className="text-blue-700">Angsuran diterima 12 bulan</span>
              <b className="text-blue-900">
                {rp(payments.reduce((n, x) => n + x.amount.toNumber(), 0))}
              </b>
            </div>
          </div>
        </section>
        <section className="mt-6 rounded-[28px] bg-white p-7 shadow-sm">
          <div className="flex justify-between">
            <div>
              <h3 className="text-lg font-bold">Aktivitas Simpanan Terbaru</h3>
              <p className="text-sm text-slate-500">
                Enam transaksi terakhir yang tercatat
              </p>
            </div>
            <Link href="/simpanan" className="text-sm font-bold text-blue-700">
              Lihat semua
            </Link>
          </div>
          <table className="mt-5 w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase text-slate-400">
                <th className="py-3">Anggota</th>
                <th>Jenis</th>
                <th>Tanggal</th>
                <th>Transaksi</th>
                <th className="text-right">Nominal</th>
              </tr>
            </thead>
            <tbody>
              {recentSavings.map((x) => (
                <tr key={x.id} className="border-b border-slate-50">
                  <td className="py-4">
                    <b>{x.member.name}</b>
                    <p className="text-xs text-slate-400">
                      {x.member.memberNumber}
                    </p>
                  </td>
                  <td>{x.savingsType}</td>
                  <td>
                    {new Intl.DateTimeFormat("id-ID").format(x.transactionDate)}
                  </td>
                  <td>
                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${x.transactionType === "SETORAN" ? "text-emerald-600" : "text-orange-600"}`}
                    >
                      {x.transactionType === "SETORAN" ? (
                        <ArrowUpRight size={15} />
                      ) : (
                        <ArrowDownRight size={15} />
                      )}{" "}
                      {x.transactionType === "SETORAN"
                        ? "Setoran"
                        : "Penarikan"}
                    </span>
                  </td>
                  <td className="text-right font-bold">
                    {rp(x.amount.toNumber())}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}
function Stat({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-[24px] bg-white p-5 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        <Icon size={21} />
      </div>
      <p className="mt-4 text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
      <p className="mt-1 truncate text-xs text-slate-400">{note}</p>
    </div>
  );
}
function FinanceSummary({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "red" | "blue";
}) {
  const color = {
    green: "text-emerald-300",
    red: "text-rose-300",
    blue: "text-sky-300",
  }[tone];
  return (
    <div className="flex flex-col justify-center border-r border-white/10 p-7 last:border-r-0">
      <p className="text-xs font-bold uppercase tracking-wider text-blue-200">
        {label}
      </p>
      <p className={`mt-3 text-2xl font-bold ${color}`}>{rp(value)}</p>
    </div>
  );
}
function Task({
  href,
  label,
  value,
}: {
  href: string;
  label: string;
  value: number;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-2xl border border-slate-100 p-4 hover:bg-slate-50"
    >
      <span className="flex items-center gap-3 text-sm font-semibold">
        <Clock3 size={18} className="text-blue-600" />
        {label}
      </span>
      <b className="rounded-full bg-blue-600 px-3 py-1 text-xs text-white">
        {value}
      </b>
    </Link>
  );
}
function TrendChart({
  data,
}: {
  data: { label: string; savings: number; inflow: number; outflow: number }[];
}) {
  const max = Math.max(
    1,
    ...data.flatMap((x) => [x.savings, x.inflow, x.outflow]),
  );
  const points = (field: "savings" | "inflow" | "outflow") =>
    data
      .map(
        (x, i) =>
          `${(i * 100) / (data.length - 1)},${100 - (Math.max(0, x[field]) / max) * 88}`,
      )
      .join(" ");
  return (
    <div className="mt-6">
      <div className="flex gap-5 text-xs font-semibold">
        <Legend c="bg-blue-600" t="Simpanan bersih" />
        <Legend c="bg-emerald-500" t="Kas masuk" />
        <Legend c="bg-orange-500" t="Kas keluar" />
      </div>
      <svg
        viewBox="0 0 100 105"
        preserveAspectRatio="none"
        className="mt-5 h-64 w-full overflow-visible"
      >
        <defs>
          <linearGradient id="savingArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2563eb" stopOpacity=".22" />
            <stop offset="1" stopColor="#2563eb" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[25, 50, 75, 100].map((y) => (
          <line
            key={y}
            x1="0"
            x2="100"
            y1={y}
            y2={y}
            stroke="#e2e8f0"
            strokeWidth=".3"
          />
        ))}
        <polygon
          points={`0,100 ${points("savings")} 100,100`}
          fill="url(#savingArea)"
        />
        <polyline
          points={points("savings")}
          fill="none"
          stroke="#2563eb"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={points("inflow")}
          fill="none"
          stroke="#10b981"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={points("outflow")}
          fill="none"
          stroke="#f97316"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="flex justify-between text-[10px] font-semibold text-slate-400">
        {data.map((x) => (
          <span key={x.label}>{x.label}</span>
        ))}
      </div>
    </div>
  );
}
function Legend({ c, t }: { c: string; t: string }) {
  return (
    <span className="flex items-center gap-2">
      <i className={`h-2.5 w-2.5 rounded-full ${c}`} />
      {t}
    </span>
  );
}
