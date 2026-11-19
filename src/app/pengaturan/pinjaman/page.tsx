import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Info } from "lucide-react";
import { rebalanceLoans } from "./actions";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
import { authOptions } from "@/lib/auth";
import { planRebalance } from "@/lib/loanRebalance";
import { prisma } from "@/lib/prisma";

const rupiah = (value: number) =>
  `${value < 0 ? "-" : ""}Rp${Math.abs(Math.round(value)).toLocaleString("id-ID")}`;
const date = (value: Date) =>
  new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(value);

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (!["SUPER_ADMIN", "ADMIN_KOPERASI"].includes(session.user.role))
    redirect("/dashboard");

  const q = await searchParams;
  const plan = await planRebalance(prisma);
  const interestShift = plan.changes.reduce(
    (sum, change) => sum + (change.newInterest - change.oldInterest),
    0,
  );
  const preview = plan.changes.slice(0, 10);

  return (
    <>
      <AppSidebar />
      <Topbar
        user={session.user}
        title="Aturan Pinjaman"
        subtitle="Pembagian bunga dan pokok pada angsuran"
      />
      <main className="min-h-screen bg-slate-50 px-4 pb-12 pt-24 sm:px-6 lg:ml-[280px] lg:px-10 lg:pt-28">
        {q.done !== undefined && (
          <div className="mb-5 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            {Number(q.done) > 0
              ? `${Number(q.done).toLocaleString("id-ID")} angsuran berhasil dihitung ulang.`
              : "Semua angsuran sudah sesuai aturan."}
          </div>
        )}
        {q.error === "confirm" && (
          <div className="mb-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
            Centang konfirmasi terlebih dahulu.
          </div>
        )}
        <SettingsTabs active="pinjaman" />

        <section className="max-w-3xl rounded-card border border-slate-200/70 bg-white p-5 shadow-sm sm:p-7">
          <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
            Bunga dibayar lebih dulu
          </h3>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
            <li>• Cicilan per bulan tetap sama dengan hasil simulasi anuitas.</li>
            <li>
              • Seluruh bunga (cicilan × tenor − pokok) dibayar lebih dulu dari
              cicilan-cicilan awal. Jika satu cicilan belum cukup, bulan berikutnya ikut dipakai.
            </li>
            <li>• Sisa cicilan setelah bunga lunas mengurangi pokok. Cicilan berikutnya seluruhnya masuk ke pokok.</li>
          </ul>
          <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Contoh: pinjaman Rp50.000.000, 20 bulan, cicilan Rp2.724.496. Total bunga
            Rp4.489.920. Bulan 1: bunga Rp2.724.496. Bulan 2: bunga Rp1.765.424 dan pokok Rp959.072.
          </p>
        </section>

        <section className="mt-6 max-w-3xl rounded-card border border-slate-200/70 bg-white p-5 shadow-sm sm:p-7">
          <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
            Hitung ulang angsuran yang sudah tercatat
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Menyesuaikan pembagian bunga dan pokok pada angsuran pinjaman anggota yang sudah ada
            dengan aturan di atas.
          </p>

          {plan.changes.length === 0 ? (
            <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              Semua angsuran ({plan.totalLoans.toLocaleString("id-ID")} pinjaman diperiksa) sudah sesuai aturan.
            </p>
          ) : (
            <form action={rebalanceLoans} className="mt-5 space-y-4">
              <dl className="grid gap-4 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-3">
                <Cell label="Pinjaman terdampak" value={plan.loanCount.toLocaleString("id-ID")} />
                <Cell label="Angsuran berubah" value={plan.changes.length.toLocaleString("id-ID")} />
                <Cell
                  label="Pendapatan bunga tercatat"
                  value={`${interestShift >= 0 ? "+" : ""}${rupiah(interestShift)}`}
                />
              </dl>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
                      <th className="py-3">Anggota</th>
                      <th>Angsuran</th>
                      <th className="text-right">Bunga</th>
                      <th className="text-right">Pokok</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((change) => (
                      <tr key={change.paymentId} className="border-b border-slate-50 text-slate-600">
                        <td className="py-3">
                          <p className="font-semibold text-slate-900">{change.memberName}</p>
                          <p className="text-xs text-slate-400">{change.loanNumber}</p>
                        </td>
                        <td>
                          ke-{change.installmentNumber}
                          <p className="text-xs text-slate-400">{date(change.paymentDate)}</p>
                        </td>
                        <td className="text-right tabular-nums">
                          {rupiah(change.oldInterest)} → <b className="text-slate-900">{rupiah(change.newInterest)}</b>
                        </td>
                        <td className="text-right tabular-nums">
                          {rupiah(change.oldPrincipal)} → <b className="text-slate-900">{rupiah(change.newPrincipal)}</b>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {plan.changes.length > preview.length && (
                  <p className="mt-2 text-xs text-slate-400">
                    Menampilkan {preview.length} dari {plan.changes.length} angsuran yang akan berubah.
                  </p>
                )}
              </div>

              <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <Info size={18} className="mt-0.5 shrink-0" />
                <p>
                  Total uang yang dibayar anggota dan saldo kas <b>tidak berubah</b>. Yang berubah:
                  pembagian bunga dan pokok per angsuran, pendapatan bunga di Hasil Usaha, serta
                  rincian kas (pokok dan bunga). Angsuran hasil migrasi hanya diubah pembagiannya.
                  Backup database dahulu.
                </p>
              </div>
              <label className="flex items-start gap-3 text-sm text-slate-700">
                <input type="checkbox" name="confirm" required className="mt-0.5 h-4 w-4" />
                <span>
                  Saya mengerti {plan.changes.length.toLocaleString("id-ID")} angsuran akan dihitung ulang dan
                  laporan pendapatan bunga periode lalu ikut berubah.
                </span>
              </label>
              <button className="inline-flex h-12 items-center rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-blue-700">
                Hitung ulang {plan.changes.length.toLocaleString("id-ID")} angsuran
              </button>
            </form>
          )}
        </section>
      </main>
    </>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{value}</dd>
    </div>
  );
}
