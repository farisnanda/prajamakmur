"use client";

import { useState } from "react";
import { X } from "lucide-react";

export function LoanStatusBadge({
  status,
  label,
  loanNumber,
  rejectionNote,
}: {
  status: string;
  label: string;
  loanNumber: string;
  rejectionNote?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const rejected = status === "REJECTED";
  const className =
    status === "ACTIVE"
      ? "bg-emerald-100 text-emerald-700"
      : rejected
        ? "bg-red-100 text-red-700 hover:bg-red-200"
        : "bg-amber-100 text-amber-700";
  return (
    <>
      <button
        type="button"
        disabled={!rejected}
        onClick={() => rejected && setOpen(true)}
        className={`rounded-full px-3 py-1 text-xs font-bold ${className} ${rejected ? "cursor-pointer" : "cursor-default"}`}
      >
        {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-5">
          <div className="w-full max-w-lg rounded-card bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-6">
              <div>
                <h3 className="text-xl font-bold text-red-900">
                  Detail Penolakan
                </h3>
                <p className="mt-1 text-sm font-semibold text-red-500">
                  {loanNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup detail penolakan"
              >
                <X />
              </button>
            </div>
            <div className="p-6">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Alasan Penolakan
              </p>
              <p className="mt-3 rounded-2xl bg-red-50 p-4 text-sm leading-6 text-red-800">
                {rejectionNote || "Tidak ada catatan penolakan."}
              </p>
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-10 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
