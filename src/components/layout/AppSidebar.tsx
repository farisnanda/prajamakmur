"use client";

import {
  LayoutDashboard,
  Users,
  Wallet,
  Landmark,
  BookOpen,
  FileBarChart,
  Settings,
  FileCheck2,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState } from "react";

const menus = [
  { title: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { title: "Anggota", icon: Users, href: "/anggota" },
  { title: "Simpanan", icon: Wallet, href: "/simpanan" },
  {
    title: "Verifikasi Penarikan",
    icon: FileCheck2,
    href: "/simpanan/sukarela/penarikan",
  },
  { title: "Pinjaman", icon: Landmark, href: "/pinjaman" },
  { title: "Akuntansi", icon: BookOpen, href: "/akuntansi" },
  { title: "Hasil Usaha", icon: FileBarChart, href: "/akuntansi/hasil-usaha" },
  { title: "Laporan", icon: FileBarChart, href: "/laporan" },
  { title: "Pengaturan", icon: Settings, href: "/pengaturan" },
];
const memberMenus = [
  { title: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  {
    title: "Pengajuan Pinjaman",
    icon: FileCheck2,
    href: "/pengajuan-pinjaman",
  },
  { title: "Penarikan Sukarela", icon: Wallet, href: "/penarikan-sukarela" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const visibleMenus = session?.user.role === "ANGGOTA" ? memberMenus : menus;
  const [loansOpen, setLoansOpen] = useState(pathname.startsWith("/pinjaman"));
  const [savingsOpen, setSavingsOpen] = useState(
    pathname.startsWith("/simpanan"),
  );
  const [accountingOpen, setAccountingOpen] = useState(
    pathname.startsWith("/akuntansi"),
  );

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
          {visibleMenus.map((menu) => {
            const Icon = menu.icon;
            const active =
              pathname === menu.href || pathname.startsWith(`${menu.href}/`);

            if (
              session?.user.role !== "ANGGOTA" &&
              menu.href === "/akuntansi"
            ) {
              return (
                <div key={menu.title}>
                  <button
                    type="button"
                    onClick={() => setAccountingOpen((open) => !open)}
                    aria-expanded={accountingOpen}
                    className={`flex h-12 w-full items-center gap-3 rounded-2xl px-4 text-sm font-semibold ${active ? "bg-blue-50 text-blue-700" : "text-slate-600"}`}
                  >
                    <Icon size={20} />
                    <span className="flex-1 text-left">Akuntansi</span>
                    <ChevronDown
                      size={17}
                      className={accountingOpen ? "rotate-180" : ""}
                    />
                  </button>
                  <div
                    className={`grid overflow-hidden ${accountingOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                  >
                    <div className="min-h-0 space-y-1 pl-7">
                      <Link
                        href="/akuntansi/arus-kas"
                        className={`block rounded-xl px-4 py-2 text-sm font-semibold ${pathname === "/akuntansi/arus-kas" ? "bg-blue-50 text-blue-700" : "text-slate-500"}`}
                      >
                        Arus Kas
                      </Link>
                      <Link
                        href="/akuntansi/belanja-operasional"
                        className={`block rounded-xl px-4 py-2 text-sm font-semibold ${pathname === "/akuntansi/belanja-operasional" ? "bg-blue-50 text-blue-700" : "text-slate-500"}`}
                      >
                        Belanja Operasional
                      </Link>
                    </div>
                  </div>
                </div>
              );
            }

            if (session?.user.role !== "ANGGOTA" && menu.href === "/simpanan") {
              return (
                <div key={menu.title}>
                  <button
                    type="button"
                    onClick={() => setSavingsOpen((open) => !open)}
                    aria-expanded={savingsOpen}
                    className={`flex h-12 w-full items-center gap-3 rounded-2xl px-4 text-sm font-semibold transition ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}
                  >
                    <Icon size={20} />
                    <span className="flex-1 text-left">Simpanan</span>
                    <ChevronDown
                      size={17}
                      className={`transition-transform ${savingsOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  <div
                    className={`grid overflow-hidden transition-all ${savingsOpen ? "mt-1 grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                  >
                    <div className="min-h-0 space-y-1 pl-7">
                      <Link
                        href="/simpanan"
                        className={`block rounded-xl px-4 py-2 text-sm font-semibold ${pathname === "/simpanan" ? "bg-blue-50 text-blue-700" : "text-slate-500"}`}
                      >
                        Semua Simpanan
                      </Link>
                      <Link
                        href="/simpanan/pokok"
                        className={`block rounded-xl px-4 py-2 text-sm font-semibold ${pathname === "/simpanan/pokok" ? "bg-blue-50 text-blue-700" : "text-slate-500"}`}
                      >
                        Simpanan Pokok
                      </Link>
                      <Link
                        href="/simpanan/wajib"
                        className={`block rounded-xl px-4 py-2 text-sm font-semibold ${pathname === "/simpanan/wajib" ? "bg-blue-50 text-blue-700" : "text-slate-500"}`}
                      >
                        Simpanan Wajib
                      </Link>
                      <Link
                        href="/simpanan/sukarela"
                        className={`block rounded-xl px-4 py-2 text-sm font-semibold ${pathname === "/simpanan/sukarela" ? "bg-blue-50 text-blue-700" : "text-slate-500"}`}
                      >
                        Simpanan Sukarela
                      </Link>
                    </div>
                  </div>
                </div>
              );
            }

            if (session?.user.role !== "ANGGOTA" && menu.href === "/pinjaman") {
              return (
                <div key={menu.title}>
                  <button
                    type="button"
                    onClick={() => setLoansOpen((open) => !open)}
                    aria-expanded={loansOpen}
                    className={`flex h-12 w-full items-center gap-3 rounded-2xl px-4 text-sm font-semibold transition ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}
                  >
                    <Icon size={20} />
                    <span className="flex-1 text-left">Pinjaman</span>
                    <ChevronDown
                      size={17}
                      className={`transition-transform ${loansOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  <div
                    className={`grid overflow-hidden transition-all duration-200 ${loansOpen ? "mt-1 grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                  >
                    <div className="min-h-0 space-y-1 pl-7">
                      <Link
                        href="/pinjaman"
                        className={`block rounded-xl px-4 py-2.5 text-sm font-semibold ${pathname === "/pinjaman" ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50"}`}
                      >
                        Daftar Pengajuan
                      </Link>
                      <Link
                        href="/pinjaman/pembayaran"
                        className={`block rounded-xl px-4 py-2.5 text-sm font-semibold ${pathname === "/pinjaman/pembayaran" ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50"}`}
                      >
                        Pembayaran Pinjaman
                      </Link>
                    </div>
                  </div>
                </div>
              );
            }

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
