"use client";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { SavingsForm } from "@/components/savings/SavingsForm";
export function SavingsEntryModal({
  type,
  members,
}: {
  type: "POKOK" | "SUKARELA";
  members: {
    id: string;
    memberNumber: string;
    name: string;
    employmentStatus: "PNS" | "PPPK" | "PPPK_PARUH_WAKTU";
  }[];
}) {
  const [open, setOpen] = useState(false);
  const label = type === "POKOK" ? "Simpanan Pokok" : "Simpanan Sukarela";
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white"
      >
        <Plus size={17} />
        Tambah {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-5">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white p-7">
            <div className="mb-6 flex justify-between">
              <div>
                <h3 className="text-xl font-bold">Tambah {label}</h3>
                <p className="text-sm text-slate-500">
                  Catat transaksi anggota
                </p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Tutup">
                <X />
              </button>
            </div>
            <SavingsForm members={members} lockedType={type} />
          </div>
        </div>
      )}
    </>
  );
}
