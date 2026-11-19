import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgePercent,
  CalendarClock,
  CheckCircle2,
  FileCheck2,
  HandCoins,
  Landmark,
  LineChart,
  Plus,
  ShieldCheck,
  Smartphone,
  Users,
  Wallet,
} from "lucide-react";
import { mediaUrl, type LandingData } from "@/lib/landing";
import { LandingSimulator } from "./LandingSimulator";

export type LandingNews = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  imageUrl: string;
  eventDate: Date;
};

export type LandingOffer = {
  principal: number;
  mandatoryPns: number;
  mandatoryPppk: number;
  activeMembers: number;
};

const container = "mx-auto w-full max-w-7xl px-5 sm:px-8";
const overline = "text-xs font-semibold uppercase tracking-[0.14em] text-blue-600";
const h2 =
  "text-[clamp(1.875rem,2.4vw+1rem,3rem)] font-semibold leading-[1.08] tracking-[-0.025em] text-slate-950 [text-wrap:balance]";

/** Rp500.000 → "Rp500 ribu", Rp50.000.000 → "Rp50 juta" */
function shortRupiah(value: number) {
  if (value >= 1_000_000) {
    const jt = value / 1_000_000;
    return `Rp${Number.isInteger(jt) ? jt : jt.toLocaleString("id-ID")} juta`;
  }
  if (value >= 1_000) return `Rp${Math.round(value / 1_000)} ribu`;
  return `Rp${value}`;
}

const dateFormat = new Intl.DateTimeFormat("id-ID", { dateStyle: "long" });

