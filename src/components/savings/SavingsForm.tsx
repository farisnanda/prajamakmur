"use client";

import { useActionState, useState } from "react";
import { LoaderCircle, Save } from "lucide-react";
import { createSavingsTransaction, type SavingsFormState } from "@/app/simpanan/actions";

const initialState: SavingsFormState = {};
const inputClass = "mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100";
const currentLocalDate = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString();
};

export function SavingsForm({ members }: { members: { id: string; memberNumber: string; name: string; employmentStatus: "PNS" | "PPPK" | "PPPK_PARUH_WAKTU" }[] }) {
  const [state, action, pending] = useActionState(createSavingsTransaction, initialState);
  const [type, setType] = useState("WAJIB");
  const [transactionType, setTransactionType] = useState("SETORAN");
  const [memberId, setMemberId] = useState("");
  const selectedMember = members.find((member) => member.id === memberId);
  const mandatoryAmount = !selectedMember
    ? undefined
    : selectedMember.employmentStatus === "PNS"
      ? 300000
      : 200000;
  const fixedAmount = type === "POKOK" ? 500000 : type === "WAJIB" ? mandatoryAmount : undefined;

  return (
    <form action={action} className="space-y-6">
      {state.message && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{state.message}</p>}
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Anggota" error={state.errors?.memberId?.[0]}>
          <select name="memberId" className={inputClass} required value={memberId} onChange={(event) => setMemberId(event.target.value)}><option value="" disabled>Pilih anggota aktif</option>{members.map((m) => <option key={m.id} value={m.id}>{m.memberNumber} — {m.name} ({m.employmentStatus === "PPPK_PARUH_WAKTU" ? "PPPK Paruh Waktu" : m.employmentStatus})</option>)}</select>
        </Field>
        <Field label="Jenis Simpanan" error={state.errors?.savingsType?.[0]}>
          <select name="savingsType" className={inputClass} value={type} onChange={(e) => { setType(e.target.value); if (e.target.value !== "SUKARELA") setTransactionType("SETORAN"); }}><option value="POKOK">Simpanan Pokok</option><option value="WAJIB">Simpanan Wajib</option><option value="SUKARELA">Simpanan Sukarela</option></select>
        </Field>
        <Field label="Jenis Transaksi" error={state.errors?.transactionType?.[0]}>
          <select name="transactionType" className={inputClass} value={transactionType} onChange={(e) => setTransactionType(e.target.value)}><option value="SETORAN">Setoran</option>{type === "SUKARELA" && <option value="PENARIKAN">Penarikan</option>}</select>
        </Field>
        <Field label="Nominal" error={state.errors?.amount?.[0]}>
          <input key={type} name="amount" type="number" min="1" className={inputClass} defaultValue={fixedAmount ?? ""} readOnly={fixedAmount !== undefined} placeholder="Masukkan nominal" required />
        </Field>
        {type === "WAJIB" && <Field label="Periode Bulan" error={state.errors?.period?.[0]}><input name="period" type="month" className={inputClass} defaultValue={currentLocalDate().slice(0, 7)} required /></Field>}
        <Field label="Tanggal Transaksi" error={state.errors?.transactionDate?.[0]}><input name="transactionDate" type="date" className={inputClass} defaultValue={currentLocalDate().slice(0, 10)} required /></Field>
      </div>
      {type === "WAJIB" && <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">Nominal otomatis: {selectedMember ? (selectedMember.employmentStatus === "PNS" ? "PNS Rp300.000" : "PPPK/PPPK Paruh Waktu Rp200.000") : "pilih anggota untuk menentukan golongan"}.</p>}
      <Field label="Catatan" error={state.errors?.note?.[0]}><textarea name="note" className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="Catatan opsional" /></Field>
      <div className="flex justify-end border-t border-slate-100 pt-6"><button disabled={pending || !members.length} className="flex h-12 items-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white shadow-lg shadow-blue-600/20 disabled:opacity-50">{pending ? <LoaderCircle size={18} className="animate-spin" /> : <Save size={18} />}{pending ? "Menyimpan..." : "Simpan Transaksi"}</button></div>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className="block text-sm font-semibold text-slate-700">{label}{children}{error && <span className="mt-1 block text-xs text-red-600">{error}</span>}</label>; }
