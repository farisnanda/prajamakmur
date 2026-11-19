import { CheckCircle2, ShieldCheck } from "lucide-react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { authOptions } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <main className="relative flex min-h-screen overflow-hidden bg-slate-50">
      <section className="relative hidden w-[48%] overflow-hidden bg-gradient-to-br from-blue-800 via-blue-900 to-blue-950 p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_30%_40%,black,transparent_75%)]"
        />
        <div
          aria-hidden="true"
          className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl"
        />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-sm font-bold tracking-tight text-blue-800">
            PM
          </div>
          <div>
            <p className="text-lg font-semibold">Praja Makmur</p>
            <p className="text-sm text-blue-200">Koperasi Digital</p>
          </div>
        </div>

        <div className="relative z-10 max-w-xl">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.14em] text-blue-200">
            Sistem Koperasi Terintegrasi
          </p>
          <h1 className="text-4xl font-semibold leading-[1.1] tracking-[-0.025em] xl:text-5xl">
            Kelola koperasi lebih mudah, transparan, dan terpercaya.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-blue-100/90 xl:text-lg xl:leading-8">
            Satu ruang kerja untuk anggota, simpanan, pinjaman, akuntansi, dan
            laporan Praja Makmur.
          </p>
          <div className="mt-10 grid max-w-lg grid-cols-2 gap-x-6 gap-y-3 text-sm font-medium text-blue-50">
            <span className="flex items-center gap-2">
              <CheckCircle2 size={17} className="text-blue-300" /> Data terpusat
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 size={17} className="text-blue-300" /> Laporan real-time
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 size={17} className="text-blue-300" /> Akses berbasis peran
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 size={17} className="text-blue-300" /> Transaksi tercatat
            </span>
          </div>
        </div>

        <p className="relative z-10 text-sm text-blue-200">
          © 2026 Koperasi Praja Makmur
        </p>
      </section>

      <section className="flex flex-1 items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-[13px] font-bold tracking-tight text-white">
              PM
            </div>
            <div>
              <p className="font-semibold text-slate-900">Praja Makmur</p>
              <p className="text-xs text-slate-500">Koperasi Digital</p>
            </div>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <ShieldCheck size={24} />
          </div>
          <h2 className="mt-6 text-2xl font-semibold tracking-[-0.02em] text-slate-950 sm:text-3xl">
            Selamat datang kembali
          </h2>
          <p className="mt-2 text-slate-500">
            Masuk menggunakan akun Praja Makmur Anda.
          </p>
          <LoginForm />
          <p className="mt-8 text-center text-xs leading-5 text-slate-400">
            Dengan masuk, Anda menyetujui kebijakan keamanan dan penggunaan
            sistem koperasi.
          </p>
        </div>
      </section>
    </main>
  );
}
