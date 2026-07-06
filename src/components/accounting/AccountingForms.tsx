"use client";
import { MoneyInput } from "@/components/ui/MoneyInput";
import {
  createCashTransaction,
  createOperationalExpense,
} from "@/app/akuntansi/actions";
const input =
  "mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900";
const today = () =>
  new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
type A = { id: string; name: string; balance: number };
export function CashFlowForm({ accounts }: { accounts: A[] }) {
  return (
    <form
      data-financial-transaction
      action={createCashTransaction}
      className="space-y-4"
    >
      <label className="block text-sm font-semibold">
        Rekening Kas
        <select name="accountId" className={input}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} · Rp{a.balance.toLocaleString("id-ID")}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className="text-sm font-semibold">
          Jenis
          <select name="type" className={input}>
            <option value="INFLOW">Kas Masuk</option>
            <option value="OUTFLOW">Kas Keluar</option>
          </select>
        </label>
        <label className="text-sm font-semibold">
          Tanggal
          <input
            name="transactionDate"
            type="date"
            defaultValue={today()}
            className={input}
          />
        </label>
      </div>
      <label className="block text-sm font-semibold">
        Nominal
        <MoneyInput name="amount" className={input} />
      </label>
      <label className="block text-sm font-semibold">
        Keterangan
        <input name="description" required className={input} />
      </label>
      <label className="block text-sm font-semibold">
        Catatan
        <input name="note" className={input} />
      </label>
      <button className="h-11 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white">
        Catat Arus Kas
      </button>
    </form>
  );
}
export function ExpenseForm({ accounts }: { accounts: A[] }) {
  return (
    <form
      data-financial-transaction
      action={createOperationalExpense}
      className="space-y-4"
    >
      <label className="block text-sm font-semibold">
        Kategori
        <select name="category" className={input}>
          <option value="KESEJAHTERAAN_MANAJER">Kesejahteraan Manajer</option>
          <option value="KESEJAHTERAAN_PEGAWAI">Kesejahteraan Pegawai</option>
          <option value="MAKAN_MINUM">Makan Minum</option>
          <option value="BANTUAN_TRANSPORTASI">Bantuan Transportasi</option>
          <option value="HONORARIUM_NARASUMBER">Honorarium Narasumber</option>
          <option value="HONORARIUM_SIDANG">Honorarium Sidang</option>
        </select>
      </label>
      <label className="block text-sm font-semibold">
        Sumber Kas
        <select name="accountId" className={input}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} · Rp{a.balance.toLocaleString("id-ID")}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className="text-sm font-semibold">
          Tanggal
          <input
            name="transactionDate"
            type="date"
            defaultValue={today()}
            className={input}
          />
        </label>
        <label className="text-sm font-semibold">
          Penerima
          <input name="recipient" className={input} />
        </label>
      </div>
      <label className="block text-sm font-semibold">
        Nominal
        <MoneyInput name="amount" className={input} />
      </label>
      <label className="block text-sm font-semibold">
        Keterangan
        <input name="description" required className={input} />
      </label>
      <label className="block text-sm font-semibold">
        Catatan
        <input name="note" className={input} />
      </label>
      <button className="h-11 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white">
        Catat Belanja
      </button>
    </form>
  );
}
