import { Bell, Search } from "lucide-react";
import type { Session } from "next-auth";
import { LogoutButton } from "@/components/auth/LogoutButton";

const roleLabels = {
  SUPER_ADMIN: "Super Admin",
  ADMIN_KOPERASI: "Admin Koperasi",
  BENDAHARA: "Bendahara",
  PENGURUS: "Pengurus",
  ANGGOTA: "Anggota",
  AUDITOR: "Auditor",
  KETUA_KOPERASI: "Ketua Koperasi",
};

export function Topbar({
  user,
  title = "Dashboard",
  subtitle = "Ringkasan Koperasi Praja Makmur",
}: {
  user: Session["user"];
  title?: string;
  subtitle?: string;
}) {
  const initial = user.name?.charAt(0).toUpperCase() ?? "P";

  return (
    <header className="fixed left-[280px] right-0 top-0 z-10 flex h-24 items-center justify-between border-b border-slate-200 bg-white px-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex h-12 w-[320px] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4">
          <Search size={18} className="text-slate-400" />
          <input
            placeholder="Cari anggota, transaksi..."
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>

        <button className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-600">
          <Bell size={20} />
          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-blue-600" />
        </button>

        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">
            {initial}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{user.name}</p>
            <p className="text-xs text-slate-500">{roleLabels[user.role]}</p>
          </div>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
