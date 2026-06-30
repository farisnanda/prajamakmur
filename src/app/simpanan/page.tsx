import { ArrowDownLeft, ArrowUpRight, Landmark, Wallet } from "lucide-react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { BulkMandatorySavingsForm } from "@/components/savings/BulkMandatorySavingsForm";
import { SavingsForm } from "@/components/savings/SavingsForm";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const typeLabels = { POKOK: "Pokok", WAJIB: "Wajib", SUKARELA: "Sukarela" };
const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export default async function SavingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; created?: string; skipped?: string; period?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const query = await searchParams;

  const [members, transactions, totals, setting] = await Promise.all([
    prisma.member.findMany({
      where: { isActive: true },
      select: { id: true, memberNumber: true, name: true, employmentStatus: true },
      orderBy: { name: "asc" },
    }),
    prisma.savingsTransaction.findMany({
      include: { member: { select: { name: true, memberNumber: true } } },
      orderBy: { transactionDate: "desc" },
      take: 50,
    }),
    prisma.savingsTransaction.groupBy({
      by: ["savingsType", "transactionType"],
      _sum: { amount: true },
    }),
    prisma.savingsSetting.findUnique({ where: { id: "default" } }),
  ]);

  const balance = (type: "POKOK" | "WAJIB" | "SUKARELA") => {
    const deposits = totals.find((t) => t.savingsType === type && t.transactionType === "SETORAN")?._sum.amount?.toNumber() ?? 0;
    const withdrawals = totals.find((t) => t.savingsType === type && t.transactionType === "PENARIKAN")?._sum.amount?.toNumber() ?? 0;
    return deposits - withdrawals;
  };

  return (
    <>
      <AppSidebar />
      <Topbar user={session.user} title="Simpanan" subtitle="Kelola setoran dan penarikan anggota" />
      <main className="ml-[280px] min-h-screen bg-slate-50 px-8 pb-10 pt-32">
        {query.success === "created" && (
          <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
            Transaksi simpanan berhasil dicatat.
          </div>
        )}
        {query.success === "batch" && (
          <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
            {query.created ?? "0"} transaksi Simpanan Wajib periode {query.period ?? "-"} berhasil dicatat. {query.skipped ?? "0"} anggota dilewati karena sudah tercatat.
          </div>
        )}

        <section className="grid grid-cols-3 gap-5">
          <Summary
            title="Simpanan Pokok"
            amount={balance("POKOK")}
            note={`Ketentuan ${rupiah(setting?.principalAmount.toNumber() ?? 500000)}`}
            icon={Landmark}
          />
          <Summary
            title="Simpanan Wajib"
            amount={balance("WAJIB")}
            note={`PNS ${rupiah(setting?.mandatoryPnsAmount?.toNumber() ?? 300000)} · PPPK ${rupiah(setting?.mandatoryPppkAmount?.toNumber() ?? 200000)}`}
            icon={Wallet}
          />
          <Summary title="Simpanan Sukarela" amount={balance("SUKARELA")} note="Saldo dapat ditarik" icon={Wallet} />
        </section>

        <section className="mt-6 grid grid-cols-12 gap-6">
          <div className="col-span-5 rounded-[28px] border border-slate-100 bg-white p-7 shadow-sm">
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Catat Transaksi</h3>
                <p className="text-sm text-slate-500">Setoran pokok, wajib, sukarela, atau penarikan sukarela</p>
              </div>
              <BulkMandatorySavingsForm members={members} />
            </div>
            {!members.length && (
              <p className="mb-5 rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-700">
                Tambahkan anggota aktif terlebih dahulu.
              </p>
            )}
            <SavingsForm members={members} />
          </div>

          <div className="col-span-7 rounded-[28px] border border-slate-100 bg-white p-7 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Transaksi Terbaru</h3>
            <p className="text-sm text-slate-500">50 transaksi simpanan terakhir</p>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase text-slate-400">
                    <th className="py-4">Anggota</th>
                    <th>Jenis</th>
                    <th>Transaksi</th>
                    <th className="text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((trx) => (
                    <tr key={trx.id} className="border-b border-slate-50">
                      <td className="py-4">
                        <p className="font-bold text-slate-800">{trx.member.name}</p>
                        <p className="text-xs text-slate-400">
                          {trx.member.memberNumber} · {new Intl.DateTimeFormat("id-ID").format(trx.transactionDate)}
                        </p>
                      </td>
                      <td>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                          {typeLabels[trx.savingsType]}
                        </span>
                      </td>
                      <td>
                        <span className={`inline-flex items-center gap-1 text-xs font-bold ${trx.transactionType === "SETORAN" ? "text-emerald-600" : "text-orange-600"}`}>
                          {trx.transactionType === "SETORAN" ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                          {trx.transactionType === "SETORAN" ? "Setoran" : "Penarikan"}
                        </span>
                      </td>
                      <td className="text-right font-bold text-slate-900">{rupiah(trx.amount.toNumber())}</td>
                    </tr>
                  ))}
                  {!transactions.length && (
                    <tr>
                      <td colSpan={4} className="py-16 text-center text-slate-400">
                        Belum ada transaksi simpanan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function Summary({
  title,
  amount,
  note,
  icon: Icon,
}: {
  title: string;
  amount: number;
  note: string;
  icon: typeof Wallet;
}) {
  return (
    <div className="rounded-[24px] border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{rupiah(amount)}</p>
          <p className="mt-2 text-xs font-semibold text-blue-600">{note}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <Icon size={23} />
        </div>
      </div>
    </div>
  );
}
