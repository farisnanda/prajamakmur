"use client";

import { useActionState, useEffect } from "react";
import { LoaderCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  changePassword,
  type ChangePasswordState,
} from "@/app/ganti-password/actions";

const initial: ChangePasswordState = {};
const field =
  "h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100";

export function ChangePasswordForm() {
  const router = useRouter();
  const { update } = useSession();
  const [state, action, pending] = useActionState(changePassword, initial);

  useEffect(() => {
    if (!state.ok) return;
    // Segarkan token agar penanda wajib-ganti hilang, lalu masuk ke aplikasi.
    void update().then(() => {
      router.replace("/dashboard");
      router.refresh();
    });
  }, [state.ok, update, router]);

  return (
    <form action={action} className="space-y-5">
      <label className="block text-sm font-semibold text-slate-700">
        Kata sandi saat ini
        <input
          name="current"
          type="password"
          autoComplete="current-password"
          required
          className={`${field} mt-2 font-normal`}
        />
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        Kata sandi baru
        <input
          name="next"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className={`${field} mt-2 font-normal`}
        />
        <span className="mt-1.5 block text-xs font-normal text-slate-500">
          Minimal 8 karakter dan bukan NIP/NI atau NIK Anda.
        </span>
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        Ulangi kata sandi baru
        <input
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className={`${field} mt-2 font-normal`}
        />
      </label>

      {state.message && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {state.message}
        </p>
      )}

      <button
        disabled={pending || state.ok}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-slate-300"
      >
        {(pending || state.ok) && <LoaderCircle size={18} className="animate-spin" />}
        Simpan dan lanjutkan
      </button>
    </form>
  );
}
