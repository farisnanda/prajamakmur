import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Save } from "lucide-react";
import { updateLanding } from "./actions";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { landingData, mediaUrl } from "@/lib/landing";
const groups = [
  {
    title: "Bagian Atas (Hero)",
    fields: [
      ["badge", "Label di atas judul"],
      ["heroTitle", "Judul utama"],
      ["heroText", "Deskripsi hero"],
      ["primaryLabel", "Teks tombol masuk"],
      ["primaryUrl", "Link tombol masuk"],
    ],
  },
  {
    title: "Keuntungan Anggota",
    fields: [
      ["featureTitle", "Judul bagian"],
      ["featureText", "Deskripsi bagian"],
      ["feature1Title", "Judul kartu Simpanan"],
      ["feature1Text", "Deskripsi kartu Simpanan"],
      ["feature2Title", "Judul kartu Pinjaman (utama)"],
      ["feature2Text", "Deskripsi kartu Pinjaman"],
      ["feature3Title", "Judul kartu Keuangan"],
      ["feature3Text", "Deskripsi kartu Keuangan"],
    ],
  },
  {
    title: "Angka Ringkas",
    fields: [
      ["stat1Value", "Nilai statistik 1"],
      ["stat1Label", "Label statistik 1"],
      ["stat2Value", "Nilai statistik 2"],
      ["stat2Label", "Label statistik 2"],
      ["stat3Value", "Nilai statistik 3"],
      ["stat3Label", "Label statistik 3"],
    ],
  },
  {
    title: "Ajakan Penutup",
    fields: [
      ["ctaTitle", "Judul ajakan"],
      ["ctaText", "Deskripsi ajakan"],
    ],
  },
] as const;
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const s = await getServerSession(authOptions);
  if (!s) redirect("/login");
  if (!["SUPER_ADMIN", "ADMIN_KOPERASI"].includes(s.user.role))
    redirect("/dashboard");
  const q = await searchParams,
    row = await prisma.landingContent.findUnique({ where: { id: "default" } }),
    c = landingData(row?.content);
  return (
    <>
      <AppSidebar />
      <Topbar
        user={s.user}
        title="Pengaturan Landing Page"
        subtitle="Kelola konten halaman publik Praja Makmur"
      />
      <main className="min-h-screen bg-slate-50 px-4 pb-12 pt-24 sm:px-6 lg:ml-[280px] lg:px-10 lg:pt-28">
        {q.success && (
          <div className="mb-5 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            Konten landing page berhasil diperbarui.
          </div>
        )}
        {q.error && (
          <div className="mb-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
            Foto harus berupa JPG, PNG, atau WebP dengan ukuran maksimal 5 MB.
          </div>
        )}
        <SettingsTabs active="landing" />
        <form action={updateLanding} className="space-y-6">
          <section className="rounded-card border border-slate-200/70 bg-white p-5 shadow-sm sm:p-7">
            <h3 className="text-lg font-bold">Foto Showcase</h3>
            <p className="text-sm text-slate-500">
              Kosongkan input jika ingin mempertahankan gambar saat ini.
            </p>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              {(
                [
                  ["showcaseImage2", "Foto bagian Cara Bergabung"],
                  ["ctaImage", "Latar ajakan penutup"],
                  ["feature1Image", "Foto kartu Simpanan"],
                  ["feature3Image", "Foto kartu Keuangan"],
                ] as const
              ).map(([name, label]) => (
                <label
                  key={name}
                  className="rounded-2xl border border-slate-100 p-4 text-sm font-semibold"
                >
                  {label}
                  <div className="mt-3 aspect-[16/8] overflow-hidden rounded-xl bg-slate-100">
                    {c[name] ? (
                      // eslint-disable-next-line @next/next/no-img-element -- CMS media
                      <img
                        src={mediaUrl(c[name])}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-slate-400">
                        Belum ada foto, bagian ini tampil tanpa gambar
                      </div>
                    )}
                  </div>
                  <input
                    name={name}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="mt-3 block w-full text-xs font-normal text-slate-500"
                  />
                  {c[name] && (
                    <span className="mt-3 flex items-center gap-2 text-xs font-normal text-slate-600">
                      <input
                        type="checkbox"
                        name={`remove_${name}`}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      Hapus foto ini
                    </span>
                  )}
                </label>
              ))}
            </div>
          </section>
          {groups.map((group) => (
            <section
              key={group.title}
              className="rounded-card border border-slate-200/70 bg-white p-5 shadow-sm sm:p-7"
            >
              <h3 className="text-lg font-bold">{group.title}</h3>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {group.fields.map(([name, label]) => (
                  <label
                    key={name}
                    className={`text-sm font-semibold text-slate-700 ${name.endsWith("Text") || name === "heroTitle" || name === "featureTitle" || name === "ctaTitle" ? "sm:col-span-2" : ""}`}
                  >
                    {label}
                    {name.endsWith("Text") ? (
                      <textarea
                        name={name}
                        defaultValue={c[name]}
                        rows={3}
                        required
                        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal"
                      />
                    ) : (
                      <input
                        name={name}
                        defaultValue={c[name]}
                        required
                        className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 font-normal"
                      />
                    )}
                  </label>
                ))}
              </div>
            </section>
          ))}
          <div className="sticky bottom-5 flex justify-end">
            <button className="flex h-12 items-center gap-2 rounded-xl bg-blue-600 px-6 font-bold text-white shadow-xl">
              <Save size={18} />
              Simpan Landing Page
            </button>
          </div>
        </form>
      </main>
    </>
  );
}
