"use client";

import { useActionState, useMemo, useState } from "react";
import { LoaderCircle } from "lucide-react";
import {
  addMandatorySavings,
  type VoluntarySavingsState,
} from "@/app/anggota/saving-actions";

const initial: VoluntarySavingsState = {};
const field =
  "mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50";
const rupiah = (value: number) => `Rp${Math.round(value).toLocaleString("id-ID")}`;

export function MandatorySavingsForm({
  memberId,
  defaultAmount,
}: {
  memberId: string;
  defaultAmount: number;
}) {
  const [state, action, pending] = useActionState(
    addMandatorySavings.bind(null, memberId),
    initial,
  );
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState(String(defaultAmount));
  const err = (name: string) => state.errors?.[name]?.[0];

  const months = useMemo(() => {
    if (!/^\d{4}-\d{2}$/.test(from) || !/^\d{4}-\d{2}$/.test(to)) return 0;
    const [fy, fm] = from.split("-").map(Number);
    const [ty, tm] = to.split("-").map(Number);
    return Math.max(0, (ty - fy) * 12 + (tm - fm) + 1);
  }, [from, to]);
  const each = Number(amount) || 0;

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-3">
        <label className="block text-sm font-semibold text-slate-700">
          Dari bulan
          <input
            name="fromMonth"
            type="month"
            required
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className={field}
          />
          {err("fromMonth") && (
            <span className="block text-xs font-normal text-red-600">
              {err("fromMonth")}
            </span>
          )}
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Sampai bulan
          <input
            name="toMonth"
            type="month"
            required
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className={field}
          />
          {err("toMonth") && (
            <span className="block text-xs font-normal text-red-600">
              {err("toMonth")}
            </span>
          )}
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Per bulan
          <div className="mt-2 flex h-12 items-center rounded-xl border border-slate-200 bg-white focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-50">
            <span className="pl-4 text-slate-400">Rp</span>
            <input
              name="amount"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="h-full w-full bg-transparent px-3 text-sm font-normal tabular-nums outline-none"
            />
          </div>
          {err("amount") && (
            <span className="mt-1.5 block text-xs font-normal text-red-600">
              {err("amount")}
            </span>
          )}
        </label>
      </div>

      <label className="block text-sm font-semibold text-slate-700">
        Catatan (opsional)
        <input
          name="note"
          maxLength={200}
          placeholder="Simpanan wajib sebelum migrasi"
          className={field}
        />
      </label>

      {months > 0 && (
        <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm tabular-nums text-slate-700">
          <b className="font-semibold text-slate-900">{months} bulan</b> ×{" "}
          {rupiah(each)} ={" "}
          <b className="font-semibold text-slate-900">{rupiah(months * each)}</b>
        </p>
      )}

      <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
        Satu setoran dicatat untuk tiap bulan dalam rentang itu. Bulan yang sudah
        tercatat dilewati, jadi aman diulang.{" "}
        <b>Tidak mengubah saldo kas atau jurnal</b>, karena uangnya sudah diterima
        sebelum aplikasi dipakai. Nominal awal mengikuti pengaturan; ubah jika data
        Excel berbeda.
      </p>

      {state.message && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {state.message}
        </p>
      )}

      <button
        disabled={pending}
        className="inline-flex h-12 items-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-slate-300"
      >
        {pending && <LoaderCircle size={18} className="animate-spin" />}
        Simpan simpanan wajib
      </button>
    </form>
  );
}
