"use client";

import { useActionState } from "react";
import { LoaderCircle, Save } from "lucide-react";
import type { MemberFormState } from "@/app/anggota/actions";

type MemberDefaults = {
  memberNumber?: string;
  nik?: string;
  employeeNumber?: string | null;
  name?: string;
  employmentStatus?: "PNS" | "PPPK" | "PPPK_PARUH_WAKTU";
  phone?: string | null;
  address?: string | null;
  joinedAt?: string;
  isActive?: boolean;
};

const initialState: MemberFormState = {};
const fieldClass =
  "mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100";

export function MemberForm({
  action,
  defaults = {},
  autoNumber,
}: {
  action: (
    state: MemberFormState,
    formData: FormData,
  ) => Promise<MemberFormState>;
  defaults?: MemberDefaults;
  /** Tampilkan nomor anggota otomatis (read-only) alih-alih isian manual. */
  autoNumber?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const error = (name: string) => state.errors?.[name]?.[0];

  return (
    <form action={formAction} className="space-y-7">
      {state.message && (
        <p
          role="alert"
          className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {state.message}
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Nomor Anggota" error={error("memberNumber")}>
          {autoNumber ? (
            <>
              <input
                className={`${fieldClass} cursor-not-allowed font-semibold tabular-nums text-slate-700`}
                value={autoNumber}
                readOnly
                aria-describedby="member-number-hint"
              />
              <span id="member-number-hint" className="mt-1.5 block text-xs text-slate-500">
                Dibuat otomatis saat disimpan, melanjutkan nomor terakhir.
              </span>
            </>
          ) : (
            <input
              className={fieldClass}
              name="memberNumber"
              defaultValue={defaults.memberNumber}
              placeholder="PM-0001"
              required
            />
          )}
        </Field>
        <Field label="Nama Lengkap" error={error("name")}>
          <input
            className={fieldClass}
            name="name"
            defaultValue={defaults.name}
            placeholder="Nama sesuai dokumen"
            required
          />
        </Field>
        <Field label="NIK" error={error("nik")}>
          <input
            className={fieldClass}
            name="nik"
            defaultValue={defaults.nik}
            inputMode="numeric"
            maxLength={16}
            placeholder="Opsional, 16 digit. Bisa dilengkapi nanti"
          />
        </Field>
        <Field label="NIP / NI PPPK" error={error("employeeNumber")}>
          <input
            className={fieldClass}
            name="employeeNumber"
            defaultValue={defaults.employeeNumber ?? ""}
            placeholder="Opsional"
          />
        </Field>
        <Field label="Status Kepegawaian" error={error("employmentStatus")}>
          <select
            className={fieldClass}
            name="employmentStatus"
            defaultValue={defaults.employmentStatus ?? "PNS"}
          >
            <option value="PNS">PNS</option>
            <option value="PPPK">PPPK</option>
            <option value="PPPK_PARUH_WAKTU">PPPK Paruh Waktu</option>
          </select>
        </Field>
        <Field label="Nomor Telepon" error={error("phone")}>
          <input
            className={fieldClass}
            name="phone"
            defaultValue={defaults.phone ?? ""}
            inputMode="tel"
            placeholder="08xxxxxxxxxx"
          />
        </Field>
        <Field label="Tanggal Bergabung" error={error("joinedAt")}>
          <input
            className={fieldClass}
            name="joinedAt"
            type="date"
            defaultValue={
              defaults.joinedAt ?? new Date().toISOString().slice(0, 10)
            }
            required
          />
        </Field>
        <Field label="Status Keanggotaan" error={error("isActive")}>
          <select
            className={fieldClass}
            name="isActive"
            defaultValue={String(defaults.isActive ?? true)}
          >
            <option value="true">Aktif</option>
            <option value="false">Nonaktif</option>
          </select>
        </Field>
      </div>

      <Field label="Alamat" error={error("address")}>
        <textarea
          className="mt-2 min-h-28 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
          name="address"
          defaultValue={defaults.address ?? ""}
          placeholder="Alamat lengkap anggota"
        />
      </Field>

      <div className="flex justify-end border-t border-slate-100 pt-6">
        <button
          disabled={pending}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? (
            <LoaderCircle size={18} className="animate-spin" />
          ) : (
            <Save size={18} />
          )}
          {pending ? "Menyimpan..." : "Simpan Anggota"}
        </button>
      </div>
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
        <span className="mt-1 block text-xs font-medium text-red-600">
          {error}
        </span>
      )}
    </label>
  );
}
