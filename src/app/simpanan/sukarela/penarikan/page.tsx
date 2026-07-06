import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { markWithdrawalTransferred } from "./actions";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
const rp = (v: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);
const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
  .toISOString()
  .slice(0, 10);
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (
    !["BENDAHARA", "ADMIN_KOPERASI", "SUPER_ADMIN"].includes(session.user.role)
  )
    redirect("/dashboard");
  const q = await searchParams;
  const requests = await prisma.savingsWithdrawalRequest.findMany({
    include: { member: { select: { name: true, memberNumber: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <>
      <AppSidebar />
      <Topbar
        user={session.user}
        title="Verifikasi Penarikan Sukarela"
        subtitle="Verifikasi transfer dan catat pembukuan otomatis"
      />
      <main className="ml-[280px] min-h-screen bg-slate-50 px-8 pb-10 pt-32">
        {q.success && (
          <div className="mb-5 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            Transfer, transaksi, dan jurnal pembukuan berhasil dicatat.
          </div>
        )}
        <section className="rounded-[28px] bg-white p-7 shadow-sm">
          <h3 className="text-lg font-bold">Daftar Pengajuan Penarikan</h3>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-slate-400">
                  <th className="py-4">Anggota</th>
                  <th>Nominal</th>
                  <th>Rekening</th>
                  <th>Status</th>
                  <th className="text-right">Transfer</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b align-top">
                    <td className="py-4">
                      <b>{r.member.name}</b>
                      <p className="text-xs text-slate-500">
                        {r.member.memberNumber} · {r.requestNumber}
                      </p>
                    </td>
                    <td className="py-4 font-bold">
                      {rp(r.amount.toNumber())}
                    </td>
                    <td className="py-4">
                      {r.bankName} · {r.accountNumber}
                      <p className="text-xs text-slate-500">
                        {r.accountHolder}
                      </p>
                    </td>
                    <td className="py-4">
                      {r.status === "TRANSFERRED"
                        ? "Sudah Ditransfer"
                        : "Menunggu"}
                    </td>
                    <td className="py-4 text-right">
                      {r.status === "SUBMITTED" ? (
                        <form
                          data-financial-transaction
                          action={markWithdrawalTransferred}
                          className="inline-flex gap-2"
                        >
                          <input type="hidden" name="requestId" value={r.id} />
                          <input
                            name="transferReference"
                            required
                            className="h-9 rounded-lg border px-3 text-xs text-slate-900"
                            placeholder="Referensi transfer"
                          />
                          <input
                            name="transferDate"
                            type="date"
                            defaultValue={today}
                            required
                            className="h-9 rounded-lg border px-2 text-xs text-slate-900"
                          />
                          <button className="h-9 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white">
                            Sudah Ditransfer
                          </button>
                        </form>
                      ) : (
                        <span className="text-xs text-slate-500">
                          {r.transferReference}
                        </span>
                      )}
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
