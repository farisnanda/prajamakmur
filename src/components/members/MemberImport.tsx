"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Download, FileSpreadsheet, Loader2, TriangleAlert, Upload } from "lucide-react";
import { importMembers, type ImportState } from "@/app/anggota/import-actions";

const initial: ImportState = {};

export function MemberImport() {
  const [state, action, pending] = useActionState(importMembers, initial);
  const [fileName, setFileName] = useState("");

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <form action={action} className="space-y-5">
        <label
          htmlFor="member-file"
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center transition-colors hover:border-blue-400 hover:bg-blue-50/40 has-[:focus-visible]:border-blue-500"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
            {fileName ? <FileSpreadsheet size={24} /> : <Upload size={24} />}
          </span>
          <span className="text-sm font-semibold text-slate-800">
            {fileName || "Pilih file Excel (.xlsx)"}
          </span>
          <span className="text-xs text-slate-500">
            Maksimal 500 baris dan 2 MB. Gunakan template agar kolom sesuai.
          </span>
          <input
            id="member-file"
            name="file"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
          />
        </label>

        <label className="flex items-start gap-3 rounded-2xl border border-slate-200/80 p-4 text-sm">
          <input
            type="checkbox"
            name="createAccounts"
            defaultChecked
            className="mt-0.5 h-4 w-4 rounded border-slate-300"
          />
          <span>
            <span className="block font-semibold text-slate-900">
              Buat akun login untuk anggota yang punya NIP/NI
            </span>
            <span className="mt-0.5 block text-slate-500">
              Login dengan NIP/NI. Kata sandi awal sama dengan NIP/NI, dan
              anggota wajib menggantinya saat masuk pertama kali.
            </span>
          </span>
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            disabled={pending || !fileName}
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {pending ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
            {pending ? "Mengimpor..." : "Impor Anggota"}
          </button>
        </div>

        {state.status === "success" && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">{state.message}</p>
              {!!state.principalSavings && (
                <p className="mt-1">
                  {state.principalSavings} simpanan pokok otomatis dicatat (masuk Kas Bank).
                </p>
              )}
              {state.accounts !== undefined && state.accounts > 0 && (
                <p className="mt-1">{state.accounts} akun login dibuat.</p>
              )}
              {!!state.withoutNip && (
                <p className="mt-1">
                  {state.withoutNip} anggota tanpa NIP/NI belum punya akun login.
                </p>
              )}
              <Link href="/anggota" className="mt-1 inline-block font-semibold underline underline-offset-2">
                Lihat daftar anggota
              </Link>
            </div>
          </div>
        )}

        {state.status === "error" && (
          <div role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-800">
            <p className="flex items-start gap-2 font-semibold">
              <TriangleAlert size={18} className="mt-0.5 shrink-0" />
              {state.message}
            </p>
            {state.rowErrors && state.rowErrors.length > 0 && (
              <ul className="mt-3 max-h-72 space-y-1.5 overflow-y-auto border-t border-red-100 pt-3">
                {state.rowErrors.map((error, index) => (
                  <li key={`${error.row}-${index}`} className="flex gap-3">
                    <span className="w-16 shrink-0 font-semibold tabular-nums">
                      Baris {error.row}
                    </span>
                    <span>{error.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </form>

      <aside className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 text-sm text-slate-600">
        <h4 className="font-semibold text-slate-900">Cara impor</h4>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>Unduh template Excel.</li>
          <li>Isi data anggota mulai baris ke-2.</li>
          <li>Unggah file, lalu klik Impor Anggota.</li>
        </ol>
        <a
          href="/prajamakmur/anggota/tambah/template"
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-800 hover:bg-slate-50"
        >
          <Download size={16} /> Unduh template
        </a>
        <p className="mt-5 text-xs leading-relaxed text-slate-500">
          Wajib diisi: Nama dan Status Kepegawaian. Nomor Anggota dikosongkan saja, nanti dibuat otomatis berurutan.
          NIK boleh kosong dan dilengkapi nanti oleh anggota atau pengurus. Isi NIP/NI agar akun login ikut dibuat. Jika satu baris bermasalah, tidak ada data yang masuk,
          jadi tidak ada impor setengah jadi.
        </p>
      </aside>
    </div>
  );
}
