import Link from "next/link";
import {
  ArrowRight,
  Activity,
  BarChart3,
  CheckCircle2,
  Landmark,
  LockKeyhole,
  Wallet,
  ShieldCheck,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { landingData, mediaUrl } from "@/lib/landing";
export default async function Home() {
  const [row, news] = await Promise.all([
    prisma.landingContent.findUnique({ where: { id: "default" } }),
    prisma.newsPost.findMany({
      where: { isPublished: true },
      orderBy: { eventDate: "desc" },
      take: 3,
    }),
  ]);
  const c = landingData(row?.content);
  const features = [
    [Wallet, c.feature1Title, c.feature1Text, c.feature1Image],
    [Landmark, c.feature2Title, c.feature2Text, c.feature2Image],
    [BarChart3, c.feature3Title, c.feature3Text, c.feature3Image],
  ] as const;
  return (
    <main className="landing-page min-h-screen overflow-hidden bg-white text-slate-950">
      <header className="relative z-20 mx-auto flex h-24 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 font-bold text-white">
            PM
          </span>
          <span>
            <b className="block text-lg">Praja Makmur</b>
            <small className="text-slate-500">Koperasi Digital</small>
          </span>
        </Link>
        <nav className="hidden gap-8 text-sm font-semibold text-slate-600 md:flex">
          <a href="#layanan">Layanan</a>
          <a href="#keunggulan">Keunggulan</a>
          <a href="#tentang">Tentang</a>
        </nav>
        <Link
          href="/login"
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white"
        >
          Masuk <ArrowRight className="ml-1 inline" size={16} />
        </Link>
      </header>
      <section className="relative px-6 pb-24 pt-16">
        <div className="absolute inset-x-0 top-0 -z-10 h-[650px] bg-[radial-gradient(circle_at_75%_20%,#dbeafe,transparent_38%),radial-gradient(circle_at_20%_45%,#eff6ff,transparent_42%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">
          <div>
            <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-blue-700">
              {c.badge}
            </span>
            <h1 className="mt-7 text-5xl font-black leading-[1.08] tracking-tight sm:text-6xl">
              {c.heroTitle}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              {c.heroText}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={c.primaryUrl}
                className="rounded-2xl bg-blue-600 px-6 py-4 font-bold text-white shadow-xl shadow-blue-600/20"
              >
                {c.primaryLabel}
              </Link>
              <Link
                href={c.secondaryUrl}
                className="rounded-2xl border border-slate-200 bg-white px-6 py-4 font-bold text-slate-700"
              >
                {c.secondaryLabel}
              </Link>
            </div>
            <div className="mt-8 flex gap-5 text-sm text-slate-500">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="text-emerald-500" size={18} />
                Transparan
              </span>
              <span className="flex items-center gap-2">
                <LockKeyhole className="text-emerald-500" size={18} />
                Aman
              </span>
            </div>
          </div>
          <div className="relative">
            {c.heroImage && (
              <img
                src={mediaUrl(c.heroImage)}
                alt="Showcase Praja Makmur"
                className="absolute inset-0 z-10 h-full w-full rounded-[32px] object-cover shadow-2xl"
              />
            )}
            <div className="absolute -inset-8 -z-10 rotate-3 rounded-[50px] bg-blue-200/50" />
            <div className="landing-float rounded-[32px] border border-blue-100 bg-white p-6 shadow-2xl shadow-blue-900/15">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-slate-500">Ringkasan Anggota</p>
                  <p className="mt-1 text-2xl font-bold">Keuangan Anda</p>
                </div>
                <span className="h-10 rounded-xl bg-blue-50 px-4 py-3 text-xs font-bold text-blue-700">
                  Real-time
                </span>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <Mock
                  label="Total Simpanan"
                  value="Rp 12.500.000"
                  color="blue"
                />
                <Mock
                  label="Limit Tersedia"
                  value="Rp 40.000.000"
                  color="emerald"
                />
              </div>
              <div className="mt-4 rounded-2xl bg-slate-50 p-5">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-slate-500">
                      Perkembangan simpanan
                    </p>
                    <p className="mt-1 font-bold text-emerald-600">+18,4%</p>
                  </div>
                  <div className="flex h-24 items-end gap-2">
                    {[35, 50, 42, 67, 58, 80, 72, 92].map((h, i) => (
                      <i
                        key={i}
                        className="w-4 rounded-t bg-blue-500"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section id="layanan" className="bg-slate-950 px-6 py-24 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-widest text-blue-400">
              Layanan terintegrasi
            </p>
            <h2 className="mt-4 text-4xl font-black">{c.featureTitle}</h2>
            <p className="mt-4 leading-7 text-slate-400">{c.featureText}</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {features.map(([Icon, t, d, image], i) => (
              <article
                key={t}
                className="landing-card overflow-hidden rounded-[28px] border border-white/10 bg-white/5"
              >
                {image && (
                  <img
                    src={mediaUrl(image)}
                    alt={t}
                    className="aspect-[16/9] w-full object-cover"
                  />
                )}
                <div className="p-7">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600">
                    <Icon />
                  </span>
                  <p className="mt-8 text-xs font-bold text-blue-400">
                    0{i + 1}
                  </p>
                  <h3 className="mt-2 text-xl font-bold">{t}</h3>
                  <p className="mt-3 leading-7 text-slate-400">{d}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="px-6 py-28">
        <div className="landing-container mx-auto max-w-7xl space-y-24">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-blue-600">
                Semua data dalam satu tempat
              </p>
              <h2 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
                Pantau kesehatan koperasi tanpa laporan yang tercecer
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Simpanan, pinjaman, arus kas, dan hasil usaha saling terhubung.
                Pengurus mendapatkan gambaran yang utuh, sementara anggota tetap
                mengetahui posisi keuangannya.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <MiniFeature
                  icon={Activity}
                  title="Data real-time"
                  text="Perubahan transaksi langsung memperbarui ringkasan."
                />
                <MiniFeature
                  icon={ShieldCheck}
                  title="Jejak audit"
                  text="Setiap transaksi tercatat dan dapat ditelusuri."
                />
              </div>
            </div>
            <div className="relative min-h-[430px] overflow-hidden rounded-[36px] bg-blue-50 p-6 md:p-10">
              {c.showcaseImage1 && (
                <div className="absolute inset-6 z-20 flex items-center justify-center overflow-hidden rounded-[28px] bg-white p-3 shadow-2xl shadow-blue-900/15 md:inset-10">
                  <img
                    src={mediaUrl(c.showcaseImage1)}
                    alt="Showcase keuangan koperasi"
                    className="block max-h-full max-w-full rounded-2xl object-contain"
                  />
                </div>
              )}
              <span className="landing-orbit absolute -right-5 -top-5 h-20 w-20 rounded-full bg-cyan-300/70 blur-sm" />
              <div className="rounded-[28px] bg-white p-6 shadow-2xl shadow-blue-900/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Kondisi Keuangan
                    </p>
                    <p className="mt-2 text-2xl font-black">
                      Transparan & terukur
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                    Sehat
                  </span>
                </div>
                <div className="mt-7 grid grid-cols-3 gap-3">
                  {[
                    ["Kas", "Rp 840 jt"],
                    ["Simpanan", "Rp 620 jt"],
                    ["Anggota", "238"],
                  ].map(([l, v]) => (
                    <div key={l} className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-400">{l}</p>
                      <p className="mt-1 font-bold">{v}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex h-40 items-end gap-3 rounded-2xl bg-slate-950 p-5">
                  {[42, 60, 50, 76, 63, 88, 72, 96].map((h, i) => (
                    <i
                      key={i}
                      className="flex-1 rounded-t-lg bg-gradient-to-t from-blue-700 to-cyan-300"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="grid items-center gap-14 lg:grid-cols-2">
            <div className="relative order-2 min-h-[410px] overflow-hidden rounded-[36px] bg-slate-950 p-7 text-white lg:order-1">
              {c.showcaseImage2 ? (
                <div className="flex min-h-[354px] items-center justify-center overflow-hidden rounded-[28px] bg-slate-900 p-3 shadow-2xl shadow-black/30">
                  <img
                    src={mediaUrl(c.showcaseImage2)}
                    alt="Showcase kegiatan koperasi"
                    className="block max-h-full max-w-full rounded-2xl object-contain"
                  />
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="landing-card rounded-3xl bg-blue-600 p-6">
                    <Users />
                    <p className="mt-8 text-3xl font-black">Satu akun</p>
                    <p className="mt-2 text-sm text-blue-100">
                      Akses sesuai peran anggota dan pengurus.
                    </p>
                  </div>
                  <div className="landing-card rounded-3xl bg-white/10 p-6">
                    <Wallet />
                    <p className="mt-8 text-3xl font-black">Satu saldo</p>
                    <p className="mt-2 text-sm text-slate-300">
                      Kas dan transaksi tersambung otomatis.
                    </p>
                  </div>
                  <div className="landing-shine col-span-full rounded-3xl bg-gradient-to-r from-cyan-400 to-blue-500 p-6 text-blue-950">
                    <p className="text-sm font-bold uppercase tracking-wider">
                      Bekerja lebih cepat
                    </p>
                    <p className="mt-2 text-2xl font-black">
                      Kurangi pencatatan berulang, tingkatkan kepercayaan
                      anggota.
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="order-1 lg:order-2">
              <p className="text-sm font-bold uppercase tracking-widest text-blue-600">
                Dibuat untuk koperasi
              </p>
              <h2 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
                Proses sederhana untuk semua peran
              </h2>
              <div className="mt-8 space-y-5">
                {[
                  [
                    "01",
                    "Catat transaksi",
                    "Pengurus mencatat simpanan dan pembayaran secara terstruktur.",
                  ],
                  [
                    "02",
                    "Persetujuan berjenjang",
                    "Pinjaman melewati Bendahara, Ketua, lalu pencairan Admin.",
                  ],
                  [
                    "03",
                    "Pantau hasilnya",
                    "Anggota dan pengurus melihat status serta riwayat secara mandiri.",
                  ],
                ].map(([n, t, d]) => (
                  <div key={n} className="flex gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-sm font-black text-blue-700">
                      {n}
                    </span>
                    <div>
                      <h3 className="font-bold">{t}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        {d}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      <section id="keunggulan" className="px-6 py-24">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
          {[
            [c.stat1Value, c.stat1Label],
            [c.stat2Value, c.stat2Label],
            [c.stat3Value, c.stat3Label],
          ].map(([v, l]) => (
            <div
              key={l}
              className="landing-card rounded-[28px] border border-blue-100 bg-blue-50 p-8 text-center"
            >
              <p className="text-4xl font-black text-blue-700">{v}</p>
              <p className="mt-2 font-semibold text-slate-600">{l}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="bg-slate-50 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-blue-600">
                Berita & kegiatan
              </p>
              <h2 className="mt-3 text-4xl font-black">
                Kabar terbaru Praja Makmur
              </h2>
              <p className="mt-3 text-slate-500">
                Ikuti kegiatan dan perkembangan koperasi bersama anggota.
              </p>
            </div>
          </div>
          {news.length ? (
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {news.map((post) => (
                <Link
                  key={post.id}
                  href={`/berita/${post.slug}`}
                  className="group overflow-hidden rounded-[28px] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="overflow-hidden">
                    <img
                      src={mediaUrl(post.imageUrl)}
                      alt={post.title}
                      className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                      {new Intl.DateTimeFormat("id-ID", {
                        dateStyle: "long",
                      }).format(post.eventDate)}
                    </p>
                    <h3 className="mt-3 text-xl font-bold leading-snug">
                      {post.title}
                    </h3>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">
                      {post.excerpt}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue-700">
                      Baca selengkapnya <ArrowRight size={16} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-10 rounded-[28px] border border-dashed border-slate-200 bg-white py-14 text-center text-slate-400">
              Berita dan kegiatan terbaru akan hadir di sini.
            </div>
          )}
        </div>
      </section>
      <section id="tentang" className="px-6 pb-24">
        <div
          className="landing-shine relative mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 rounded-[40px] bg-gradient-to-br from-blue-600 to-blue-900 bg-cover bg-center p-10 text-white md:flex-row md:p-16"
          style={
            c.ctaImage
              ? {
                  backgroundImage: `linear-gradient(110deg,rgba(29,78,216,.96),rgba(23,37,84,.8)),url(${mediaUrl(c.ctaImage)})`,
                }
              : undefined
          }
        >
          <div className="max-w-2xl">
            <h2 className="text-4xl font-black">{c.ctaTitle}</h2>
            <p className="mt-4 text-blue-100">{c.ctaText}</p>
          </div>
          <Link
            href="/login"
            className="shrink-0 rounded-2xl bg-white px-7 py-4 font-bold text-blue-700"
          >
            Masuk sekarang
          </Link>
        </div>
      </section>
      <footer className="border-t px-6 py-10">
        <div className="mx-auto flex max-w-7xl justify-between text-sm text-slate-500">
          <span>© 2026 Koperasi Praja Makmur</span>
          <span>Transparan · Aman · Bertumbuh</span>
        </div>
      </footer>
    </main>
  );
}
function Mock({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "blue" | "emerald";
}) {
  return (
    <div
      className={`rounded-2xl p-5 ${color === "blue" ? "bg-blue-600 text-white" : "bg-emerald-50 text-emerald-900"}`}
    >
      <p className="text-xs opacity-70">{label}</p>
      <p className="mt-2 text-lg font-bold">{value}</p>
    </div>
  );
}
function MiniFeature({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Activity;
  title: string;
  text: string;
}) {
  return (
    <div className="landing-card rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        <Icon size={20} />
      </span>
      <h3 className="mt-4 font-bold">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-500">{text}</p>
    </div>
  );
}
