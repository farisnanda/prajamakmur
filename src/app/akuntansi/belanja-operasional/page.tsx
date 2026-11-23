import { ChevronLeft, ChevronRight } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountingEntryModal } from "@/components/accounting/AccountingEntryModal";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
const SIZE = 25;
const rp = (v: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);
const labels: { [k: string]: string } = {
  KESEJAHTERAAN_MANAJER: "Kesejahteraan Manajer",
  KESEJAHTERAAN_PEGAWAI: "Kesejahteraan Pegawai",
  MAKAN_MINUM: "Makan Minum",
  BANTUAN_TRANSPORTASI: "Bantuan Transportasi",
  HONORARIUM_NARASUMBER: "Honorarium Narasumber",
  HONORARIUM_SIDANG: "Honorarium Sidang",
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    error?: string;
    q?: string;
    from?: string;
    to?: string;
    category?: string;
    accountId?: string;
  }>;
}) {
  const s = await getServerSession(authOptions);
  if (!s) redirect("/login");
  if (s.user.role === "ANGGOTA") redirect("/dashboard");
  const q = await searchParams;
  const from = q.from ? new Date(`${q.from}T00:00:00`) : undefined,
    to = q.to ? new Date(`${q.to}T23:59:59.999`) : undefined;
  const where = {
    accountId: q.accountId || undefined,
    category: Object.keys(labels).includes(q.category ?? "")
      ? (q.category as never)
      : undefined,
    transactionDate: from || to ? { gte: from, lte: to } : undefined,
    OR: q.q
      ? [
          { description: { contains: q.q, mode: "insensitive" as const } },
          { expenseNumber: { contains: q.q, mode: "insensitive" as const } },
          { recipient: { contains: q.q, mode: "insensitive" as const } },
        ]
      : undefined,
  };
  const requested = Math.max(1, parseInt(q.page ?? "1") || 1);
  const [accounts, count, total] = await Promise.all([
    prisma.cashAccount.findMany({
      select: { id: true, name: true, balance: true },
      orderBy: { name: "asc" },
    }),
    prisma.operationalExpense.count({ where }),
    prisma.operationalExpense.aggregate({ where, _sum: { amount: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(count / SIZE));
  const page = Math.min(requested, pages);
  const expenses = await prisma.operationalExpense.findMany({
    where,
    select: {
      id: true,
      transactionDate: true,
      category: true,
      description: true,
      amount: true,
      account: { select: { name: true } },
    },
    orderBy: { transactionDate: "desc" },
    skip: (page - 1) * SIZE,
    take: SIZE,
  });
  return (
    <>
      <AppSidebar />
      <Topbar
        user={s.user}
        title="Belanja Operasional"
        subtitle="Pengeluaran operasional berdasarkan sumber kas"
      />
      <main className="min-h-screen bg-slate-50 px-4 pb-12 pt-24 sm:px-6 lg:ml-[280px] lg:px-10 lg:pt-28">
        {q.error && (
          <div role="alert" className="mb-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
            {q.error === "cash"
              ? "Saldo kas tidak mencukupi untuk transaksi ini."
              : "Data belum valid. Periksa kembali isian Anda."}
          </div>
        )}
        <div className="rounded-2xl bg-blue-600 p-6 text-white">
          <p className="text-sm text-blue-100">Total Belanja Operasional</p>
          <p className="mt-2 text-3xl font-bold">
            {rp(total._sum.amount?.toNumber() ?? 0)}
          </p>
        </div>
        <section className="mt-6 rounded-card bg-white p-7 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Riwayat Belanja</h3>
              <p className="text-sm text-slate-500">25 transaksi per halaman</p>
            </div>
            <AccountingEntryModal
              kind="expense"
              accounts={accounts.map((a) => ({
                id: a.id,
                name: a.name,
                balance: a.balance.toNumber(),
              }))}
            />
          </div>
          <form className="mt-5 grid grid-cols-6 gap-3">
            <input
              name="q"
              defaultValue={q.q}
              placeholder="Cari keterangan / penerima"
              className="col-span-2 h-11 rounded-xl border px-3 text-sm"
            />
            <input
              name="from"
              type="date"
              defaultValue={q.from}
              className="h-11 rounded-xl border px-3 text-sm"
            />
            <input
              name="to"
              type="date"
              defaultValue={q.to}
              className="h-11 rounded-xl border px-3 text-sm"
            />
            <select
              name="category"
              defaultValue={q.category ?? ""}
              className="h-11 rounded-xl border px-3 text-sm"
            >
              <option value="">Semua kategori</option>
              {Object.entries(labels).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <select
              name="accountId"
              defaultValue={q.accountId ?? ""}
              className="h-11 rounded-xl border px-3 text-sm"
            >
              <option value="">Semua kas</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <button className="col-start-6 h-11 rounded-xl bg-slate-900 font-bold text-white">
              Terapkan
            </button>
          </form>
          <table className="mt-5 w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase text-slate-400">
                <th className="py-3">Tanggal</th>
                <th>Kategori</th>
                <th>Sumber Kas</th>
                <th>Keterangan</th>
                <th className="text-right">Nominal</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-b">
                  <td className="py-4">
                    {new Intl.DateTimeFormat("id-ID").format(e.transactionDate)}
                  </td>
                  <td>{labels[e.category]}</td>
                  <td>{e.account.name}</td>
                  <td>{e.description}</td>
                  <td className="text-right font-bold">
                    {rp(e.amount.toNumber())}
                  </td>
                </tr>
              ))}
              {!expenses.length && (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-slate-400">
                    Belum ada belanja operasional.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="mt-5 flex justify-between border-t pt-5">
            <p className="text-sm text-slate-500">
              Halaman {page} dari {pages} · {count} transaksi
            </p>
            <div className="flex gap-2">
              <Link
                href={`/akuntansi/belanja-operasional?page=${Math.max(1, page - 1)}`}
                className={`flex h-9 items-center gap-1 rounded-lg border px-3 text-sm ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}
              >
                <ChevronLeft size={15} />
                Sebelumnya
              </Link>
              <Link
                href={`/akuntansi/belanja-operasional?page=${Math.min(pages, page + 1)}`}
                className={`flex h-9 items-center gap-1 rounded-lg border px-3 text-sm ${page >= pages ? "pointer-events-none opacity-40" : ""}`}
              >
                Berikutnya
                <ChevronRight size={15} />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
