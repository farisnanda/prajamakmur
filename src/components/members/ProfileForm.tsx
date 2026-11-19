"use client";

import { useActionState } from "react";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { updateOwnProfile, type ProfileState } from "@/app/profil/actions";

const initial: ProfileState = {};
const field =
  "mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50";

export function ProfileForm({
  defaults,
}: {
  defaults: { nik: string; phone: string; address: string };
}) {
  const [state, action, pending] = useActionState(updateOwnProfile, initial);
  const err = (name: string) => state.errors?.[name]?.[0];

  return (
    <form action={action} className="space-y-5">
      <label className="block text-sm font-semibold text-slate-700">
        NIK
        <input
          name="nik"
          defaultValue={defaults.nik}
          inputMode="numeric"
          maxLength={16}
          placeholder="16 digit NIK sesuai KTP"
          className={field}
        />
        {err("nik") ? (
          <span className="mt-1.5 block text-xs font-normal text-red-600">
            {err("nik")}
          </span>
        ) : (
          <span className="mt-1.5 block text-xs font-normal text-slate-500">
            Lengkapi NIK Anda jika belum terisi.
          </span>
        )}
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        Nomor telepon
        <input
          name="phone"
          defaultValue={defaults.phone}
          inputMode="tel"
          placeholder="08xxxxxxxxxx"
          className={field}
        />
        {err("phone") && (
          <span className="mt-1.5 block text-xs font-normal text-red-600">
            {err("phone")}
          </span>
        )}
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        Alamat
        <textarea
          name="address"
          defaultValue={defaults.address}
          rows={3}
          className={`${field} h-auto py-3`}
        />
        {err("address") && (
          <span className="mt-1.5 block text-xs font-normal text-red-600">
            {err("address")}
          </span>
        )}
      </label>

      {state.message && !state.ok && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {state.message}
        </p>
      )}
      {state.ok && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
        >
          <CheckCircle2 size={18} /> {state.message}
        </p>
      )}

      <button
        disabled={pending}
        className="inline-flex h-12 items-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-slate-300"
      >
        {pending && <LoaderCircle size={18} className="animate-spin" />}
        Simpan Profil
      </button>
    </form>
  );
}
