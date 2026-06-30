"use client";

import { useActionState, useMemo, useState } from "react";
import { CheckSquare, LoaderCircle, Search, Users, X } from "lucide-react";
import { createBulkMandatorySavings, type BulkMandatorySavingsState } from "@/app/simpanan/actions";

type MemberOption = {
  id: string;
  memberNumber: string;
  name: string;
  employmentStatus: "PNS" | "PPPK" | "PPPK_PARUH_WAKTU";
};

const initialState: BulkMandatorySavingsState = {};
const inputClass = "mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100";
const currentLocalDate = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString();
};

const employmentLabel: Record<MemberOption["employmentStatus"], string> = {
  PNS: "PNS",
  PPPK: "PPPK",
  PPPK_PARUH_WAKTU: "PPPK Paruh Waktu",
};

export function BulkMandatorySavingsForm({ members }: { members: MemberOption[] }) {
  const [state, formAction, pending] = useActionState(createBulkMandatorySavings, initialState);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(members.map((member) => member.id));
  const [period, setPeriod] = useState(currentLocalDate().slice(0, 7));
  const [transactionDate, setTransactionDate] = useState(currentLocalDate().slice(0, 10));

  const filteredMembers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return members;

    return members.filter((member) =>
      `${member.memberNumber} ${member.name} ${employmentLabel[member.employmentStatus]}`
        .toLowerCase()
        .includes(keyword),
    );
  }, [members, query]);

  const filteredIds = filteredMembers.map((member) => member.id);
  const allFilteredChecked = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.includes(id));

  const toggleMember = (id: string) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const toggleAllFiltered = () => {
    setSelectedIds((current) => {
      if (allFilteredChecked) {
        return current.filter((id) => !filteredIds.includes(id));
      }

      return Array.from(new Set([...current, ...filteredIds]));
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!members.length}
        className="flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <CheckSquare size={18} />
        Catat Wajib Bulanan
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[32px] bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-7 py-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Simpanan Wajib Bulanan</h3>
                <p className="mt-1 text-sm text-slate-500">Pilih tanggal transaksi lalu tentukan anggota yang akan dicatat.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                aria-label="Tutup"
              >
                <X size={20} />
              </button>
            </div>

            <form action={formAction}>
              <div className="space-y-6 px-7 py-6">
                {state.message && (
                  <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {state.message}
                  </p>
                )}

                <div className="grid gap-5 md:grid-cols-3">
                  <Field label="Periode Bulan" error={state.errors?.period?.[0]}>
                    <input name="period" type="month" className={inputClass} value={period} onChange={(event) => setPeriod(event.target.value)} required />
                  </Field>
                  <Field label="Tanggal Transaksi" error={state.errors?.transactionDate?.[0]}>
                    <input name="transactionDate" type="date" className={inputClass} value={transactionDate} onChange={(event) => setTransactionDate(event.target.value)} required />
                  </Field>
                  <Field label="Catatan">
                    <input name="note" className={inputClass} placeholder="Opsional, mis. potongan gaji bulan ini" />
                  </Field>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                        <Users size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{selectedIds.length} anggota dipilih</p>
                        <p>{filteredMembers.length} anggota tampil di daftar</p>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col gap-3 md:max-w-xl md:flex-row">
                      <label className="relative block flex-1">
                        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                          className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          placeholder="Cari nama atau nomor anggota"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={toggleAllFiltered}
                        className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                      >
                        {allFilteredChecked ? "Batalkan Centang Tampil" : "Centang Semua Tampil"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 max-h-[360px] overflow-y-auto rounded-2xl border border-slate-200 bg-white">
                    {filteredMembers.length ? (
                      <div className="divide-y divide-slate-100">
                        {filteredMembers.map((member) => {
                          const checked = selectedIds.includes(member.id);

                          return (
                            <label
                              key={member.id}
                              className="flex cursor-pointer items-start gap-4 px-5 py-4 transition hover:bg-slate-50"
                            >
                              <input
                                type="checkbox"
                                name="memberIds"
                                value={member.id}
                                checked={checked}
                                onChange={() => toggleMember(member.id)}
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900">{member.name}</p>
                                <p className="text-sm text-slate-500">
                                  {member.memberNumber} · {employmentLabel[member.employmentStatus]}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="px-6 py-12 text-center text-sm font-medium text-slate-500">
                        Tidak ada anggota yang cocok dengan pencarian.
                      </div>
                    )}
                  </div>
                  {state.errors?.memberIds?.[0] && <p className="mt-3 text-xs font-semibold text-red-600">{state.errors.memberIds[0]}</p>}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 px-7 py-5">
                <p className="text-sm text-slate-500">Anggota yang sudah tercatat pada periode yang sama akan otomatis dilewati.</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="h-12 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    disabled={pending || !selectedIds.length}
                    className="flex h-12 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {pending ? <LoaderCircle size={18} className="animate-spin" /> : <CheckSquare size={18} />}
                    {pending ? "Menyimpan..." : "Catat Sekarang"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      {children}
      {error && <span className="mt-1 block text-xs font-medium text-red-600">{error}</span>}
    </label>
  );
}
