"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import {
  addVoluntarySavings,
  type VoluntarySavingsState,
} from "@/app/anggota/saving-actions";

const initial: VoluntarySavingsState = {};
const field =
  "mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50";

export function VoluntarySavingsForm({
  memberId,
  today,
}: {
  memberId: string;
  today: string;
}) {
  const [state, action, pending] = useActionState(
    addVoluntarySavings.bind(null, memberId),
    initial,
  );
  const err = (name: string) => state.errors?.[name]?.[0];

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">
          Saldo simpanan sukarela
          <div className="mt-2 flex h-12 items-center rounded-xl border border-slate-200 bg-white focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-50">
            <span className="pl-4 text-slate-400">Rp</span>
            <input
              name="amount"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              required
              className="h-full w-full bg-transparent px-3 text-sm font-normal tabular-nums outline-none"
            />
          </div>
          {err("amount") && (
            <span className="mt-1.5 block text-xs font-normal text-red-600">{err("amount")}</span>
          )}
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Per tanggal
          <input
            name="transactionDate"
            type="date"
            required
            defaultValue={today}
            className={field}
          />
          <span className="mt-1.5 block text-xs font-normal text-slate-500">
            Tanggal saldo ini berlaku (mis. akhir bulan data Excel).
          </span>
          {err("transactionDate") && (
            <span className="block text-xs font-normal text-red-600">{err("transactionDate")}</span>
          )}
        </label>
      </div>
      <label className="block text-sm font-semibold text-slate-700">
        Catatan (opsional)
        <input
          name="note"
          maxLength={200}
          placeholder="Saldo awal simpanan sukarela (migrasi dari Excel)"
          className={field}
        />
      </label>

      <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
        Ini hanya mencatat saldo yang sudah ada: <b>tidak mengubah saldo kas atau jurnal</b>,
        karena uangnya sudah diterima sebelum aplikasi dipakai. Untuk setoran baru yang uangnya
        benar-benar masuk sekarang, gunakan menu Simpanan.
      </p>

      {state.message && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {state.message}
        </p>
      )}

      <button
        disabled={pending}
        className="inline-flex h-12 items-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-slate-300"
      >
        {pending && <LoaderCircle size={18} className="animate-spin" />}
        Simpan saldo
      </button>
    </form>
  );
}
