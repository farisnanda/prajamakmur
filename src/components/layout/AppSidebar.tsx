"use client";

import {
  LayoutDashboard,
  Users,
  Wallet,
  Landmark,
  ReceiptText,
  BookOpen,
  FileBarChart,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const menus = [
  { title: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { title: "Anggota", icon: Users, href: "/anggota" },
  { title: "Simpanan", icon: Wallet, href: "/simpanan" },
  { title: "Pinjaman", icon: Landmark, href: "/pinjaman" },
  { title: "Angsuran", icon: ReceiptText, href: "/angsuran" },
  { title: "Akuntansi", icon: BookOpen, href: "/akuntansi" },
  { title: "Laporan", icon: FileBarChart, href: "/laporan" },
  { title: "Pengaturan", icon: Settings, href: "/pengaturan" },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-[280px] border-r border-slate-200 bg-white">
      <div className="flex h-24 items-center gap-3 px-7">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white">
          PM
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Praja Makmur</h1>
          <p className="text-sm text-slate-500">Koperasi Digital</p>
        </div>
      </div>

      <nav className="px-5">
        <p className="mb-4 px-3 text-xs font-bold uppercase tracking-wider text-slate-400">
          Menu Utama
        </p>

        <div className="space-y-2">
          {menus.map((menu) => {
            const Icon = menu.icon;
            const active = pathname === menu.href || pathname.startsWith(`${menu.href}/`);

            return (
              <Link
                key={menu.title}
                href={menu.href}
                className={`flex h-12 w-full items-center gap-3 rounded-2xl px-4 text-sm font-semibold transition ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon size={20} />
                {menu.title}
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
