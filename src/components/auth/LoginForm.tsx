"use client";

import { useState } from "react";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsPending(true);

    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      identifier: formData.get("identifier"),
      password: formData.get("password"),
      redirect: false,
    });

    if (result?.error) {
      setError("NIP/NI, email, atau kata sandi tidak sesuai.");
      setIsPending(false);
      return;
    }

    const callbackUrl = searchParams.get("callbackUrl");
    let destination = "/dashboard";
    if (callbackUrl) {
      try {
        const pathname = callbackUrl.startsWith("http")
          ? new URL(callbackUrl).pathname
          : callbackUrl;
        const normalized = pathname.replace(/^(\/prajamakmur)+/, "");
        if (
          normalized.startsWith("/") &&
          !normalized.startsWith("//") &&
          normalized !== "/login"
        )
          destination = normalized;
      } catch {
        /* Callback tidak valid: gunakan dashboard. */
      }
    }
    router.replace(destination);
    router.refresh();
  }

  const field =
    "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

  return (
    <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="identifier" className="mb-2 block text-sm font-medium text-slate-700">
          NIP/NI atau email
        </label>
        <input
          id="identifier"
          name="identifier"
          type="text"
          inputMode="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          placeholder="Masukkan NIP/NI"
          className={field}
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
          Kata sandi
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="Masukkan kata sandi"
            className={`${field} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="lp-btn lp-btn-primary flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending && <LoaderCircle size={18} className="animate-spin" />}
        {isPending ? "Memeriksa akun..." : "Masuk"}
      </button>
    </form>
  );
}
