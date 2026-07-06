import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { WithdrawalRequestForm } from "@/components/savings/WithdrawalRequestForm";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
const rp = (v: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "ANGGOTA") redirect("/simpanan/sukarela/penarikan");
  const q = await searchParams;
  const member = await prisma.member.findFirst({
    where: { user: { id: session.user.id } },
    include: { withdrawalRequests: { orderBy: { createdAt: "desc" } } },
  });
  if (!member) redirect("/dashboard");
  const totals = await prisma.savingsTransaction.groupBy({
    by: ["transactionType"],
    where: { memberId: member.id, savingsType: "SUKARELA" },
    _sum: { amount: true },
  });
  const saldo =
    (totals
      .find((x) => x.transactionType === "SETORAN")
      ?._sum.amount?.toNumber() ?? 0) -
    (totals
      .find((x) => x.transactionType === "PENARIKAN")
      ?._sum.amount?.toNumber() ?? 0);
  const pending = member.withdrawalRequests
    .filter((x) => x.status === "SUBMITTED")
    .reduce((s, x) => s + x.amount.toNumber(), 0);
  const available = Math.max(0, saldo - pending);
  return (
    <>
      <AppSidebar />
      <Topbar
        user={session.user}
        title="Penarikan Simpanan Sukarela"
        subtitle="Ajukan dan pantau transfer penarikan Anda"
      />
      <main className="ml-[280px] min-h-screen bg-slate-50 px-8 pb-10 pt-32">
        {q.success && (
          <div className="mb-5 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            Pengajuan penarikan berhasil dikirim.
          </div>
        )}
        {q.error && (
          <div className="mb-5 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">
            {q.error === "balance"
              ? "Saldo tersedia tidak mencukupi."
              : "Data pengajuan tidak valid."}
          </div>
        )}
        <section className="grid grid-cols-3 gap-5">
          <Stat l="Saldo Sukarela" v={rp(saldo)} />
          <Stat l="Menunggu Transfer" v={rp(pending)} />
          <Stat l="Dapat Ditarik" v={rp(available)} />
        </section>
        <section className="mt-6 grid grid-cols-2 gap-6">
          <div className="rounded-[28px] bg-white p-7 shadow-sm">
            <h3 className="text-lg font-bold">Ajukan Penarikan</h3>
            <p className="mb-6 text-sm text-slate-500">
              Dana akan diverifikasi dan ditransfer Bendahara.
            </p>
            <WithdrawalRequestForm max={available} />
          </div>
          <div className="rounded-[28px] bg-white p-7 shadow-sm">
            <h3 className="text-lg font-bold">Riwayat Penarikan</h3>
            <div className="mt-5 space-y-3">
              {member.withdrawalRequests.map((r) => (
                <div key={r.id} className="rounded-2xl border p-4">
                  <div className="flex justify-between">
                    <div>
                      <b>{rp(r.amount.toNumber())}</b>
                      <p className="text-xs text-slate-500">
                        {r.requestNumber}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${r.status === "TRANSFERRED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                    >
                      {r.status === "TRANSFERRED"
                        ? "Sudah Ditransfer"
                        : "Menunggu Bendahara"}
                    </span>
                  </div>
                  {r.transferReference && (
                    <p className="mt-2 text-xs text-slate-500">
                      Ref: {r.transferReference}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
function Stat({ l, v }: { l: string; v: string }) {
  return (
    <div className="rounded-[24px] bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-500">{l}</p>
      <p className="mt-2 text-2xl font-bold">{v}</p>
    </div>
  );
}
