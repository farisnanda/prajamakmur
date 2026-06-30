import {
  Landmark,
  PieChart,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { authOptions } from "@/lib/auth";

const stats = [
  {
    title: "Total Anggota",
    value: "200",
    desc: "Anggota aktif koperasi",
    icon: Users,
  },
  {
    title: "Total Simpanan",
    value: "Rp425.000.000",
    desc: "+8,2% bulan ini",
    icon: Wallet,
  },
  {
    title: "Pinjaman Berjalan",
    value: "Rp312.500.000",
    desc: "48 pinjaman aktif",
    icon: Landmark,
  },
  {
    title: "SHU Berjalan",
    value: "Rp38.750.000",
    desc: "Estimasi tahun ini",
    icon: PieChart,
  },
];

const transactions = [
  ["Simpanan Wajib", "Budi Santoso", "Rp100.000", "Berhasil"],
  ["Angsuran Pinjaman", "Siti Aminah", "Rp750.000", "Berhasil"],
  ["Simpanan Sukarela", "Ahmad Fauzi", "Rp500.000", "Berhasil"],
  ["Pengajuan Pinjaman", "Dewi Lestari", "Rp10.000.000", "Menunggu"],
];

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <>
      <AppSidebar />
      <Topbar user={session.user} />

      <main className="ml-[280px] min-h-screen bg-slate-50 px-8 pb-10 pt-32">
        <section className="grid grid-cols-4 gap-6">
          {stats.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm"
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Icon size={28} />
                </div>
                <p className="text-sm font-medium text-slate-500">
                  {item.title}
                </p>
                <h3 className="mt-2 text-2xl font-bold text-slate-900">
                  {item.value}
                </h3>
                <p className="mt-2 text-sm text-blue-600">{item.desc}</p>
              </div>
            );
          })}
        </section>

        <section className="mt-6 grid grid-cols-12 gap-6">
          <div className="col-span-8 rounded-[28px] border border-slate-100 bg-white p-7 shadow-sm">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Grafik Simpanan Bulanan
                </h3>
                <p className="text-sm text-slate-500">
                  Perkembangan simpanan tahun berjalan
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
                <TrendingUp size={18} />
                +12.5%
              </div>
            </div>

            <div className="flex h-72 items-end gap-5">
              {[45, 62, 38, 74, 55, 80, 67, 72, 58, 84, 76, 90].map(
                (height, index) => (
                  <div
                    key={index}
                    className="flex flex-1 flex-col items-center gap-3"
                  >
                    <div className="relative h-56 w-full rounded-full bg-slate-100">
                      <div
                        className="absolute bottom-0 w-full rounded-full bg-blue-600"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-400">
                      {index + 1}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="col-span-4 rounded-[28px] border border-slate-100 bg-white p-7 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">
              Komposisi Dana
            </h3>
            <p className="text-sm text-slate-500">Simpanan dan pinjaman</p>

            <div className="mt-8 rounded-3xl bg-blue-600 p-6 text-white">
              <p className="text-sm text-blue-100">Saldo Kas Tersedia</p>
              <h4 className="mt-2 text-3xl font-bold">Rp112.450.000</h4>
              <p className="mt-4 text-sm text-blue-100">
                Dana likuid koperasi bulan ini
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Simpanan Pokok</span>
                <b>25%</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Simpanan Wajib</span>
                <b>45%</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Simpanan Sukarela</span>
                <b>30%</b>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[28px] border border-slate-100 bg-white p-7 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Transaksi Terbaru
              </h3>
              <p className="text-sm text-slate-500">
                Aktivitas keuangan terakhir
              </p>
            </div>
            <button className="rounded-2xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
              Lihat Semua
            </button>
          </div>

          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400">
                <th className="py-4">Jenis</th>
                <th>Anggota</th>
                <th>Nominal</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((trx) => (
                <tr key={`${trx[0]}-${trx[1]}`} className="border-b border-slate-50">
                  <td className="py-4 font-semibold text-slate-700">{trx[0]}</td>
                  <td className="text-slate-600">{trx[1]}</td>
                  <td className="font-bold text-slate-900">{trx[2]}</td>
                  <td>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                      {trx[3]}
                    </span>
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