export function LandingView({
  c,
  news,
  offer,
}: {
  c: LandingData;
  news: LandingNews[];
  offer: LandingOffer;
}) {
  const stats = [
    [c.stat1Value, c.stat1Label],
    [c.stat2Value, c.stat2Label],
    [c.stat3Value, c.stat3Label],
  ] as const;
  const showMembers = offer.activeMembers >= 20;
  const joinImage = c.showcaseImage2;

  const faqs = [
    [
      "Siapa yang bisa menjadi anggota?",
      "Pegawai berstatus PNS, PPPK, maupun PPPK Paruh Waktu dapat bergabung dengan mendaftar melalui pengurus koperasi.",
    ],
    [
      "Berapa pinjaman yang bisa saya ajukan?",
      `Anggota PNS dapat mengajukan hingga Rp50 juta, sedangkan PPPK dan Paruh Waktu hingga Rp40 juta, dengan tenor maksimal 20 bulan.`,
    ],
    [
      "Bagaimana bunga pinjaman dihitung?",
      "Bunga 10% per tahun dengan skema anuitas, sehingga angsuran bulanan Anda tetap sama dari awal hingga lunas.",
    ],
    [
      "Apakah simpanan sukarela bisa ditarik?",
      "Bisa. Ajukan penarikan simpanan sukarela langsung dari akun anggota, lalu pengurus akan memverifikasinya.",
    ],
    [
      "Bagaimana saya memantau simpanan dan pinjaman?",
      "Setelah terdaftar, Anda mendapat akun anggota untuk melihat saldo simpanan, sisa pinjaman, angsuran, dan riwayat transaksi kapan saja.",
    ],
  ] as const;

  return (
    <main className="landing-page min-h-screen bg-background text-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
        <div className={`${container} flex h-16 items-center justify-between gap-6`}>
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-[13px] font-bold tracking-tight text-white">
              PM
            </span>
            <span className="leading-tight">
              <b className="block text-[15px] font-semibold">Praja Makmur</b>
              <small className="text-xs text-slate-500">Koperasi Pegawai</small>
            </span>
          </Link>
          <nav
            aria-label="Navigasi halaman"
            className="hidden items-center gap-8 text-sm font-medium text-slate-600 lg:flex"
          >
            <a href="#keuntungan" className="transition-colors hover:text-slate-950">
              Keuntungan
            </a>
            <a href="#simpanan" className="transition-colors hover:text-slate-950">
              Simpanan
            </a>
            <a href="#bergabung" className="transition-colors hover:text-slate-950">
              Cara Bergabung
            </a>
            <a href="#faq" className="transition-colors hover:text-slate-950">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <a
              href="#bergabung"
              className="hidden h-10 items-center rounded-xl px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 sm:inline-flex"
            >
              Jadi anggota
            </a>
            <Link
              href="/login"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Masuk <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero: the offer + the simulator that proves it */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 [background-image:linear-gradient(to_right,var(--color-slate-200)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-slate-200)_1px,transparent_1px)] [background-size:64px_64px] opacity-50 [mask-image:radial-gradient(ellipse_70%_60%_at_70%_0%,black,transparent)]"
        />
        <div
          className={`${container} landing-hero grid items-center gap-12 pb-16 pt-12 sm:pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:pb-24 lg:pt-20`}
        >
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <BadgePercent size={14} /> {c.badge}
            </p>
            <h1 className="mt-6 text-[clamp(2.375rem,3.4vw+1rem,4.25rem)] font-semibold leading-[1.04] tracking-[-0.035em] [text-wrap:balance] text-slate-950">
              {c.heroTitle}
            </h1>
            <p className="mt-6 max-w-xl text-[clamp(1rem,0.4vw+0.9rem,1.175rem)] leading-relaxed text-slate-600 [text-wrap:pretty]">
              {c.heroText}
            </p>

            <dl className="mt-8 grid max-w-xl grid-cols-3 gap-3">
              <OfferChip label="Plafon hingga" value="Rp50 jt" />
              <OfferChip label="Bunga tetap" value="10%/thn" />
              <OfferChip label="Tenor sampai" value="20 bln" />
            </dl>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#bergabung"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                Gabung jadi anggota <ArrowRight size={17} />
              </a>
              <Link
                href={c.primaryUrl}
                className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                {c.primaryLabel}
              </Link>
            </div>

            <p className="mt-6 flex items-center gap-2 text-sm text-slate-500">
              {showMembers ? (
                <>
                  <Users size={16} className="text-blue-600" />
                  Dipercaya{" "}
                  <b className="font-semibold text-slate-800 tabular-nums">
                    {offer.activeMembers.toLocaleString("id-ID")} anggota aktif
                  </b>
                </>
              ) : (
                <>
                  <ShieldCheck size={16} className="text-blue-600" />
                  Dikelola pengurus, tercatat transparan untuk setiap anggota
                </>
              )}
            </p>
          </div>

          <div id="simulasi">
            <LandingSimulator />
          </div>
        </div>
      </section>

      {/* Proof strip */}
      <section aria-label="Fakta koperasi" className="border-y border-slate-200/70 bg-white">
        <dl
          className={`${container} grid divide-y divide-slate-200/70 sm:grid-cols-3 sm:divide-x sm:divide-y-0`}
        >
          {stats.map(([value, label]) => (
            <div key={label} className="py-7 sm:px-8 sm:py-9 sm:first:pl-0">
              <dt className="text-sm text-slate-500">{label}</dt>
              <dd className="mt-1.5 text-[clamp(1.875rem,2vw+1.125rem,2.5rem)] font-semibold tracking-[-0.03em] text-slate-950 tabular-nums">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Benefits bento */}
      <section id="keuntungan" className="py-20 lg:py-28">
        <div className={container}>
          <div className="landing-reveal grid gap-6 lg:grid-cols-2 lg:items-end">
            <div>
              <p className={overline}>Keuntungan anggota</p>
              <h2 className={`mt-4 ${h2}`}>{c.featureTitle}</h2>
            </div>
            <p className="max-w-xl text-base leading-relaxed text-slate-600 lg:justify-self-end">
              {c.featureText}
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-6">
            {/* Lead benefit: the loan */}
            <article className="landing-reveal relative overflow-hidden rounded-card bg-gradient-to-br from-blue-700 via-blue-800 to-blue-950 p-7 text-white sm:p-9 md:col-span-4 md:row-span-2">
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_90%_10%,black,transparent_70%)]"
              />
              <div className="relative flex h-full flex-col">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-blue-100 ring-1 ring-white/15">
                  <Landmark size={21} />
                </span>
                <h3 className="mt-7 max-w-md text-[clamp(1.5rem,1.4vw+1rem,2.125rem)] font-semibold leading-tight tracking-[-0.02em]">
                  {c.feature2Title}
                </h3>
                <p className="mt-3 max-w-md text-[15px] leading-relaxed text-blue-100/90">
                  {c.feature2Text}
                </p>
                <div className="mt-auto grid gap-3 pt-10 sm:grid-cols-2">
                  <LimitCard group="Anggota PNS" value="Rp50 juta" />
                  <LimitCard group="PPPK & Paruh Waktu" value="Rp40 juta" />
                </div>
                <a
                  href="#simulasi"
                  className="mt-6 inline-flex items-center gap-1.5 self-start text-sm font-semibold text-white underline-offset-4 hover:underline"
                >
                  Hitung angsuran Anda <ArrowRight size={16} />
                </a>
              </div>
            </article>

            <BenefitCard
              className="md:col-span-2"
              icon={HandCoins}
              title="Bagi hasil usaha (SHU)"
              text="Keuntungan koperasi kembali ke anggota melalui pembagian SHU pada Rapat Anggota Tahunan."
            />
            <BenefitCard
              className="md:col-span-2"
              icon={CalendarClock}
              title="Angsuran tetap tiap bulan"
              text="Skema anuitas membuat cicilan Anda sama setiap bulan, mudah direncanakan dari gaji."
            />
            <BenefitCard
              className="md:col-span-3"
              icon={Wallet}
              title={c.feature1Title}
              text={c.feature1Text}
              image={c.feature1Image}
            />
            <BenefitCard
              className="md:col-span-3"
              icon={Smartphone}
              title={c.feature3Title}
              text={c.feature3Text}
              image={c.feature3Image}
            />
          </div>
        </div>
      </section>

      {/* Savings: priced like a plan */}
      <section id="simpanan" className="border-y border-slate-200/70 bg-white py-20 lg:py-28">
        <div className={container}>
          <div className="landing-reveal mx-auto max-w-2xl text-center">
            <p className={overline}>Simpanan anggota</p>
            <h2 className={`mt-4 ${h2}`}>
              Mulai menabung dari {shortRupiah(offer.principal)}
            </h2>
            <p className="mt-5 text-base leading-relaxed text-slate-600">
              Setoran yang ringan, tercatat rapi, dan menjadi dasar hak Anda atas
              pinjaman serta pembagian hasil usaha.
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            <PlanCard
              name="Simpanan Pokok"
              price={shortRupiah(offer.principal)}
              unit="sekali saat mendaftar"
              points={["Tanda keanggotaan resmi", "Dibayar satu kali saja"]}
            />
            <PlanCard
              featured
              name="Simpanan Wajib"
              price={shortRupiah(offer.mandatoryPns)}
              unit="per bulan · PNS"
              note={`PPPK & Paruh Waktu ${shortRupiah(offer.mandatoryPppk)} per bulan`}
              points={[
                "Membuka akses pinjaman",
                "Menambah porsi SHU Anda",
                "Riwayat setoran bisa dipantau",
              ]}
            />
            <PlanCard
              name="Simpanan Sukarela"
              price="Bebas"
              unit="nominal sesuai kemampuan"
              points={["Setor kapan saja", "Dapat ditarik saat dibutuhkan"]}
            />
          </div>
        </div>
      </section>

      {/* How to join */}
      <section id="bergabung" className="py-20 lg:py-28">
        <div
          className={`${container} grid gap-12 ${joinImage ? "lg:grid-cols-2 lg:items-center lg:gap-16" : ""}`}
        >
          <div>
            <div className="landing-reveal max-w-xl">
              <p className={overline}>Cara bergabung</p>
              <h2 className={`mt-4 ${h2}`}>Tiga langkah untuk mulai menikmati layanan</h2>
            </div>
            <ol className={`mt-10 grid gap-7 ${joinImage ? "" : "md:grid-cols-3"}`}>
              <Step
                n={1}
                title="Daftar melalui pengurus"
                text="Siapkan NIK dan data kepegawaian Anda, lalu daftarkan diri kepada pengurus koperasi."
              />
              <Step
                n={2}
                title={`Setor simpanan pokok ${shortRupiah(offer.principal)}`}
                text="Setoran sekali di awal ini menandai Anda resmi menjadi anggota koperasi."
              />
              <Step
                n={3}
                title="Aktifkan akun anggota"
                text="Masuk untuk memantau simpanan, mengajukan pinjaman, dan menarik simpanan sukarela secara online."
              />
            </ol>
            <div className="landing-reveal mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                Sudah anggota? Masuk <ArrowRight size={17} />
              </Link>
              <a
                href="#faq"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                Punya pertanyaan?
              </a>
            </div>
          </div>
          {joinImage && (
            // eslint-disable-next-line @next/next/no-img-element -- CMS-uploaded media
            <img
              src={mediaUrl(joinImage)}
              alt="Kegiatan anggota Koperasi Praja Makmur"
              className="landing-reveal aspect-[4/3.4] w-full rounded-3xl object-cover shadow-md"
            />
          )}
        </div>
      </section>

      {/* Trust: dark band */}
      <section className="bg-slate-950 py-16 text-white lg:py-20">
        <div className={`${container} grid gap-10 md:grid-cols-3`}>
          <TrustPoint
            icon={ShieldCheck}
            title="Persetujuan berjenjang"
            text="Setiap pinjaman diperiksa Bendahara dan disetujui Ketua sebelum dicairkan."
          />
          <TrustPoint
            icon={FileCheck2}
            title="Semua transaksi tercatat"
            text="Simpanan, angsuran, dan pencairan memiliki bukti serta jejak yang bisa ditelusuri."
          />
          <TrustPoint
            icon={LineChart}
            title="Laporan terbuka"
            text="Arus kas dan hasil usaha dibukukan otomatis untuk dipertanggungjawabkan di RAT."
          />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 lg:py-28">
        <div className={`${container} grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16`}>
          <div className="landing-reveal">
            <p className={overline}>Pertanyaan umum</p>
            <h2 className={`mt-4 ${h2}`}>Yang sering ditanyakan calon anggota</h2>
            <p className="mt-5 max-w-sm text-base leading-relaxed text-slate-600">
              Belum menemukan jawabannya? Tanyakan langsung kepada pengurus koperasi.
            </p>
          </div>
          <div className="divide-y divide-slate-200 border-y border-slate-200">
            {faqs.map(([question, answer], i) => (
              <details key={question} className="landing-faq group" open={i === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left text-base font-semibold text-slate-900 transition-colors hover:text-blue-700">
                  {question}
                  <span className="landing-faq-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-transform duration-300">
                    <Plus size={16} />
                  </span>
                </summary>
                <p className="-mt-1 pb-6 pr-12 text-[15px] leading-relaxed text-slate-600">
                  {answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* News */}
      {news.length > 0 && (
        <section id="berita" className="border-t border-slate-200/70 bg-white py-20 lg:py-28">
          <div className={container}>
            <div className="landing-reveal flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className={overline}>Berita &amp; kegiatan</p>
                <h2 className={`mt-4 ${h2}`}>Kabar terbaru Praja Makmur</h2>
              </div>
              <p className="max-w-sm text-base leading-relaxed text-slate-600">
                Ikuti kegiatan dan perkembangan koperasi bersama anggota.
              </p>
            </div>
            <div className={`mt-12 grid gap-6 ${news.length > 1 ? "md:grid-cols-3" : ""}`}>
              {news.map((post) => (
                <Link
                  key={post.id}
                  href={`/berita/${post.slug}`}
                  className={`landing-card landing-reveal group flex flex-col overflow-hidden rounded-card border border-slate-200/80 bg-white ${
                    news.length === 1 ? "md:grid md:grid-cols-2" : ""
                  }`}
                >
                  <div className="overflow-hidden bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element -- CMS-uploaded media */}
                    <img
                      src={mediaUrl(post.imageUrl)}
                      alt={post.title}
                      className="aspect-[16/10] h-full w-full object-cover transition duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
                    />
                  </div>
                  <div
                    className={`flex flex-1 flex-col p-6 ${news.length === 1 ? "md:justify-center md:p-10" : ""}`}
                  >
                    <time className="text-xs font-medium text-slate-500">
                      {dateFormat.format(post.eventDate)}
                    </time>
                    <h3
                      className={`mt-3 font-semibold leading-snug tracking-[-0.01em] [text-wrap:balance] ${
                        news.length === 1 ? "text-2xl" : "text-lg"
                      }`}
                    >
                      {post.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">
                      {post.excerpt}
                    </p>
                    <span
                      className={`inline-flex items-center gap-1.5 pt-6 text-sm font-semibold text-blue-700 ${news.length === 1 ? "" : "mt-auto"}`}
                    >
                      Baca selengkapnya
                      <ArrowUpRight
                        size={16}
                        className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Closing CTA */}
      <section className="py-20 lg:py-24">
        <div className={container}>
          <div
            className="landing-reveal relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-blue-700 via-blue-800 to-blue-950 bg-cover bg-center px-7 py-14 text-white sm:px-14 sm:py-16"
            style={
              c.ctaImage
                ? {
                    backgroundImage: `linear-gradient(110deg, oklch(0.37 0.13 263 / 0.95), oklch(0.22 0.07 265 / 0.85)), url(${mediaUrl(c.ctaImage)})`,
                  }
                : undefined
            }
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_80%_20%,black,transparent_70%)]"
            />
            <div className="relative grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-center">
              <div>
                <h2 className="text-[clamp(1.75rem,2vw+1rem,2.75rem)] font-semibold leading-[1.1] tracking-[-0.025em] [text-wrap:balance]">
                  {c.ctaTitle}
                </h2>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-blue-100/90">
                  {c.ctaText}
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <a
                    href="#bergabung"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-blue-800 transition-colors hover:bg-blue-50"
                  >
                    Gabung sekarang <ArrowRight size={17} />
                  </a>
                  <Link
                    href="/login"
                    className="inline-flex h-12 items-center justify-center rounded-xl border border-white/25 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    Masuk anggota
                  </Link>
                </div>
              </div>
              <ul className="grid gap-3 text-sm text-blue-50">
                {[
                  "Pinjaman hingga Rp50 juta, bunga 10% per tahun",
                  `Simpanan pokok cukup ${shortRupiah(offer.principal)} sekali`,
                  "Bagi hasil usaha untuk setiap anggota",
                  "Pantau semua transaksi dari HP",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 rounded-xl bg-white/[0.07] px-4 py-3 ring-1 ring-white/10"
                  >
                    <CheckCircle2 size={18} className="shrink-0 text-emerald-300" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200/70 bg-white">
        <div
          className={`${container} flex flex-col gap-6 py-10 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between`}
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-[11px] font-bold text-white">
              PM
            </span>
            <span>© {new Date().getFullYear()} Koperasi Praja Makmur</span>
          </div>
          <nav aria-label="Tautan footer" className="flex flex-wrap gap-x-6 gap-y-2">
            <a href="#keuntungan" className="hover:text-slate-900">
              Keuntungan
            </a>
            <a href="#simpanan" className="hover:text-slate-900">
              Simpanan
            </a>
            <a href="#faq" className="hover:text-slate-900">
              FAQ
            </a>
            <Link href="/login" className="hover:text-slate-900">
              Masuk
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}

function OfferChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white px-3.5 py-3 shadow-sm sm:px-4">
      <dt className="text-[11px] font-medium text-slate-500 sm:text-xs">{label}</dt>
      <dd className="mt-1 text-base font-semibold tracking-[-0.01em] text-slate-950 tabular-nums sm:text-lg">
        {value}
      </dd>
    </div>
  );
}

function LimitCard({ group, value }: { group: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.08] p-4 ring-1 ring-white/10">
      <p className="text-xs text-blue-200">{group}</p>
      <p className="mt-1 text-2xl font-semibold tracking-[-0.02em] tabular-nums">{value}</p>
    </div>
  );
}

function BenefitCard({
  icon: Icon,
  title,
  text,
  image,
  className = "",
}: {
  icon: typeof Wallet;
  title: string;
  text: string;
  image?: string;
  className?: string;
}) {
  return (
    <article
      className={`landing-card landing-reveal flex flex-col overflow-hidden rounded-card border border-slate-200/80 bg-white ${className}`}
    >
      {image && (
        // eslint-disable-next-line @next/next/no-img-element -- CMS-uploaded media
        <img src={mediaUrl(image)} alt={title} className="aspect-[16/8] w-full object-cover" />
      )}
      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Icon size={21} />
        </span>
        <h3 className="mt-6 text-lg font-semibold tracking-[-0.01em]">{title}</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{text}</p>
      </div>
    </article>
  );
}

function PlanCard({
  name,
  price,
  unit,
  note,
  points,
  featured = false,
}: {
  name: string;
  price: string;
  unit: string;
  note?: string;
  points: string[];
  featured?: boolean;
}) {
  return (
    <article
      className={`landing-card landing-reveal relative flex flex-col rounded-card border p-7 sm:p-8 ${
        featured
          ? "border-blue-600 bg-white shadow-md ring-1 ring-blue-600"
          : "border-slate-200/80 bg-slate-50/60"
      }`}
    >
      {featured && (
        <span className="absolute -top-3 left-7 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
          Kunci akses pinjaman
        </span>
      )}
      <h3 className="text-sm font-semibold text-slate-600">{name}</h3>
      <p className="mt-4 text-[clamp(2.25rem,2vw+1.5rem,3rem)] font-semibold leading-none tracking-[-0.03em] text-slate-950 tabular-nums">
        {price}
      </p>
      <p className="mt-2 text-sm text-slate-500">{unit}</p>
      {note && (
        <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800">
          {note}
        </p>
      )}
      <ul className="mt-6 grid gap-2.5 border-t border-slate-200/80 pt-6 text-sm text-slate-700">
        {points.map((point) => (
          <li key={point} className="flex items-start gap-2.5">
            <CheckCircle2 size={17} className="mt-px shrink-0 text-blue-600" />
            {point}
          </li>
        ))}
      </ul>
    </article>
  );
}

function Step({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <li className="landing-reveal flex gap-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold tabular-nums text-white">
        {n}
      </span>
      <div>
        <h3 className="text-lg font-semibold tracking-[-0.01em]">{title}</h3>
        <p className="mt-1.5 max-w-md text-[15px] leading-relaxed text-slate-600">{text}</p>
      </div>
    </li>
  );
}

function TrustPoint({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Wallet;
  title: string;
  text: string;
}) {
  return (
    <div className="landing-reveal">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-blue-300 ring-1 ring-white/10">
        <Icon size={19} />
      </span>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{text}</p>
    </div>
  );
}
