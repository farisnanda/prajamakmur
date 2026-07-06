"use client";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ShieldCheck, X } from "lucide-react";
export function FinancialTransactionGuard() {
  const [form, setForm] = useState<HTMLFormElement | null>(null);
  const approved = useRef(new WeakSet<HTMLFormElement>());
  useEffect(() => {
    const handler = (event: SubmitEvent) => {
      const target = event.target;
      if (
        !(target instanceof HTMLFormElement) ||
        !target.hasAttribute("data-financial-transaction") ||
        approved.current.has(target)
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      setForm(target);
    };
    document.addEventListener("submit", handler, true);
    return () => document.removeEventListener("submit", handler, true);
  }, []);
  const confirm = () => {
    if (!form) return;
    approved.current.add(form);
    setForm(null);
    form.requestSubmit();
    approved.current.delete(form);
  };
  if (!form) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="financial-confirm-title"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-6">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3
                id="financial-confirm-title"
                className="text-xl font-bold text-slate-900"
              >
                Apakah Anda yakin?
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Periksa kembali data transaksi sebelum melanjutkan.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setForm(null)}
            aria-label="Tutup konfirmasi"
            className="text-slate-400"
          >
            <X />
          </button>
        </div>
        <div className="p-6">
          <div className="flex gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <ShieldCheck className="shrink-0 text-blue-700" size={22} />
            <div>
              <p className="text-sm font-bold text-blue-900">
                Catatan penting transaksi
              </p>
              <p className="mt-1 text-sm leading-6 text-blue-700">
                Transaksi yang sudah tercatat tidak dapat dihapus atau diubah
                tanpa persetujuan Ketua Koperasi.
              </p>
            </div>
          </div>
          <p className="mt-5 text-sm text-slate-600">
            Dengan melanjutkan, Anda menyatakan nominal, tanggal, anggota, dan
            keterangan transaksi sudah benar.
          </p>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-5">
          <button
            type="button"
            onClick={() => setForm(null)}
            className="h-11 rounded-xl border bg-white px-5 text-sm font-bold text-slate-700"
          >
            Periksa Kembali
          </button>
          <button
            type="button"
            onClick={confirm}
            className="h-11 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white"
          >
            Ya, Catat Transaksi
          </button>
        </div>
      </div>
    </div>
  );
}
