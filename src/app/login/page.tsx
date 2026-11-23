import { ArrowLeft } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { authOptions } from "@/lib/auth";
import { landingData, mediaUrl } from "@/lib/landing";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  // The same photo as the landing hero, when one is uploaded.
  const row = await prisma.landingContent.findUnique({ where: { id: "default" } });
  const { heroPhoto } = landingData(row?.content);

  return (
    <main className="landing-page flex min-h-screen bg-white">
      <section className="landing-hero relative isolate hidden w-[46%] flex-col justify-between overflow-hidden bg-slate-950 p-12 text-white lg:flex xl:p-16">
        {heroPhoto && (
          <div aria-hidden="true" className="landing-photo absolute inset-0 -z-10">
            {/* eslint-disable-next-line @next/next/no-img-element -- CMS-uploaded media */}
            <img
              src={mediaUrl(heroPhoto)}
              alt=""
              className="landing-photo-img h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-slate-950/40" />
          </div>
        )}

        <Link href="/" className="flex items-center gap-3" aria-label="Praja Makmur, beranda">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[13px] font-bold text-slate-950">
            PM
          </span>
          <span className="text-lg font-semibold">Praja Makmur</span>
        </Link>

        <div className="max-w-md">
          <h1 className="text-4xl font-semibold leading-[1.1] tracking-[-0.03em] [text-wrap:balance] xl:text-5xl">
            Simpanan dan pinjaman Anda, dalam satu akun.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-slate-300">
            Pantau saldo simpanan, ajukan pinjaman, dan lihat riwayat angsuran kapan saja.
          </p>
        </div>

        <p className="text-sm text-slate-400">© {new Date().getFullYear()} Koperasi Pegawai Praja Makmur</p>
      </section>

      <section className="flex flex-1 flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 lg:hidden" aria-label="Praja Makmur, beranda">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-[13px] font-bold text-white">
              PM
            </span>
            <span className="text-[15px] font-semibold">Praja Makmur</span>
          </Link>
          <Link
            href="/"
            className="lp-link ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-950"
          >
            <ArrowLeft size={15} /> Beranda
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h2 className="text-3xl font-semibold tracking-[-0.025em] text-slate-950">Masuk</h2>
          <p className="mt-2 text-slate-500">Gunakan NIP/NI dan kata sandi Anda.</p>
          <LoginForm />
          <p className="mt-8 text-sm leading-relaxed text-slate-500">
            Lupa kata sandi atau belum punya akun? Hubungi pengurus koperasi.
          </p>
        </div>
      </section>
    </main>
  );
}
