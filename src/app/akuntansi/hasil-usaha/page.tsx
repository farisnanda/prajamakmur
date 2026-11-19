import { Receipt, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ListFilters } from "@/components/shared/ListFilters";
import { Pagination } from "@/components/shared/Pagination";
import { authOptions } from "@/lib/auth";
import { clampPage, dateRange, firstParam, pageWindow, parsePage } from "@/lib/listing";
import { prisma } from "@/lib/prisma";

const rp = (v: number) =>
  `${v < 0 ? "-" : ""}Rp${Math.abs(Math.round(v)).toLocaleString("id-ID")}`;
const dateText = (value: Date) =>
  new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(value);

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; from?: string; to?: string }>;
}) {
  const s = await getServerSession(authOptions);
  if (!s) redirect("/login");
  if (s.user.role === "ANGGOTA") redirect("/dashboard");

  const params = await searchParams;
  const search = firstParam(params.q);
  const from = firstParam(params.from);
  const to = firstParam(params.to);
  const range = dateRange(from, to);

  const ledgerWhere = {
    recognizedAt: range,
    loan: search
      ? {
          OR: [
            { loanNumber: { contains: search, mode: "insensitive" as const } },
            {
              member: {
                OR: [
                  { name: { contains: search, mode: "insensitive" as const } },
                  { memberNumber: { contains: search, mode: "insensitive" as const } },
                ],
              },
            },
          ],
        }
      : undefined,
  };

  const [count, income, expense, activeLoans] = await Promise.all([
    prisma.businessIncome.count({ where: ledgerWhere }),
    prisma.businessIncome.aggregate({
      where: { recognizedAt: range },
      _sum: { amount: true },
    }),
    prisma.operationalExpense.aggregate({
      where: { transactionDate: range },
      _sum: { amount: true },
    }),
    prisma.loan.findMany({
      where: { status: "ACTIVE", monthlyPayment: { not: null } },
      select: {
        principalAmount: true,
        monthlyPayment: true,
        tenureMonths: true,
        payments: { select: { interestComponent: true } },
      },
    }),
  ]);

  const page = clampPage(parsePage(params.page), count);
  const rows = await prisma.businessIncome.findMany({
    where: ledgerWhere,
    select: {
      id: true,
      recognizedAt: true,
      amount: true,
      loanPayment: {
        select: {
          amount: true,
          receiptNumber: true,
          installmentNumber: true,
          principalComponent: true,
        },
      },
      loan: {
        select: {
          loanNumber: true,
          member: { select: { name: true, memberNumber: true } },
        },
      },
    },
    orderBy: [{ recognizedAt: "desc" }, { id: "asc" }],
    ...pageWindow(page),
  });

  const interestIncome = income._sum.amount?.toNumber() ?? 0;
  const operationalExpense = expense._sum.amount?.toNumber() ?? 0;
  const net = interestIncome - operationalExpense;

  // Bunga pada pinjaman berjalan: seluruh bunga dibayar lebih dulu dari cicilan awal.
  let contractInterest = 0;
  let paidInterest = 0;
  for (const loan of activeLoans) {
    const monthly = loan.monthlyPayment?.toNumber() ?? 0;
    contractInterest += Math.max(0, monthly * loan.tenureMonths - loan.principalAmount.toNumber());
    paidInterest += loan.payments.reduce((sum, p) => sum + p.interestComponent.toNumber(), 0);
  }
  const remainingInterest = Math.max(0, contractInterest - paidInterest);
  const paidShare = contractInterest > 0 ? Math.min(100, (paidInterest / contractInterest) * 100) : 0;
  const filtered = Boolean(from || to);

  return (
    <>
      <AppSidebar />
      <Topbar
        user={s.user}
        title="Hasil Usaha"
        subtitle="Pendapatan bunga pinjaman dikurangi belanja operasional"
      />
      <main className="min-h-screen bg-slate-50 px-4 pb-12 pt-24 sm:px-6 lg:ml-[280px] lg:px-10 lg:pt-28">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Card
            icon={TrendingUp}
            tone="emerald"
            label={`Pendapatan bunga${filtered ? " (periode)" : ""}`}
            value={rp(interestIncome)}
          />
          <Card
            icon={TrendingDown}
            tone="amber"
            label={`Belanja operasional${filtered ? " (periode)" : ""}`}
            value={rp(operationalExpense)}
          />
          <Card
            icon={Wallet}
            tone={net >= 0 ? "blue" : "red"}
            label={`Hasil usaha bersih${filtered ? " (periode)" : ""}`}
            value={rp(net)}
          />
        </section>

        <section className="mt-6 rounded-card border border-slate-200/70 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
                Bunga pinjaman berjalan
              </h3>
              <p className="text-sm text-slate-500">
                Seluruh bunga dibayar lebih dulu dari cicilan awal, lalu sisa cicilan mengurangi pokok.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              <Receipt size={14} /> {activeLoans.length} pinjaman berjalan
            </span>
          </div>
          <dl className="mt-5 grid gap-4 sm:grid-cols-3">
            <Metric label="Total bunga kontrak" value={rp(contractInterest)} />
            <Metric label="Sudah dibayar" value={rp(paidInterest)} />
            <Metric label="Belum dibayar" value={rp(remainingInterest)} />
          </dl>
          <div className="mt-5">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Bunga terbayar</span>
              <span className="tabular-nums">{Math.round(paidShare)}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${paidShare}%` }} />
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-card border border-slate-200/70 bg-white p-5 shadow-sm sm:p-7">
          <h3 className="text-base font-semibold text-slate-900 sm:text-lg">Riwayat Pendapatan Bunga</h3>
          <p className="text-sm text-slate-500">
            Diakui saat angsuran diterima · {count.toLocaleString("id-ID")} catatan
          </p>
          <ListFilters
            basePath="/akuntansi/hasil-usaha"
            q={search}
            placeholder="Cari anggota, nomor anggota, atau nomor pinjaman..."
            dates={{ from, to }}
          />
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-slate-400">
                  <th className="py-3">Tanggal</th>
                  <th>Anggota</th>
                  <th>Pinjaman</th>
                  <th>Angsuran</th>
                  <th className="text-right">Pokok</th>
                  <th className="text-right">Pendapatan Bunga</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50">
                    <td className="py-4">{dateText(r.recognizedAt)}</td>
                    <td>
                      <b>{r.loan.member.name}</b>
                      <p className="text-xs text-slate-400">{r.loan.member.memberNumber}</p>
                    </td>
                    <td>{r.loan.loanNumber}</td>
                    <td>
                      {r.loanPayment ? `ke-${r.loanPayment.installmentNumber}` : "-"}
                      <p className="text-xs text-slate-400">
                        {rp(r.loanPayment?.amount.toNumber() ?? 0)}
                      </p>
                    </td>
                    <td className="text-right tabular-nums text-slate-600">
                      {rp(r.loanPayment?.principalComponent.toNumber() ?? 0)}
                    </td>
                    <td className="text-right font-bold tabular-nums text-emerald-700">
                      {rp(r.amount.toNumber())}
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Tidak ada pendapatan bunga yang sesuai.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            basePath="/akuntansi/hasil-usaha"
            query={{ q: search, from, to }}
            page={page}
            total={count}
          />
        </section>
      </main>
    </>
  );
}

function Card({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: typeof TrendingUp;
  tone: "emerald" | "amber" | "blue" | "red";
  label: string;
  value: string;
}) {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
    red: "bg-red-50 text-red-600",
  };
  return (
    <div className="rounded-card border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1.5 truncate text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {value}
          </p>
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${colors[tone]}`}>
          <Icon size={23} />
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{value}</dd>
    </div>
  );
}
