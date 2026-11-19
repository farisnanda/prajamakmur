import type { Session } from "next-auth";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { MobileNavButton } from "./MobileNavButton";

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
    <header className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur-xl sm:px-6 lg:left-[280px] lg:h-20 lg:px-10">
      <MobileNavButton />

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold text-slate-900 sm:text-lg lg:text-xl">
          {title}
        </h1>
        {subtitle && (
          <p className="hidden truncate text-sm text-slate-500 sm:block">{subtitle}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1 rounded-2xl border border-slate-200/80 bg-white py-1 pl-1 pr-1 shadow-sm sm:gap-3 sm:pr-1.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white">
          {initial}
        </div>
        <div className="hidden min-w-0 max-w-[180px] md:block">
          <p className="truncate text-sm font-semibold leading-tight text-slate-900">
            {user.name}
          </p>
          <p className="truncate text-xs text-slate-500">{roleLabels[user.role]}</p>
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}
