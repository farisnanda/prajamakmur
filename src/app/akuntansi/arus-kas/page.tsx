import { ChevronLeft, ChevronRight } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountingEntryModal } from "@/components/accounting/AccountingEntryModal";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
const SIZE = 10;
const rp = (v: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    from?: string;
    to?: string;
    accountId?: string;
    type?: string;
  }>;
}) {
  const s = await getServerSession(authOptions);
  if (!s) redirect("/login");
  if (s.user.role === "ANGGOTA") redirect("/dashboard");
  const q = await searchParams;
  const from = q.from ? new Date(`${q.from}T00:00:00`) : undefined;
  const to = q.to ? new Date(`${q.to}T23:59:59.999`) : undefined;
  const where = {
    accountId: q.accountId || undefined,
    type: ["INFLOW", "OUTFLOW"].includes(q.type ?? "")
      ? (q.type as "INFLOW" | "OUTFLOW")
      : undefined,
    transactionDate: from || to ? { gte: from, lte: to } : undefined,
    OR: q.q
      ? [
          { description: { contains: q.q, mode: "insensitive" as const } },
          { reference: { contains: q.q, mode: "insensitive" as const } },
        ]
      : undefined,
  };
  const requested = Math.max(1, parseInt(q.page ?? "1") || 1);
  const [accounts, count] = await Promise.all([
    prisma.cashAccount.findMany({
      select: { id: true, name: true, balance: true },
      orderBy: { name: "asc" },
    }),
    prisma.cashTransaction.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(count / SIZE));
  const page = Math.min(requested, pages);
  const txs = await prisma.cashTransaction.findMany({
    where,
    select: {
      id: true,
      transactionDate: true,
      type: true,
      amount: true,
      description: true,
      account: { select: { name: true } },
    },
    orderBy: { transactionDate: "desc" },
    skip: (page - 1) * SIZE,
    take: SIZE,
  });
  const options = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    balance: a.balance.toNumber(),
  }));
  return (
    <>
      <AppSidebar />
      <Topbar
        user={s.user}
        title="Arus Kas"
        subtitle="Saldo dan pencatatan enam rekening kas koperasi"
      />
      <main className="ml-[280px] min-h-screen bg-slate-50 px-8 pb-10 pt-32">
        <section className="grid grid-cols-3 gap-4">
          {accounts.map((a) => (
            <div key={a.id} className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">{a.name}</p>
              <p className="mt-2 text-xl font-bold">
                {rp(a.balance.toNumber())}
              </p>
            </div>
          ))}
        </section>
        <section className="mt-6 rounded-[28px] bg-white p-7 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Riwayat Arus Kas</h3>
              <p className="text-sm text-slate-500">10 transaksi per halaman</p>
            </div>
            <AccountingEntryModal kind="cash" accounts={options} />
          </div>
          <form className="mt-5 grid grid-cols-6 gap-3">
            <input
              name="q"
              defaultValue={q.q}
              placeholder="Cari keterangan / referensi"
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
            <select
              name="type"
              defaultValue={q.type ?? ""}
              className="h-11 rounded-xl border px-3 text-sm"
            >
              <option value="">Semua jenis</option>
              <option value="INFLOW">Kas masuk</option>
              <option value="OUTFLOW">Kas keluar</option>
            </select>
            <button className="col-start-6 h-11 rounded-xl bg-slate-900 font-bold text-white">
              Terapkan
            </button>
          </form>
          <table className="mt-5 w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase text-slate-400">
                <th className="py-3">Tanggal</th>
                <th>Kas</th>
                <th>Jenis</th>
                <th>Keterangan</th>
                <th className="text-right">Nominal</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((t) => (
                <tr key={t.id} className="border-b">
                  <td className="py-4">
                    {new Intl.DateTimeFormat("id-ID").format(t.transactionDate)}
                  </td>
                  <td>{t.account.name}</td>
                  <td>{t.type === "INFLOW" ? "Masuk" : "Keluar"}</td>
                  <td>{t.description}</td>
                  <td
                    className={`text-right font-bold ${t.type === "INFLOW" ? "text-emerald-700" : "text-red-700"}`}
                  >
                    {rp(t.amount.toNumber())}
                  </td>
                </tr>
              ))}
              {!txs.length && (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-slate-400">
                    Belum ada transaksi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <Pager
            page={page}
            pages={pages}
            base="/akuntansi/arus-kas"
            filters={q}
          />
        </section>
      </main>
    </>
  );
}
function Pager({
  page,
  pages,
  base,
  filters,
}: {
  page: number;
  pages: number;
  base: string;
  filters: Record<string, string | undefined>;
}) {
  const href = (p: number) => {
    const x = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v && k !== "page") x.set(k, v);
    });
    x.set("page", String(p));
    return `${base}?${x}`;
  };
  return (
    <div className="mt-5 flex justify-between border-t pt-5">
      <p className="text-sm text-slate-500">
        Halaman {page} dari {pages}
      </p>
      <div className="flex gap-2">
        <Link
          aria-disabled={page <= 1}
          href={href(Math.max(1, page - 1))}
          className={`flex h-9 items-center gap-1 rounded-lg border px-3 text-sm ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}
        >
          <ChevronLeft size={15} />
          Sebelumnya
        </Link>
        <Link
          aria-disabled={page >= pages}
          href={href(Math.min(pages, page + 1))}
          className={`flex h-9 items-center gap-1 rounded-lg border px-3 text-sm ${page >= pages ? "pointer-events-none opacity-40" : ""}`}
        >
          Berikutnya
          <ChevronRight size={15} />
        </Link>
      </div>
    </div>
  );
}
