import Link from "next/link";
import { ArrowRight, ArrowUpRight, Plus } from "lucide-react";
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

const container = "mx-auto w-full max-w-6xl px-5 sm:px-8";
const h2 =
  "text-[clamp(1.75rem,2vw+1rem,2.5rem)] font-semibold leading-[1.12] tracking-[-0.025em] text-slate-950 [text-wrap:balance]";
const lede = "mt-4 max-w-xl text-base leading-relaxed text-slate-600 [text-wrap:pretty]";
const button =
  "lp-btn inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold";

const rupiah = (value: number) => `Rp${Math.round(value).toLocaleString("id-ID")}`;
const dateFormat = new Intl.DateTimeFormat("id-ID", { dateStyle: "long" });

const faqs = [
  [
    "Siapa yang bisa menjadi anggota?",
    "Pegawai BKD Provinsi Jawa Timur berstatus PNS, PPPK, atau PPPK Paruh Waktu. Pendaftaran dilakukan melalui pengurus koperasi.",
  ],
  [
    "Berapa pinjaman yang bisa saya ajukan?",
    "Anggota PNS hingga Rp50 juta. Anggota PPPK dan PPPK Paruh Waktu hingga Rp40 juta. Tenor paling lama 20 bulan.",
  ],
  [
    "Bagaimana bunga dan cicilan dihitung?",
    "Bunga 10% per tahun dengan skema anuitas, jadi cicilan tetap sama setiap bulan. Seluruh bunga dibayar lebih dulu dari cicilan awal, lalu sisa cicilan mengurangi pokok.",
  ],
  [
    "Siapa yang menyetujui pinjaman?",
    "Pengajuan diperiksa Bendahara, disetujui Ketua Koperasi, lalu dicairkan. Setiap tahap bisa Anda lihat di akun anggota.",
  ],
  [
    "Apakah simpanan bisa ditarik?",
    "Simpanan sukarela bisa ditarik lewat pengajuan dari akun anggota, lalu diverifikasi pengurus.",
  ],
] as const;

