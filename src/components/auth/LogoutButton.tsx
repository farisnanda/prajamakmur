"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/prajamakmur/login" })}
      className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-600"
      aria-label="Keluar dari aplikasi"
      title="Keluar"
    >
      <LogOut size={18} />
    </button>
  );
}
