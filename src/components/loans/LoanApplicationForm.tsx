"use client";

import { useActionState, useState } from "react";
import { LoaderCircle, Send } from "lucide-react";
import {
  createLoanApplication,
  type LoanFormState,
} from "@/app/pinjaman/actions";
import { MoneyInput } from "@/components/ui/MoneyInput";

const initialState: LoanFormState = {};
const inputClass =
  "mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100";
const today = () =>
  new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);

export function LoanApplicationForm({
  members,
}: {
  members: {
    id: string;
    memberNumber: string;
    name: string;
    employmentStatus: "PNS" | "PPPK" | "PPPK_PARUH_WAKTU";
  }[];
}) {
  const [state, action, pending] = useActionState(
    createLoanApplication,
    initialState,
  );
  const [memberId, setMemberId] = useState("");
  const selectedMember = members.find((member) => member.id === memberId);
  const maximumAmount =
    selectedMember?.employmentStatus === "PNS" ? 50_000_000 : 40_000_000;
  return (
    <form data-financial-transaction action={action} className="space-y-5">
      {state.message && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
        >
          {state.message}
        </p>
      )}
      <Field label="Anggota" error={state.errors?.memberId?.[0]}>
        <select
          name="memberId"
          className={inputClass}
          required
          value={memberId}
          onChange={(event) => setMemberId(event.target.value)}
        >
          <option value="" disabled>
            Pilih anggota aktif
          </option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.memberNumber} — {member.name} (
              {member.employmentStatus === "PPPK_PARUH_WAKTU"
                ? "PPPK Paruh Waktu"
                : member.employmentStatus}
              )
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Nominal Pinjaman"
          error={state.errors?.principalAmount?.[0]}
        >
          <MoneyInput
            name="principalAmount"
            max={maximumAmount}
            className={inputClass}
            placeholder="Contoh: 10000000"
          />
        </Field>
        <Field label="Tenor (bulan)" error={state.errors?.tenureMonths?.[0]}>
          <input
            name="tenureMonths"
            type="number"
            min="1"
            max="20"
            defaultValue="12"
            className={inputClass}
            required
          />
        </Field>
        <Field
          label="Bunga per tahun (%)"
          error={state.errors?.interestRate?.[0]}
        >
          <input
            name="interestRate"
            type="number"
            value="10"
            readOnly
            className={`${inputClass} cursor-not-allowed bg-slate-100 text-slate-600`}
            required
          />
        </Field>
        <Field
          label="Tanggal Pengajuan"
          error={state.errors?.applicationDate?.[0]}
        >
          <input
            name="applicationDate"
            type="date"
            defaultValue={today()}
            className={inputClass}
            required
          />
        </Field>
      </div>
      <p className="rounded-xl bg-blue-50 px-4 py-3 text-xs font-semibold leading-5 text-blue-700">
        Batas{" "}
        {selectedMember?.employmentStatus === "PNS"
          ? "PNS"
          : "PPPK/PPPK Paruh Waktu"}
        : maksimal Rp{maximumAmount.toLocaleString("id-ID")} dengan tenor
        maksimal 20 bulan. Angsuran dihitung menggunakan bunga anuitas.
      </p>
      <Field label="Tujuan Pinjaman" error={state.errors?.purpose?.[0]}>
        <input
          name="purpose"
          className={inputClass}
          placeholder="Contoh: Renovasi rumah"
          required
        />
      </Field>
      <Field label="Catatan" error={state.errors?.note?.[0]}>
        <textarea
          name="note"
          className="mt-2 min-h-20 w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          placeholder="Catatan opsional"
        />
      </Field>
      <button
        disabled={pending || !members.length}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-sm disabled:opacity-50"
      >
        {pending ? (
          <LoaderCircle size={18} className="animate-spin" />
        ) : (
          <Send size={18} />
        )}
        {pending ? "Menyimpan..." : "Ajukan Pinjaman"}
      </button>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      {children}
      {error && (
        <span className="mt-1 block text-xs text-red-600">{error}</span>
      )}
    </label>
  );
}
