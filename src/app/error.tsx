"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Detail lengkap tercatat di log server; di sini hanya kode rujukan.
    console.error("Kesalahan halaman", error.digest);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Terjadi kesalahan</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Halaman ini tidak dapat dimuat. Coba lagi. Jika terus berulang, hubungi
          administrator{error.digest ? ` dan sebutkan kode ${error.digest}` : ""}.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Coba lagi
          </button>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Ke beranda
          </Link>
        </div>
      </div>
    </main>
  );
}
