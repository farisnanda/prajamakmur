"use client";

import { Menu } from "lucide-react";
import { NAV_TOGGLE_EVENT } from "./navEvents";

export function MobileNavButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(NAV_TOGGLE_EVENT))}
      aria-controls="app-sidebar"
      aria-label="Buka menu navigasi"
      className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 lg:hidden"
    >
      <Menu size={20} />
    </button>
  );
}
