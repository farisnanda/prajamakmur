import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Info, Save } from "lucide-react";
import { updateSavingsSetting } from "./actions";
import { fillPrincipalSavings } from "./fill-actions";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
import { authOptions } from "@/lib/auth";
import { missingPrincipalWhere } from "@/lib/principalSavings";
import { prisma } from "@/lib/prisma";

const fields = [
  {
    name: "principalAmount",
    label: "Simpanan pokok",
    hint: "Dibayar sekali saat anggota mendaftar.",
    key: "principalAmount",
    fallback: 500_000,
  },
  {
    name: "mandatoryPnsAmount",
    label: "Simpanan wajib PNS",
    hint: "Dibayar setiap bulan oleh anggota PNS.",
    key: "mandatoryPnsAmount",
    fallback: 300_000,
  },
  {
    name: "mandatoryPppkAmount",
    label: "Simpanan wajib PPPK & Paruh Waktu",
    hint: "Dibayar setiap bulan oleh anggota PPPK dan Paruh Waktu.",
    key: "mandatoryPppkAmount",
    fallback: 200_000,
  },
] as const;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; filled?: string }>;
}) {
  const s = await getServerSession(authOptions);
  if (!s) redirect("/login");
  if (!["SUPER_ADMIN", "ADMIN_KOPERASI"].includes(s.user.role))
    redirect("/dashboard");

  const q = await searchParams;
  const [setting, missingCount] = await Promise.all([
    prisma.savingsSetting.findUnique({ where: { id: "default" } }),
    prisma.member.count({ where: missingPrincipalWhere }),
  ]);
  const principal = setting?.principalAmount.toNumber() ?? 500_000;
  const rupiah = (value: number) => `Rp${value.toLocaleString("id-ID")}`;

  return (
    <>
      <AppSidebar />
      <Topbar
        user={s.user}
        title="Nominal Simpanan"
        subtitle="Atur besar simpanan pokok dan simpanan wajib"
      />
      <main className="min-h-screen bg-slate-50 px-4 pb-12 pt-24 sm:px-6 lg:ml-[280px] lg:px-10 lg:pt-28">
        {q.success && (
          <div className="mb-5 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            Nominal simpanan berhasil disimpan.
          </div>
        )}
        {q.filled !== undefined && (
          <div className="mb-5 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            {Number(q.filled) > 0
              ? `Simpanan pokok dicatat untuk ${Number(q.filled).toLocaleString("id-ID")} anggota aktif.`
              : "Semua anggota aktif sudah memiliki simpanan pokok."}
          </div>
        )}
        {q.error && (
          <div className="mb-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
            Nominal tidak valid. Isi angka bulat antara 0 dan 100.000.000.
          </div>
        )}
        <SettingsTabs active="simpanan" />

        {!setting && (
          <div className="mb-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <Info size={18} className="mt-0.5 shrink-0" />
            <p>
              Nominal simpanan belum pernah disimpan, sehingga pencatatan
              simpanan baru ditolak. Isi dan simpan form ini untuk
              mengaktifkannya.
            </p>
          </div>
        )}

        <form
          action={updateSavingsSetting}
          className="max-w-2xl rounded-card border border-slate-200/70 bg-white p-5 shadow-sm sm:p-7"
        >
          <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
            Besar simpanan anggota
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Nominal ini dipakai saat mencatat simpanan dan ditampilkan di landing
            page.
          </p>

          <div className="mt-6 space-y-5">
            {fields.map((field) => (
              <label key={field.name} className="block text-sm font-semibold text-slate-700">
                {field.label}
                <div className="mt-2 flex h-12 items-center rounded-xl border border-slate-200 bg-white focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-50">
                  <span className="pl-4 text-slate-400">Rp</span>
                  <input
                    name={field.name}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100000000}
                    step={1000}
                    required
                    defaultValue={
                      setting ? Number(setting[field.key]) : field.fallback
                    }
                    className="h-full w-full bg-transparent px-3 font-normal tabular-nums text-slate-900 outline-none"
                  />
                </div>
                <span className="mt-1.5 block text-xs font-normal text-slate-500">
                  {field.hint}
                </span>
              </label>
            ))}
          </div>

          <div className="mt-7 flex justify-end">
            <button className="inline-flex h-12 items-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-blue-700">
              <Save size={18} />
              Simpan Nominal
            </button>
          </div>
        </form>

        <section className="mt-6 max-w-2xl rounded-card border border-slate-200/70 bg-white p-5 shadow-sm sm:p-7">
          <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
            Simpanan pokok anggota aktif
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Anggota baru (tambah manual atau impor) otomatis dicatat memiliki
            simpanan pokok. Gunakan ini untuk mengisi anggota aktif yang belum
            memilikinya.
          </p>

          {missingCount === 0 ? (
            <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              Semua anggota aktif sudah memiliki simpanan pokok.
            </p>
          ) : (
            <form action={fillPrincipalSavings} className="mt-5 space-y-4">
              <dl className="grid gap-4 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Anggota belum punya
                  </dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                    {missingCount.toLocaleString("id-ID")} anggota
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Total yang akan dicatat
                  </dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                    {rupiah(missingCount * principal)}
                  </dd>
                </div>
              </dl>
              <label className="block text-sm font-semibold text-slate-700">
                Masuk ke kas
                <select
                  name="channel"
                  defaultValue="BANK"
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal text-slate-900"
                >
                  <option value="BANK">Kas Umum – Rekening Bank</option>
                  <option value="TUNAI">Kas Umum – Uang Tunai</option>
                </select>
              </label>
              <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <input type="checkbox" name="confirm" required className="mt-0.5 h-4 w-4" />
                <span>
                  Saya mengerti saldo kas bertambah {rupiah(missingCount * principal)}{" "}
                  dan jurnal pembukuan dibuat untuk {missingCount.toLocaleString("id-ID")}{" "}
                  anggota. Tindakan ini tidak bisa dibatalkan sekaligus.
                </span>
              </label>
              <button className="inline-flex h-12 items-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-blue-700">
                Catat simpanan pokok {missingCount.toLocaleString("id-ID")} anggota
              </button>
            </form>
          )}
        </section>
      </main>
    </>
  );
}
