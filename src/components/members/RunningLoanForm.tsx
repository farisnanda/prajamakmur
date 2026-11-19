"use client";

import { useActionState, useMemo, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { addRunningLoan, type RunningLoanState } from "@/app/anggota/loan-actions";
import { annuityPayment, annuitySchedule } from "@/lib/annuity";

const initial: RunningLoanState = {};
const RATE = 10;
const field =
  "mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50";
const rupiah = (value: number) => `Rp${Math.round(value).toLocaleString("id-ID")}`;
const monthLabel = (date: Date) =>
  new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(date);

export function RunningLoanForm({ memberId }: { memberId: string }) {
  const [state, action, pending] = useActionState(
    addRunningLoan.bind(null, memberId),
    initial,
  );
  const [principal, setPrincipal] = useState("");
  const [tenure, setTenure] = useState("");
  const [startMonth, setStartMonth] = useState("");
  const [paid, setPaid] = useState("0");
  const err = (name: string) => state.errors?.[name]?.[0];

  const preview = useMemo(() => {
    const amount = Number(principal);
    const months = Number(tenure);
    const done = Number(paid) || 0;
    if (!(amount > 0) || !Number.isInteger(months) || months < 1 || months > 20) return null;
    const monthly = annuityPayment(amount, RATE, months);
    const rows = annuitySchedule(amount, RATE, months, Math.min(Math.max(done, 0), months));
    const remaining = rows.length ? rows[rows.length - 1].remaining : amount;
    let last: Date | null = null;
    if (/^\d{4}-\d{2}$/.test(startMonth)) {
      const [year, month] = startMonth.split("-").map(Number);
      last = new Date(year, month - 1 + months - 1, 1);
    }
    return { monthly, total: monthly * months, remaining, last, settled: done >= months };
  }, [principal, tenure, startMonth, paid]);

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">
          Jumlah pinjaman (pokok)
          <div className="mt-2 flex h-12 items-center rounded-xl border border-slate-200 bg-white focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-50">
            <span className="pl-4 text-slate-400">Rp</span>
            <input
              name="principalAmount"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              required
              value={principal}
              onChange={(event) => setPrincipal(event.target.value)}
              className="h-full w-full bg-transparent px-3 text-sm font-normal tabular-nums outline-none"
            />
          </div>
          {err("principalAmount") && (
            <span className="mt-1.5 block text-xs font-normal text-red-600">{err("principalAmount")}</span>
          )}
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Tenor (bulan)
          <input
            name="tenureMonths"
            type="number"
            inputMode="numeric"
            min={1}
            max={20}
            required
            value={tenure}
            onChange={(event) => setTenure(event.target.value)}
            placeholder="Maksimal 20"
            className={field}
          />
          {err("tenureMonths") && (
            <span className="mt-1.5 block text-xs font-normal text-red-600">{err("tenureMonths")}</span>
          )}
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Mulai angsuran (bulan pertama)
          <input
            name="startMonth"
            type="month"
            required
            value={startMonth}
            onChange={(event) => setStartMonth(event.target.value)}
            className={field}
          />
          <span className="mt-1.5 block text-xs font-normal text-slate-500">
            Bulan angsuran ke-1 jatuh tempo.
          </span>
          {err("startMonth") && (
            <span className="block text-xs font-normal text-red-600">{err("startMonth")}</span>
          )}
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Angsuran yang sudah dibayar
          <input
            name="paidInstallments"
            type="number"
            inputMode="numeric"
            min={0}
            max={20}
            value={paid}
            onChange={(event) => setPaid(event.target.value)}
            className={field}
          />
          <span className="mt-1.5 block text-xs font-normal text-slate-500">
            Jumlah angsuran yang sudah lunas sampai hari ini. Isi 0 jika belum ada.
          </span>
          {err("paidInstallments") && (
            <span className="block text-xs font-normal text-red-600">{err("paidInstallments")}</span>
          )}
        </label>
      </div>

      <label className="block text-sm font-semibold text-slate-700">
        Tujuan pinjaman (opsional)
        <input
          name="purpose"
          maxLength={200}
          placeholder="Pinjaman berjalan (migrasi dari Excel)"
          className={field}
        />
      </label>

      {preview && (
        <dl className="grid gap-4 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Cell label="Angsuran / bulan" value={rupiah(preview.monthly)} />
          <Cell label="Total dibayar" value={rupiah(preview.total)} />
          <Cell label="Sisa pokok sekarang" value={rupiah(preview.remaining)} />
          <Cell
            label={preview.settled ? "Status" : "Angsuran terakhir"}
            value={preview.settled ? "Lunas" : preview.last ? monthLabel(preview.last) : "-"}
          />
        </dl>
      )}

      <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
        Bunga {RATE}% per tahun, anuitas. Ini hanya mencatat pinjaman yang sudah berjalan:{" "}
        <b>tidak mengubah saldo kas, jurnal, atau pendapatan bunga</b>, karena uangnya sudah
        dicairkan dan angsuran sebelumnya sudah diterima.
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
        Simpan pinjaman
      </button>
    </form>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-1 font-semibold tabular-nums text-slate-900">{value}</dd>
    </div>
  );
}
