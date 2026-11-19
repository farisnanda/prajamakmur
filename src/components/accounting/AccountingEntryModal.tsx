"use client";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import {
  CashFlowForm,
  ExpenseForm,
} from "@/components/accounting/AccountingForms";
type Account = { id: string; name: string; balance: number };
export function AccountingEntryModal({
  kind,
  accounts,
}: {
  kind: "cash" | "expense";
  accounts: Account[];
}) {
  const [open, setOpen] = useState(false);
  const title =
    kind === "cash" ? "Catat Arus Kas" : "Catat Belanja Operasional";
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white"
      >
        <Plus size={17} />
        {title}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-5">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-card bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{title}</h3>
                <p className="text-sm text-slate-500">
                  Lengkapi data transaksi berikut.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup popup pencatatan"
              >
                <X />
              </button>
            </div>
            <div className="p-6">
              {kind === "cash" ? (
                <CashFlowForm accounts={accounts} />
              ) : (
                <ExpenseForm accounts={accounts} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
