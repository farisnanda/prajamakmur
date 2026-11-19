"use client";

import { useActionState } from "react";
import { LoaderCircle, Send } from "lucide-react";
import {
  createMemberLoanApplication,
  type LoanFormState,
} from "@/app/pinjaman/actions";
import { MoneyInput } from "@/components/ui/MoneyInput";

const initialState: LoanFormState = {};
const input =
  "mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export function MemberLoanApplicationForm({
  remainingLimit,
}: {
  remainingLimit: number;
}) {
  const [state, action, pending] = useActionState(
    createMemberLoanApplication,
    initialState,
  );
  return (
    <form data-financial-transaction action={action} className="mt-5 space-y-4">
      {state.message && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
        >
          {state.message}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm font-semibold text-slate-700">
          Nominal
          <MoneyInput
            name="principalAmount"
            max={remainingLimit}
            className={input}
            placeholder="Nominal pengajuan"
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Tenor (bulan)
          <input
            name="tenureMonths"
            type="number"
            min="1"
            max="20"
            defaultValue="12"
            className={input}
            required
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Bunga / tahun (%)
          <input
            name="interestRate"
            type="number"
            value="10"
            readOnly
            className={`${input} cursor-not-allowed bg-slate-100 text-slate-600`}
            required
          />
        </label>
      </div>
      <label className="block text-sm font-semibold text-slate-700">
        Tujuan Pinjaman
        <input
          name="purpose"
          className={input}
          placeholder="Contoh: renovasi rumah"
          required
        />
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        Catatan
        <textarea
          name="note"
          className="mt-2 min-h-20 w-full rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          placeholder="Opsional"
        />
      </label>
      <button
        disabled={pending || remainingLimit <= 0}
        className="flex h-12 items-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white disabled:opacity-50"
      >
        {pending ? (
          <LoaderCircle size={18} className="animate-spin" />
        ) : (
          <Send size={18} />
        )}
        {pending ? "Mengirim..." : "Ajukan Pinjaman"}
      </button>
    </form>
  );
}