export function LandingView({
  c,
  news,
  offer,
}: {
  c: LandingData;
  news: LandingNews[];
  offer: LandingOffer;
}) {
  const facts = [
    ["Plafon pinjaman", "Rp50 juta", "Anggota PNS. PPPK dan Paruh Waktu hingga Rp40 juta."],
    ["Bunga per tahun", "10%", "Anuitas: cicilan sama besar setiap bulan."],
    ["Tenor maksimal", "20 bulan", "Anda bisa memilih tenor 1 sampai 20 bulan."],
    ["Simpanan pokok", rupiah(offer.principal), "Dibayar sekali, saat mendaftar."],
  ] as const;

  const benefits = [
    [
      c.feature2Title,
      `${c.feature2Text} Plafon Rp50 juta untuk PNS dan Rp40 juta untuk PPPK.`,
    ],
    [
      "Bagi hasil usaha",
      "Keuntungan koperasi kembali ke anggota lewat pembagian SHU pada Rapat Anggota Tahunan.",
    ],
    [c.feature1Title, c.feature1Text],
  ] as const;

  return (
    <main className="landing-page min-h-screen bg-white text-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur">
        <div className={`${container} flex h-16 items-center justify-between gap-6`}>
          <Link href="/" className="flex items-center gap-2.5" aria-label="Praja Makmur, beranda">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-[13px] font-bold text-white">
              PM
            </span>
            <span className="text-[15px] font-semibold">Praja Makmur</span>
          </Link>
          <nav
            aria-label="Navigasi halaman"
            className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex"
          >
            <a href="#keuntungan" className="lp-link hover:text-slate-950">Keuntungan</a>
            <a href="#simpanan" className="lp-link hover:text-slate-950">Simpanan</a>
            <a href="#bergabung" className="lp-link hover:text-slate-950">Cara bergabung</a>
            <a href="#faq" className="lp-link hover:text-slate-950">FAQ</a>
          </nav>
          <Link
            href="/login"
            className="lp-btn inline-flex h-10 items-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Masuk
          </Link>
        </div>
      </header>

      {/* Hero: the offer and the simulator */}
      <section className="landing-hero relative isolate overflow-hidden">
        {c.heroPhoto && (
          <div aria-hidden="true" className="landing-photo absolute inset-x-0 top-0 -z-10 h-[36rem] lg:inset-0 lg:h-auto">
            {/* eslint-disable-next-line @next/next/no-img-element -- CMS-uploaded media */}
            <img src={mediaUrl(c.heroPhoto)} alt="" className="landing-photo-img h-full w-full object-cover" />
            <div className="absolute inset-0 bg-slate-950/70 lg:bg-transparent lg:bg-gradient-to-r lg:from-slate-950/85 lg:via-slate-950/60 lg:to-slate-950/15" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-white lg:hidden" />
          </div>
        )}
        <div className={`${container} grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1fr_26rem] lg:gap-20 lg:py-24`}>
          <div>
            <h1 className={`text-[clamp(2.25rem,3.4vw+1rem,3.75rem)] font-semibold leading-[1.06] tracking-[-0.035em] [text-wrap:balance] ${c.heroPhoto ? "text-white" : ""}`}>
              {c.heroTitle}
            </h1>
            <p className={`mt-6 max-w-lg text-[clamp(1rem,0.3vw+0.95rem,1.125rem)] leading-relaxed [text-wrap:pretty] ${c.heroPhoto ? "text-slate-200" : "text-slate-600"}`}>
              Pinjaman hingga <b className={`font-semibold ${c.heroPhoto ? "text-white" : "text-slate-950"}`}>Rp50 juta</b> dengan
              bunga <b className={`font-semibold ${c.heroPhoto ? "text-white" : "text-slate-950"}`}>10% per tahun</b>, simpanan yang
              tercatat rapi, dan bagi hasil untuk setiap anggota.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a href="#bergabung" className={`${button} lp-btn-primary`}>
                Gabung jadi anggota <ArrowRight size={17} />
              </a>
              <Link
                href={c.primaryUrl}
                className={`${button} lp-btn-ghost ${c.heroPhoto ? "lp-btn-on-photo" : ""}`}
              >
                {c.primaryLabel}
              </Link>
            </div>
          </div>
          <div id="simulasi">
            <LandingSimulator />
          </div>
        </div>
      </section>

      {/* The offer in four plain facts */}
      <section aria-label="Ketentuan pinjaman dan simpanan" className="border-y border-slate-200/70 bg-slate-50/60">
        <dl className={`${container} grid grid-cols-2 lg:grid-cols-4`}>
          {facts.map(([label, value, note], i) => (
            <div
              key={label}
              className={`py-7 pr-4 sm:py-9 lg:px-8 lg:first:pl-0 ${
                i % 2 === 1 ? "pl-4 sm:pl-8" : ""
              } ${i > 0 ? "lg:border-l lg:border-slate-200/70" : ""} ${
                i % 2 === 1 ? "border-l border-slate-200/70" : ""
              } ${i > 1 ? "border-t border-slate-200/70 lg:border-t-0" : ""}`}
            >
              <dt className="text-sm font-medium text-slate-500">{label}</dt>
              <dd className="mt-2 text-[clamp(1.5rem,1.2vw+1.1rem,2.125rem)] font-semibold leading-tight tracking-[-0.025em] text-slate-950">
                {value}
              </dd>
              <dd className="mt-2 text-sm leading-snug text-slate-500">{note}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Benefits */}
      <section id="keuntungan" className="py-20 lg:py-28">
        <div className={container}>
          <h2 className={`${h2} max-w-2xl`}>{c.featureTitle}</h2>
          <p className={lede}>{c.featureText}</p>
          <ul className="mt-12 grid gap-10 md:grid-cols-3 md:gap-12">
            {benefits.map(([title, text]) => (
              <li key={title} className="lp-rule lp-surface -mx-3 px-3 pb-5 pt-6">
                <h3 className="text-lg font-semibold tracking-[-0.01em]">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Savings */}
      <section id="simpanan" className="bg-slate-50 py-20 lg:py-28">
        <div className={`${container} grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20`}>
          <div>
            <h2 className={h2}>Mulai dengan {rupiah(offer.principal)}</h2>
            <p className={lede}>
              Simpanan menjadi dasar hak Anda atas pinjaman dan bagi hasil. Semua setoran tercatat
              dan bisa diperiksa dari akun anggota.
            </p>
          </div>
          <dl className="divide-y divide-slate-200 border-y border-slate-200">
            <SavingRow
              name="Simpanan pokok"
              amount={rupiah(offer.principal)}
              note="Sekali, saat mendaftar"
            />
            <SavingRow
              name="Simpanan wajib"
              amount={`${rupiah(offer.mandatoryPns)} / bulan`}
              note={`PNS. PPPK dan Paruh Waktu ${rupiah(offer.mandatoryPppk)} / bulan`}
            />
            <SavingRow
              name="Simpanan sukarela"
              amount="Bebas"
              note="Setor kapan saja, bisa ditarik"
            />
          </dl>
        </div>
      </section>

      {/* Join */}
      <section id="bergabung" className="py-20 lg:py-28">
        <div className={`${container} grid gap-12 ${c.showcaseImage2 ? "lg:grid-cols-2 lg:items-center lg:gap-16" : ""}`}>
          <div>
            <h2 className={h2}>Tiga langkah menjadi anggota</h2>
            <p className={lede}>
              Pendaftaran melalui pengurus koperasi. Setelah terdaftar, Anda mendapat akun untuk
              mengurus simpanan dan pinjaman sendiri.
            </p>
            <ol className={`mt-10 grid gap-8 ${c.showcaseImage2 ? "" : "md:grid-cols-3 md:gap-10"}`}>
              <Step n={1} title="Daftar ke pengurus" text="Siapkan NIP/NI dan data kepegawaian Anda." />
              <Step
                n={2}
                title={`Setor pokok ${rupiah(offer.principal)}`}
                text="Dibayar sekali. Sejak itu Anda tercatat sebagai anggota."
              />
              <Step
                n={3}
                title="Masuk ke akun anggota"
                text="Pantau simpanan dan ajukan pinjaman secara online."
              />
            </ol>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className={`${button} lp-btn-primary`}>
                Sudah anggota? Masuk <ArrowRight size={17} />
              </Link>
            </div>
          </div>
          {c.showcaseImage2 && (
            <div className="lp-media">
              {/* eslint-disable-next-line @next/next/no-img-element -- CMS-uploaded media */}
              <img
                src={mediaUrl(c.showcaseImage2)}
                alt="Kegiatan anggota Koperasi Praja Makmur"
                className="aspect-[4/3.4] w-full object-cover"
              />
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-slate-200/70 py-20 lg:py-28">
        <div className={`${container} grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20`}>
          <div>
            <h2 className={h2}>Pertanyaan sebelum bergabung</h2>
            <p className={lede}>Pertanyaan lain bisa Anda sampaikan langsung kepada pengurus.</p>
          </div>
          <div className="divide-y divide-slate-200 border-y border-slate-200">
            {faqs.map(([question, answer], i) => (
              <details key={question} className="landing-faq group" open={i === 0}>
                <summary className="lp-surface -mx-3 flex cursor-pointer list-none items-center justify-between gap-6 px-3 py-5 text-base font-semibold hover:text-blue-700">
                  {question}
                  <Plus size={18} className="landing-faq-icon shrink-0 text-slate-400 transition-transform duration-300" />
                </summary>
                <p className="max-w-[60ch] pb-6 pr-10 text-[15px] leading-relaxed text-slate-600">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* News */}
      {news.length > 0 && (
        <section id="berita" className="border-t border-slate-200/70 py-20 lg:py-28">
          <div className={container}>
            <h2 className={h2}>Kabar koperasi</h2>
            <ul className="mt-10 grid gap-8 md:grid-cols-3">
              {news.map((post) => (
                <li key={post.id}>
                  <Link href={`/berita/${post.slug}`} className="landing-card group block">
                    <div className="lp-media">
                      {/* eslint-disable-next-line @next/next/no-img-element -- CMS-uploaded media */}
                      <img
                        src={mediaUrl(post.imageUrl)}
                        alt=""
                        className="aspect-[16/10] w-full object-cover"
                      />
                    </div>
                    <time className="mt-4 block text-xs font-medium text-slate-500">
                      {dateFormat.format(post.eventDate)}
                    </time>
                    <h3 className="mt-1.5 text-lg font-semibold leading-snug [text-wrap:balance] group-hover:text-blue-700">
                      {post.title}
                    </h3>
                    <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-blue-700">
                      Baca <ArrowUpRight size={15} className="lp-arrow" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Close */}
      <section className="bg-slate-950 py-20 text-white lg:py-24">
        <div className={`${container} flex flex-col gap-8 md:flex-row md:items-center md:justify-between`}>
          <div className="max-w-xl">
            <h2 className="text-[clamp(1.75rem,2vw+1rem,2.5rem)] font-semibold leading-[1.12] tracking-[-0.025em] [text-wrap:balance]">
              {c.ctaTitle}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-300">{c.ctaText}</p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <a href="#bergabung" className={`${button} lp-btn-light`}>
              Gabung sekarang
            </a>
            <Link
              href="/login"
              className={`${button} lp-btn-outline`}
            >
              Masuk anggota
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200/70">
        <div
          className={`${container} flex flex-col gap-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between`}
        >
          <p>
            © {new Date().getFullYear()} Koperasi Pegawai Praja Makmur. Badan Hukum No.
            682/BH/XVI.37/2015.
          </p>
          <nav aria-label="Tautan footer" className="flex gap-6 font-medium">
            <a href="#faq" className="lp-link hover:text-slate-900">FAQ</a>
            <Link href="/login" className="lp-link hover:text-slate-900">Masuk</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}

function SavingRow({ name, amount, note }: { name: string; amount: string; note: string }) {
  return (
    <div className="lp-surface -mx-4 flex flex-col gap-1 px-4 py-6 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
      <div>
        <dt className="text-base font-semibold">{name}</dt>
        <dd className="mt-1 text-sm text-slate-500">{note}</dd>
      </div>
      <dd className="text-xl font-semibold tabular-nums tracking-[-0.01em] sm:whitespace-nowrap sm:text-right">{amount}</dd>
    </div>
  );
}

function Step({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <li className="group lp-surface -mx-3 flex gap-4 p-3">
      <span className="lp-step flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-300 text-sm font-semibold tabular-nums text-slate-700">
        {n}
      </span>
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-1 max-w-xs text-[15px] leading-relaxed text-slate-600">{text}</p>
      </div>
    </li>
  );
}
