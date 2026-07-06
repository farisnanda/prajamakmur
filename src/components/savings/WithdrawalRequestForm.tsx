"use client";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { requestVoluntaryWithdrawal } from "@/app/penarikan-sukarela/actions";
const input =
  "mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-900";
export function WithdrawalRequestForm({ max }: { max: number }) {
  return (
    <form
      data-financial-transaction
      action={requestVoluntaryWithdrawal}
      className="space-y-5"
    >
      <label className="block text-sm font-semibold">
        Nominal Penarikan
        <MoneyInput name="amount" max={max} className={input} />
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className="text-sm font-semibold">
          Nama Bank
          <input name="bankName" required className={input} />
        </label>
        <label className="text-sm font-semibold">
          Nomor Rekening
          <input name="accountNumber" required className={input} />
        </label>
      </div>
      <label className="block text-sm font-semibold">
        Nama Pemilik Rekening
        <input name="accountHolder" required className={input} />
      </label>
      <label className="block text-sm font-semibold">
        Catatan
        <input name="note" className={input} placeholder="Opsional" />
      </label>
      <button
        disabled={max <= 0}
        className="h-12 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white disabled:opacity-50"
      >
        Ajukan Penarikan
      </button>
    </form>
  );
}
