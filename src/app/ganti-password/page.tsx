import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { authOptions } from "@/lib/auth";

export default async function ChangePasswordPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const forced = session.user.mustChangePassword;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-card border border-slate-200/70 bg-white p-6 shadow-sm sm:p-8">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">
          PM
        </span>
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">
          {forced ? "Buat kata sandi baru" : "Ganti kata sandi"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          {forced
            ? "Ini pertama kalinya Anda masuk. Demi keamanan akun, ganti kata sandi awal sebelum melanjutkan."
            : "Masukkan kata sandi saat ini, lalu pilih kata sandi baru."}
        </p>
        <div className="mt-7">
          <ChangePasswordForm />
        </div>
      </div>
    </main>
  );
}
