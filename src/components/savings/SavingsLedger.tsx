import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { BulkMandatorySavingsForm } from "@/components/savings/BulkMandatorySavingsForm";
import { SavingsEntryModal } from "@/components/savings/SavingsEntryModal";
import { missingPrincipalWhere } from "@/lib/principalSavings";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SIZE = 25,
  labels = { POKOK: "Pokok", WAJIB: "Wajib", SUKARELA: "Sukarela" };
const rupiah = (v: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);
type Filters = {
  q?: string;
  from?: string;
  to?: string;
  savingsType?: string;
  transactionType?: string;
  success?: string;
  created?: string;
  skipped?: string;
  page?: string;
};

export async function SavingsLedger({
  type,
  filters,
}: {
  type?: "POKOK" | "WAJIB" | "SUKARELA";
  filters: Filters;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role === "ANGGOTA") redirect("/dashboard");
  const q = filters.q?.trim() ?? "",
    validType = ["POKOK", "WAJIB", "SUKARELA"].includes(
      filters.savingsType ?? "",
    )
      ? (filters.savingsType as keyof typeof labels)
      : undefined,
    trxType = ["SETORAN", "PENARIKAN"].includes(filters.transactionType ?? "")
      ? (filters.transactionType as "SETORAN" | "PENARIKAN")
      : undefined;
  const from = filters.from ? new Date(`${filters.from}T00:00:00`) : undefined,
    to = filters.to ? new Date(`${filters.to}T23:59:59.999`) : undefined;
  const where = {
    savingsType: type ?? validType,
    transactionType: trxType,
    transactionDate: from || to ? { gte: from, lte: to } : undefined,
    member: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { memberNumber: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : undefined,
  };
  const requested = Math.max(1, Number(filters.page) || 1);
  const [count, totals, members] = await Promise.all([
    prisma.savingsTransaction.count({ where }),
    prisma.savingsTransaction.groupBy({
      by: ["transactionType"],
      where: { savingsType: type },
      _sum: { amount: true },
    }),
    prisma.member.findMany({
      // Simpanan pokok sekali per anggota: tampilkan yang belum punya saja.
      where: type === "POKOK" ? missingPrincipalWhere : { isActive: true },
      select: {
        id: true,
        name: true,
        memberNumber: true,
        employmentStatus: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(count / SIZE)),
    page = Math.min(requested, pages);
  const transactions = await prisma.savingsTransaction.findMany({
    where,
    select: {
      id: true,
      transactionDate: true,
      savingsType: true,
      transactionType: true,
      amount: true,
      periodKey: true,
      member: { select: { name: true, memberNumber: true } },
    },
    orderBy: { transactionDate: "desc" },
    skip: (page - 1) * SIZE,
    take: SIZE,
  });
  const deposits =
      totals
        .find((x) => x.transactionType === "SETORAN")
        ?._sum.amount?.toNumber() ?? 0,
    withdrawals =
      totals
        .find((x) => x.transactionType === "PENARIKAN")
        ?._sum.amount?.toNumber() ?? 0,
    title = type ? `Simpanan ${labels[type]}` : "Semua Simpanan";
  const href = (p: number) => {
    const x = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v && k !== "page" && k !== "success" && k !== "created" && k !== "skipped")
        x.set(k, v);
    });
    x.set("page", String(p));
    return `?${x}`;
  };
  return (
    <>
      <AppSidebar />
      <Topbar
        user={session.user}
        title={title}
        subtitle="Ledger transaksi simpanan anggota"
      />
      <main className="min-h-screen bg-slate-50 px-4 pb-12 pt-24 sm:px-6 lg:ml-[280px] lg:px-10 lg:pt-28">
        {filters.success && (
          <div className="mb-5 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            {filters.success === "batch"
              ? `${Number(filters.created) || 0} transaksi berhasil dicatat.${
                  Number(filters.skipped) > 0
                    ? ` ${Number(filters.skipped)} anggota dilewati karena sudah tercatat.`
                    : ""
                }`
              : "Transaksi berhasil dicatat."}
          </div>
        )}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Stat label="Total Simpanan" value={rupiah(deposits - withdrawals)} />
          <Stat label="Total Setoran" value={rupiah(deposits)} />
          <Stat label="Total Penarikan" value={rupiah(withdrawals)} />
        </section>
        <section className="mt-6 rounded-card bg-white p-7 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Transaksi {title}</h3>
              <p className="text-sm text-slate-500">25 transaksi per halaman</p>
            </div>
            {type === "WAJIB" ? (
              <BulkMandatorySavingsForm members={members} />
            ) : type === "POKOK" ? (
              <div className="flex flex-wrap gap-3">
                <BulkMandatorySavingsForm members={members} kind="POKOK" />
                <SavingsEntryModal type="POKOK" members={members} />
              </div>
            ) : type ? (
              <SavingsEntryModal
                type={type as "POKOK" | "SUKARELA"}
                members={members}
              />
            ) : null}
          </div>
          <form className="mt-6 grid grid-cols-6 gap-3">
            <input
              name="q"
              defaultValue={q}
              className="col-span-2 h-11 rounded-xl border px-4 text-sm"
              placeholder="Cari nama atau nomor anggota"
            />
            <input
              name="from"
              type="date"
              defaultValue={filters.from}
              className="h-11 rounded-xl border px-3 text-sm"
            />
            <input
              name="to"
              type="date"
              defaultValue={filters.to}
              className="h-11 rounded-xl border px-3 text-sm"
            />
            {!type ? (
              <select
                name="savingsType"
                defaultValue={validType ?? ""}
                className="h-11 rounded-xl border px-3 text-sm"
              >
                <option value="">Semua jenis</option>
                <option value="POKOK">Pokok</option>
                <option value="WAJIB">Wajib</option>
                <option value="SUKARELA">Sukarela</option>
              </select>
            ) : (
              <select
                name="transactionType"
                defaultValue={trxType ?? ""}
                className="h-11 rounded-xl border px-3 text-sm"
              >
                <option value="">Semua transaksi</option>
                <option value="SETORAN">Setoran</option>
                <option value="PENARIKAN">Penarikan</option>
              </select>
            )}
            <button className="h-11 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white">
              Terapkan
            </button>
          </form>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-slate-400">
                  <th className="py-4">Anggota</th>
                  <th>Tanggal</th>
                  <th>Jenis</th>
                  <th>Transaksi</th>
                  <th>Periode</th>
                  <th className="text-right">Nominal</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b">
                    <td className="py-4">
                      <b>{t.member.name}</b>
                      <p className="text-xs text-slate-400">
                        {t.member.memberNumber}
                      </p>
                    </td>
                    <td>
                      {new Intl.DateTimeFormat("id-ID").format(
                        t.transactionDate,
                      )}
                    </td>
                    <td>{labels[t.savingsType]}</td>
                    <td>
                      {t.transactionType === "SETORAN"
                        ? "Setoran"
                        : "Penarikan"}
                    </td>
                    <td>{t.periodKey ?? "-"}</td>
                    <td className="text-right font-bold">
                      {rupiah(t.amount.toNumber())}
                    </td>
                  </tr>
                ))}
                {!transactions.length && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-14 text-center text-slate-400"
                    >
                      Belum ada transaksi.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-5 flex justify-between border-t pt-5">
            <p className="text-sm text-slate-500">
              Halaman {page} dari {pages} · {count} transaksi
            </p>
            <div className="flex gap-2">
              <Link
                href={href(page - 1)}
                className={`rounded-lg border px-3 py-2 text-sm ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}
              >
                Sebelumnya
              </Link>
              <Link
                href={href(page + 1)}
                className={`rounded-lg border px-3 py-2 text-sm ${page >= pages ? "pointer-events-none opacity-40" : ""}`}
              >
                Berikutnya
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
