"use client";

import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import { useState } from "react";

const RATE = 10; // % per tahun, anuitas (sama dengan aturan pinjaman di sistem)
const MAX_TENOR = 20;
const LIMIT = { PNS: 50_000_000, PPPK: 40_000_000 } as const;
type Status = keyof typeof LIMIT;

const rupiah = (value: number) =>
  `Rp${Math.round(value).toLocaleString("id-ID")}`;

function monthlyInstallment(amount: number, months: number) {
  const r = RATE / 100 / 12;
  return (amount * r) / (1 - Math.pow(1 + r, -months));
}

export function LandingSimulator() {
  const [status, setStatus] = useState<Status>("PNS");
  const [amount, setAmount] = useState(20_000_000);
  const [months, setMonths] = useState(12);

  const max = LIMIT[status];
  const safeAmount = Math.min(amount, max);
  const installment = monthlyInstallment(safeAmount, months);
  const total = installment * months;

  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-blue-200/70 via-blue-100/40 to-transparent blur-sm sm:-inset-6"
      />
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-md sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-600">
              Simulasi pinjaman
            </p>
            <p className="mt-1.5 text-lg font-semibold tracking-[-0.01em] text-slate-950">
              Hitung angsuran Anda
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Bunga {RATE}%/thn
          </span>
        </div>

        <fieldset className="mt-6">
          <legend className="text-sm font-medium text-slate-600">Status kepegawaian</legend>
          <div className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            {(["PNS", "PPPK"] as const).map((value) => (
              <label
                key={value}
                className={`cursor-pointer rounded-lg px-3 py-2 text-center text-sm font-semibold transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-blue-500 ${
                  status === value
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <input
                  type="radio"
                  name="landing-status"
                  value={value}
                  checked={status === value}
                  onChange={() => setStatus(value)}
                  className="sr-only"
                />
                {value === "PNS" ? "PNS" : "PPPK / Paruh Waktu"}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-6">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="landing-amount" className="text-sm font-medium text-slate-600">
              Jumlah pinjaman
            </label>
            <output htmlFor="landing-amount" className="text-base font-semibold tabular-nums text-slate-950">
              {rupiah(safeAmount)}
            </output>
          </div>
          <input
            id="landing-amount"
            type="range"
            min={1_000_000}
            max={max}
            step={500_000}
            value={safeAmount}
            onChange={(event) => setAmount(Number(event.target.value))}
            className="landing-range mt-3 w-full"
            style={{ "--fill": `${((safeAmount - 1_000_000) / (max - 1_000_000)) * 100}%` } as React.CSSProperties}
          />
          <div className="mt-1.5 flex justify-between text-xs text-slate-400 tabular-nums">
            <span>Rp1 jt</span>
            <span>Maks. {rupiah(max).replace(".000.000", " jt")}</span>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="landing-months" className="text-sm font-medium text-slate-600">
              Lama angsuran
            </label>
            <output htmlFor="landing-months" className="text-base font-semibold tabular-nums text-slate-950">
              {months} bulan
            </output>
          </div>
          <input
            id="landing-months"
            type="range"
            min={1}
            max={MAX_TENOR}
            step={1}
            value={months}
            onChange={(event) => setMonths(Number(event.target.value))}
            className="landing-range mt-3 w-full"
            style={{ "--fill": `${((months - 1) / (MAX_TENOR - 1)) * 100}%` } as React.CSSProperties}
          />
          <div className="mt-1.5 flex justify-between text-xs text-slate-400 tabular-nums">
            <span>1 bln</span>
            <span>{MAX_TENOR} bln</span>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-gradient-to-br from-blue-700 to-blue-950 p-5 text-white">
          <p className="text-xs font-medium text-blue-200">Perkiraan angsuran per bulan</p>
          <p
            aria-live="polite"
            className="mt-1.5 text-[clamp(1.875rem,2vw+1.25rem,2.5rem)] font-semibold leading-none tracking-[-0.03em] tabular-nums"
          >
            {rupiah(installment)}
          </p>
          <div className="mt-4 flex justify-between gap-4 border-t border-white/15 pt-3 text-xs text-blue-100 tabular-nums">
            <span>Total dibayar</span>
            <span className="font-semibold text-white">{rupiah(total)}</span>
          </div>
        </div>

        <Link
          href="/login"
          className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Ajukan pinjaman ini <ArrowRight size={17} />
        </Link>
        <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-slate-500">
          <Info size={13} className="mt-0.5 shrink-0" />
          Simulasi bunga anuitas. Angsuran final mengikuti persetujuan pengurus.
        </p>
      </div>
    </div>
  );
}
