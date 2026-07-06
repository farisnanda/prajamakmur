"use client";

import { useState } from "react";
import { Banknote, CheckSquare, Eye, X } from "lucide-react";
import {
  createBulkLoanPayments,
  createLoanPayment,
} from "@/app/pinjaman/pembayaran/actions";

export type BorrowerPaymentRow = {
  id: string;
  name: string;
  memberNumber: string;
  installment: number;
  paid: number;
  paymentCount: number;
  outstanding: number;
  loans: {
    id: string;
    loanNumber: string;
    tenureMonths: number;
    installment: number;
    paid: number;
    paymentCount: number;
    outstanding: number;
  }[];
};
const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
const localToday = () =>
  new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);

export function LoanPaymentsTable({
  borrowers,
}: {
  borrowers: BorrowerPaymentRow[];
}) {
  const [bulkOpen, setBulkOpen] = useState(false);
  const [detail, setDetail] = useState<BorrowerPaymentRow | null>(null);
  const [payment, setPayment] = useState<BorrowerPaymentRow | null>(null);
  const [selected, setSelected] = useState(
    borrowers.map((borrower) => borrower.id),
  );
  const toggleAll = () =>
    setSelected(
      selected.length === borrowers.length
        ? []
        : borrowers.map((borrower) => borrower.id),
    );
  return (
    <>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setBulkOpen(true)}
          className="flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white"
        >
          <CheckSquare size={18} />
          Bayar Serentak
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase text-slate-400">
              <th className="py-4">Peminjam</th>
              <th>Pinjaman</th>
              <th>Angsuran/Bulan</th>
              <th>Sudah Dibayar</th>
              <th>Sisa Kewajiban</th>
              <th>Detail</th>
              <th className="text-right">Catat Pembayaran</th>
            </tr>
          </thead>
          <tbody>
            {borrowers.map((borrower) => (
              <tr
                key={borrower.id}
                className="border-b border-slate-50 align-top"
              >
                <td className="py-5">
                  <p className="font-bold text-slate-900">{borrower.name}</p>
                  <p className="text-xs text-slate-500">
                    {borrower.memberNumber}
                  </p>
                </td>
                <td className="py-5">
                  <p className="font-semibold text-slate-800">
                    {borrower.loans.length} pinjaman aktif
                  </p>
                  <p className="max-w-44 text-xs text-slate-400">
                    {borrower.loans.map((loan) => loan.loanNumber).join(", ")}
                  </p>
                </td>
                <td className="py-5 font-bold text-blue-700">
                  {rupiah(borrower.installment)}
                </td>
                <td className="py-5">
                  <p className="font-bold text-emerald-700">
                    {rupiah(borrower.paid)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {borrower.paymentCount} pembayaran
                  </p>
                </td>
                <td className="py-5 font-bold text-amber-700">
                  {rupiah(borrower.outstanding)}
                </td>
                <td className="py-4">
                  <button
                    type="button"
                    onClick={() => setDetail(borrower)}
                    className="inline-flex h-9 items-center gap-1 rounded-lg bg-slate-100 px-3 text-xs font-bold text-slate-700"
                  >
                    <Eye size={15} />
                    Detail
                  </button>
                </td>
                <td className="py-4 text-right">
                  <button
                    type="button"
                    onClick={() => setPayment(borrower)}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white"
                  >
                    <Banknote size={16} />
                    Bayar Pinjaman
                  </button>
                </td>
              </tr>
            ))}
            {!borrowers.length && (
              <tr>
                <td colSpan={7} className="py-16 text-center text-slate-400">
                  Belum ada peminjam yang sesuai.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {bulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-5">
          <div className="w-full max-w-3xl rounded-[28px] bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Pembayaran Pinjaman Serentak
                </h3>
                <p className="text-sm text-slate-500">
                  Satu angsuran bulanan untuk setiap pinjaman aktif anggota
                  terpilih.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBulkOpen(false)}
                aria-label="Tutup pembayaran serentak"
              >
                <X />
              </button>
            </div>
            <form
              data-financial-transaction
              action={createBulkLoanPayments}
              className="p-6"
            >
              <div className="grid grid-cols-3 gap-4">
                <label className="text-sm font-semibold">
                  Periode
                  <input
                    name="period"
                    type="month"
                    defaultValue={localToday().slice(0, 7)}
                    required
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-slate-900"
                  />
                </label>
                <label className="text-sm font-semibold">
                  Tanggal
                  <input
                    name="paymentDate"
                    type="date"
                    defaultValue={localToday()}
                    required
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-slate-900"
                  />
                </label>
                <label className="text-sm font-semibold">
                  Catatan
                  <input
                    name="note"
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-slate-900"
                    placeholder="Potongan gaji"
                  />
                </label>
              </div>
              <div className="mt-5 flex items-center justify-between">
                <p className="text-sm font-bold text-slate-700">
                  {selected.length} anggota dipilih
                </p>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700"
                >
                  {selected.length === borrowers.length
                    ? "Tidak Centang Semua"
                    : "Centang Semua"}
                </button>
              </div>
              <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-slate-200">
                {borrowers.map((borrower) => (
                  <label
                    key={borrower.id}
                    className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-4 py-3"
                  >
                    <input
                      type="checkbox"
                      name="memberIds"
                      value={borrower.id}
                      checked={selected.includes(borrower.id)}
                      onChange={() =>
                        setSelected((current) =>
                          current.includes(borrower.id)
                            ? current.filter((id) => id !== borrower.id)
                            : [...current, borrower.id],
                        )
                      }
                    />
                    <div>
                      <p className="font-bold text-slate-900">
                        {borrower.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {borrower.memberNumber} · {borrower.loans.length}{" "}
                        pinjaman · {rupiah(borrower.installment)}/bulan
                      </p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="mt-5 flex justify-end">
                <button
                  disabled={!selected.length}
                  className="h-11 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white disabled:opacity-50"
                >
                  Catat Pembayaran Terpilih
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-5">
          <div className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Detail Pinjaman {detail.name}
                </h3>
                <p className="text-sm text-slate-500">{detail.memberNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetail(null)}
                aria-label="Tutup detail"
              >
                <X />
              </button>
            </div>
            <div className="mt-5 space-y-4">
              {detail.loans.map((loan, index) => {
                const installmentPaid = Math.min(
                  loan.tenureMonths,
                  Math.floor(loan.paid / Math.max(1, loan.installment)),
                );
                const progress = loan.tenureMonths
                  ? (installmentPaid / loan.tenureMonths) * 100
                  : 0;
                return (
                  <div
                    key={loan.id}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase text-blue-600">
                          Pinjaman ke-{index + 1}
                        </p>
                        <p className="mt-1 font-bold text-slate-900">
                          {loan.loanNumber}
                        </p>
                      </div>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">
                        {installmentPaid}/{loan.tenureMonths} angsuran
                      </span>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full bg-blue-600"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-400">Angsuran</p>
                        <b>{rupiah(loan.installment)}</b>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Terbayar</p>
                        <b className="text-emerald-700">{rupiah(loan.paid)}</b>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Sisa</p>
                        <b className="text-amber-700">
                          {rupiah(loan.outstanding)}
                        </b>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {payment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-5">
          <div className="w-full max-w-xl rounded-[28px] bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Bayar Pinjaman
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {payment.name} · {payment.memberNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPayment(null)}
                aria-label="Tutup pembayaran pinjaman"
              >
                <X />
              </button>
            </div>
            <form
              data-financial-transaction
              action={createLoanPayment}
              className="space-y-5 p-6"
            >
              <label className="block text-sm font-semibold text-slate-700">
                Pilih Pinjaman
                <select
                  name="loanId"
                  required
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-900"
                >
                  {payment.loans.map((loan, index) => (
                    <option key={loan.id} value={loan.id}>
                      Pinjaman ke-{index + 1} · {loan.loanNumber} · sisa{" "}
                      {rupiah(loan.outstanding)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm font-semibold text-slate-700">
                  Nominal Pembayaran
                  <input
                    name="amount"
                    type="number"
                    min="1"
                    required
                    className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-900"
                    placeholder="Masukkan nominal"
                  />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Tanggal Pembayaran
                  <input
                    name="paymentDate"
                    type="date"
                    defaultValue={localToday()}
                    required
                    className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-900"
                  />
                </label>
              </div>
              <label className="block text-sm font-semibold text-slate-700">
                Catatan
                <input
                  name="note"
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-900"
                  placeholder="Catatan opsional"
                />
              </label>
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={() => setPayment(null)}
                  className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700"
                >
                  Batal
                </button>
                <button className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white">
                  <Banknote size={18} />
                  Bayar Pinjaman
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
