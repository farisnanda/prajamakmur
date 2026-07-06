import { Building2, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { authOptions } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <main className="relative flex min-h-screen overflow-hidden bg-slate-50">
      <section className="relative hidden w-[52%] overflow-hidden bg-blue-700 p-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-24 top-1/3 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-indigo-400/30 blur-3xl" />
        <div className="absolute bottom-[-15%] right-[-5%] h-[420px] w-[420px] rounded-full border-[80px] border-white/5" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-xl shadow-blue-950/20">
            <Building2 size={25} />
          </div>
          <div>
            <p className="text-xl font-bold">Praja Makmur</p>
            <p className="text-sm text-blue-200">Koperasi Digital</p>
          </div>
        </div>

        <div className="relative z-10 max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">
            <Sparkles size={16} /> Sistem Koperasi Terintegrasi
          </div>
          <h1 className="text-5xl font-bold leading-tight tracking-tight">
            Kelola koperasi lebih mudah, transparan, dan terpercaya.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-blue-100">
            Satu ruang kerja untuk anggota, simpanan, pinjaman, akuntansi, dan
            laporan Praja Makmur.
          </p>
          <div className="mt-10 grid max-w-lg grid-cols-2 gap-4 text-sm font-semibold text-blue-50">
            <span className="flex items-center gap-2">
              <CheckCircle2 size={18} /> Data terpusat
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 size={18} /> Laporan real-time
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 size={18} /> Akses berbasis peran
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 size={18} /> Transaksi tercatat
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
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Building2 size={23} />
            </div>
            <div>
              <p className="font-bold text-slate-900">Praja Makmur</p>
              <p className="text-xs text-slate-500">Koperasi Digital</p>
            </div>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <ShieldCheck size={24} />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-slate-950">
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
