import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Save } from "lucide-react";
import Link from "next/link";
import { updateLanding } from "./actions";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { landingData, mediaUrl } from "@/lib/landing";
const groups = [
  {
    title: "Hero",
    fields: [
      ["badge", "Label kecil"],
      ["heroTitle", "Judul utama"],
      ["heroText", "Deskripsi hero"],
      ["primaryLabel", "Teks tombol utama"],
      ["primaryUrl", "Link tombol utama"],
      ["secondaryLabel", "Teks tombol kedua"],
      ["secondaryUrl", "Link tombol kedua"],
    ],
  },
  {
    title: "Bagian Layanan",
    fields: [
      ["featureTitle", "Judul bagian"],
      ["featureText", "Deskripsi bagian"],
      ["feature1Title", "Fitur 1"],
      ["feature1Text", "Deskripsi fitur 1"],
      ["feature2Title", "Fitur 2"],
      ["feature2Text", "Deskripsi fitur 2"],
      ["feature3Title", "Fitur 3"],
      ["feature3Text", "Deskripsi fitur 3"],
    ],
  },
  {
    title: "Statistik",
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
    title: "CTA Penutup",
    fields: [
      ["ctaTitle", "Judul CTA"],
      ["ctaText", "Deskripsi CTA"],
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
      <main className="ml-[280px] min-h-screen bg-slate-50 px-8 pb-10 pt-32">
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
        <div className="mb-6 flex gap-3">
          <span className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">
            Konten Landing
          </span>
          <Link
            href="/pengaturan/berita"
            className="rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-600"
          >
            Berita & Kegiatan
          </Link>
          <Link
            href="/pengaturan/akun"
            className="rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-600"
          >
            Pengaturan Akun
          </Link>
        </div>
        <form action={updateLanding} className="space-y-6">
          <section className="rounded-[28px] border border-slate-100 bg-white p-7 shadow-sm">
            <h3 className="text-lg font-bold">Foto Showcase</h3>
            <p className="text-sm text-slate-500">
              Kosongkan input jika ingin mempertahankan gambar saat ini.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-5">
              {(
                [
                  ["heroImage", "Kotak Ringkasan Anggota di Hero"],
                  [
                    "showcaseImage1",
                    "Kotak Kondisi Keuangan — Transparan & Terukur",
                  ],
                  ["showcaseImage2", "Kotak Proses — Satu Akun & Satu Saldo"],
                  ["ctaImage", "Latar CTA"],
                  ["feature1Image", "Foto Kartu Fitur Simpanan (bagian gelap)"],
                  ["feature2Image", "Foto Kartu Fitur Pinjaman (bagian gelap)"],
                  ["feature3Image", "Foto Kartu Fitur Keuangan (bagian gelap)"],
                ] as const
              ).map(([name, label]) => (
                <label
                  key={name}
                  className="rounded-2xl border border-slate-100 p-4 text-sm font-semibold"
                >
                  {label}
                  <div className="mt-3 aspect-[16/8] overflow-hidden rounded-xl bg-slate-100">
                    {c[name] ? (
                      <img
                        src={mediaUrl(c[name])}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-slate-400">
                        Menggunakan visual bawaan
                      </div>
                    )}
                  </div>
                  <input
                    name={name}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="mt-3 block w-full text-xs font-normal text-slate-500"
                  />
                </label>
              ))}
            </div>
          </section>
          {groups.map((group) => (
            <section
              key={group.title}
              className="rounded-[28px] border border-slate-100 bg-white p-7 shadow-sm"
            >
              <h3 className="text-lg font-bold">{group.title}</h3>
              <div className="mt-5 grid grid-cols-2 gap-4">
                {group.fields.map(([name, label]) => (
                  <label
                    key={name}
                    className={`text-sm font-semibold text-slate-700 ${name.endsWith("Text") || name === "heroTitle" || name === "featureTitle" || name === "ctaTitle" ? "col-span-2" : ""}`}
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
