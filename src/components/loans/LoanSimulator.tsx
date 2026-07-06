"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";

const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
const rupiahDecimal = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
const periodLabel = (date: Date) =>
  new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric" }).format(
    date,
  );
const inputClass =
  "mt-2 h-12 w-full rounded-xl border border-white/40 bg-white px-4 text-sm font-bold text-slate-950 caret-blue-700 outline-none focus:border-blue-200 focus:bg-white focus:ring-4 focus:ring-white/20";

export function LoanSimulator() {
  const [employment, setEmployment] = useState<"PNS" | "PPPK">("PNS");
  const maximum = employment === "PNS" ? 50_000_000 : 40_000_000;
  const [amount, setAmount] = useState(20_000_000);
  const [months, setMonths] = useState(12);
  const annualRate = 10;
  const safeAmount = Math.min(Math.max(amount || 0, 0), maximum);
  const monthlyPayment = useMemo(() => {
    if (!safeAmount || !months) return 0;
    const rate = annualRate / 100 / 12;
    if (rate === 0) return safeAmount / months;
    return (
      (safeAmount * rate * (1 + rate) ** months) / ((1 + rate) ** months - 1)
    );
  }, [safeAmount, months, annualRate]);
  const totalPayment = monthlyPayment * months;
  const schedule = useMemo(() => {
    const rows: {
      period: string;
      interest: number;
      principal: number;
      payment: number;
      balance: number;
    }[] = [];
    const firstPeriod = new Date();
    firstPeriod.setDate(1);
    rows.push({
      period: periodLabel(firstPeriod),
      interest: 0,
      principal: 0,
      payment: 0,
      balance: safeAmount,
    });
    let balance = safeAmount;
    const monthlyRate = annualRate / 100 / 12;
    for (
      let installment = 1;
      installment <= months && balance > 0;
      installment += 1
    ) {
      const period = new Date(firstPeriod);
      period.setMonth(firstPeriod.getMonth() + installment);
      const interest = balance * monthlyRate;
      const principal =
        installment === months
          ? balance
          : Math.min(monthlyPayment - interest, balance);
      const payment = principal + interest;
      balance = Math.max(0, balance - principal);
      rows.push({
        period: periodLabel(period),
        interest,
        principal,
        payment,
        balance,
      });
    }
    return rows;
  }, [safeAmount, months, annualRate, monthlyPayment]);
  const scheduleTotals = useMemo(
    () =>
      schedule
        .slice(1)
        .reduce(
          (total, row) => ({
            interest: total.interest + row.interest,
            principal: total.principal + row.principal,
            payment: total.payment + row.payment,
          }),
          { interest: 0, principal: 0, payment: 0 },
        ),
    [schedule],
  );

  return (
    <section className="mt-6 rounded-[28px] bg-gradient-to-br from-blue-700 to-blue-950 p-7 text-white shadow-xl shadow-blue-900/10">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <Calculator size={21} />
            <h3 className="text-lg font-bold">Simulasi Pinjaman Anggota</h3>
          </div>
          <p className="mt-1 text-sm text-blue-100">
            Perkirakan angsuran bulanan dengan skema bunga anuitas
          </p>
        </div>
        <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold">
          Maksimal 20 bulan
        </span>
      </div>
      <div className="mt-6 grid grid-cols-4 gap-4">
        <label className="text-sm font-semibold text-blue-100">
          Status Kepegawaian
          <select
            aria-label="Status Kepegawaian Simulasi"
            className={inputClass}
            value={employment}
            onChange={(event) => {
              const value = event.target.value as "PNS" | "PPPK";
              setEmployment(value);
              setAmount((current) =>
                Math.min(current, value === "PNS" ? 50_000_000 : 40_000_000),
              );
            }}
          >
            <option value="PNS">PNS — maks. Rp50 juta</option>
            <option value="PPPK">PPPK / Paruh Waktu — maks. Rp40 juta</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-blue-100">
          Nominal
          <input
            aria-label="Nominal Simulasi"
            className={inputClass}
            type="number"
            min="1"
            max={maximum}
            value={amount}
            onChange={(event) => setAmount(Number(event.target.value))}
          />
        </label>
        <label className="text-sm font-semibold text-blue-100">
          Tenor
          <input
            aria-label="Tenor Simulasi"
            className={inputClass}
            type="number"
            min="1"
            max="20"
            value={months}
            onChange={(event) =>
              setMonths(Math.min(20, Math.max(1, Number(event.target.value))))
            }
          />
        </label>
        <label className="text-sm font-semibold text-blue-100">
          Bunga / tahun
          <input
            aria-label="Bunga Simulasi"
            className={`${inputClass} cursor-not-allowed bg-slate-100 text-slate-600`}
            type="number"
            value={annualRate}
            readOnly
          />
        </label>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-4 rounded-2xl bg-white/10 p-5">
        <Result
          label="Angsuran per bulan"
          value={rupiah(Math.ceil(monthlyPayment))}
          strong
        />
        <Result
          label="Total pembayaran"
          value={rupiah(Math.ceil(totalPayment))}
        />
        <Result
          label="Estimasi total bunga"
          value={rupiah(Math.max(0, Math.ceil(totalPayment - safeAmount)))}
        />
      </div>
      <div className="mt-6 overflow-hidden rounded-2xl border border-white/20 bg-white text-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h4 className="font-bold text-slate-900">
              Tabel Simulasi Angsuran
            </h4>
            <p className="text-xs text-slate-500">
              Rincian bunga anuitas dan pengurangan pokok setiap bulan
            </p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
            {months} kali angsuran
          </span>
        </div>
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full min-w-[760px] text-right text-sm">
            <thead className="sticky top-0 bg-blue-900 text-xs uppercase tracking-wide text-white">
              <tr>
                <th className="px-4 py-3 text-left">Periode</th>
                <th className="px-4 py-3">Angsuran Bunga</th>
                <th className="px-4 py-3">Angsuran Pokok</th>
                <th className="px-4 py-3">Total Angsuran</th>
                <th className="px-4 py-3">Sisa Pinjaman</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((row, index) => (
                <tr
                  key={`${row.period}-${index}`}
                  className={index % 2 === 0 ? "bg-white" : "bg-blue-50/70"}
                >
                  <td className="border-b border-blue-100 px-4 py-3 text-left font-semibold">
                    {row.period}
                  </td>
                  <td className="border-b border-blue-100 px-4 py-3">
                    {rupiahDecimal(row.interest)}
                  </td>
                  <td className="border-b border-blue-100 px-4 py-3">
                    {rupiahDecimal(row.principal)}
                  </td>
                  <td className="border-b border-blue-100 px-4 py-3 font-semibold">
                    {rupiahDecimal(row.payment)}
                  </td>
                  <td className="border-b border-blue-100 px-4 py-3 font-semibold">
                    {rupiahDecimal(row.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-cyan-100 font-bold text-slate-900">
              <tr>
                <td className="px-4 py-3 text-left">Total</td>
                <td className="px-4 py-3">
                  {rupiahDecimal(scheduleTotals.interest)}
                </td>
                <td className="px-4 py-3">
                  {rupiahDecimal(scheduleTotals.principal)}
                </td>
                <td className="px-4 py-3">
                  {rupiahDecimal(scheduleTotals.payment)}
                </td>
                <td className="px-4 py-3">—</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      {amount > maximum && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-red-500/20 px-4 py-3 text-sm font-semibold text-red-100"
        >
          Nominal melebihi batas{" "}
          {employment === "PNS"
            ? "PNS Rp50 juta"
            : "PPPK/Paruh Waktu Rp40 juta"}
          .
        </p>
      )}
      <p className="mt-4 text-xs leading-5 text-blue-200">
        Hasil simulasi bersifat perkiraan. Pembulatan dan tanggal realisasi
        dapat memengaruhi nilai akhir.
      </p>
    </section>
  );
}

function Result({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-blue-200">{label}</p>
      <p className={`mt-1 font-bold ${strong ? "text-2xl" : "text-lg"}`}>
        {value}
      </p>
    </div>
  );
}
