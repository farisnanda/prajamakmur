"use client";

import {
  BookOpen,
  ChevronDown,
  FileCheck2,
  Landmark,
  LayoutDashboard,
  Settings,
  UserRound,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV_TOGGLE_EVENT } from "./navEvents";

type NavLink = { title: string; href: string; icon?: LucideIcon };
type NavGroup = { title: string; icon: LucideIcon; children: NavLink[] };
type NavItem = NavLink | NavGroup;
type NavSection = { label: string; items: NavItem[] };

const adminNav: NavSection[] = [
  {
    label: "Utama",
    items: [{ title: "Dashboard", icon: LayoutDashboard, href: "/dashboard" }],
  },
  {
    label: "Keanggotaan",
    items: [{ title: "Anggota", icon: Users, href: "/anggota" }],
  },
  {
    label: "Transaksi",
    items: [
      {
        title: "Simpanan",
        icon: Wallet,
        children: [
          { title: "Semua Simpanan", href: "/simpanan" },
          { title: "Simpanan Pokok", href: "/simpanan/pokok" },
          { title: "Simpanan Wajib", href: "/simpanan/wajib" },
          { title: "Simpanan Sukarela", href: "/simpanan/sukarela" },
          {
            title: "Verifikasi Penarikan",
            href: "/simpanan/sukarela/penarikan",
          },
        ],
      },
      {
        title: "Pinjaman",
        icon: Landmark,
        children: [
          { title: "Daftar Pengajuan", href: "/pinjaman" },
          { title: "Pembayaran Pinjaman", href: "/pinjaman/pembayaran" },
        ],
      },
    ],
  },
  {
    label: "Keuangan",
    items: [
      {
        title: "Akuntansi",
        icon: BookOpen,
        children: [
          { title: "Arus Kas", href: "/akuntansi/arus-kas" },
          { title: "Belanja Operasional", href: "/akuntansi/belanja-operasional" },
          { title: "Hasil Usaha", href: "/akuntansi/hasil-usaha" },
        ],
      },
    ],
  },
  {
    label: "Sistem",
    items: [
      {
        title: "Pengaturan",
        icon: Settings,
        children: [
          { title: "Landing Page", href: "/pengaturan" },
          { title: "Nominal Simpanan", href: "/pengaturan/simpanan" },
          { title: "Aturan Pinjaman", href: "/pengaturan/pinjaman" },
          { title: "Akun Pengguna", href: "/pengaturan/akun" },
          { title: "Berita & Kegiatan", href: "/pengaturan/berita" },
        ],
      },
    ],
  },
];

const memberNav: NavSection[] = [
  {
    label: "Menu",
    items: [
      { title: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
      { title: "Pengajuan Pinjaman", icon: FileCheck2, href: "/pengajuan-pinjaman" },
      { title: "Penarikan Sukarela", icon: Wallet, href: "/penarikan-sukarela" },
      { title: "Profil Saya", icon: UserRound, href: "/profil" },
    ],
  },
];

const isGroup = (item: NavItem): item is NavGroup => "children" in item;

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const sections = session?.user.role === "ANGGOTA" ? memberNav : adminNav;
  const [mobileOpen, setMobileOpen] = useState(false);

  // Mobile drawer: opened from the topbar menu button.
  useEffect(() => {
    const toggle = () => setMobileOpen((open) => !open);
    window.addEventListener(NAV_TOGGLE_EVENT, toggle);
    return () => window.removeEventListener(NAV_TOGGLE_EVENT, toggle);
  }, []);

  // Close the drawer after navigating (adjust state during render, not in an effect).
  const [navPath, setNavPath] = useState(pathname);
  if (navPath !== pathname) {
    setNavPath(pathname);
    setMobileOpen(false);
  }

  useEffect(() => {
    document.body.dataset.navOpen = mobileOpen ? "true" : "false";
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <>
      <div
        aria-hidden="true"
        onClick={() => setMobileOpen(false)}
        className={`fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        id="app-sidebar"
        aria-label="Navigasi utama"
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-slate-200/80 bg-white transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:translate-x-0 ${
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center gap-3 px-6 lg:h-20">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-[13px] font-bold tracking-tight text-white shadow-sm shadow-blue-600/30">
            PM
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold leading-tight text-slate-900">
              Praja Makmur
            </p>
            <p className="text-xs text-slate-500">Koperasi Digital</p>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
            aria-label="Tutup menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-6">
          {sections.map((section) => (
            <div key={section.label} className="mt-4 first:mt-1">
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) =>
                  isGroup(item) ? (
                    <SidebarGroup key={item.title} group={item} pathname={pathname} />
                  ) : (
                    <SidebarLink key={item.href} link={item} pathname={pathname} />
                  ),
                )}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-slate-100 px-6 py-4">
          <p className="text-[11px] leading-relaxed text-slate-400">
            Koperasi Pegawai Praja Makmur
          </p>
        </div>
      </aside>
    </>
  );
}

function SidebarLink({ link, pathname }: { link: NavLink; pathname: string }) {
  const Icon = link.icon;
  const active = pathname === link.href || pathname.startsWith(`${link.href}/`);

  return (
    <Link
      href={link.href}
      aria-current={active ? "page" : undefined}
      className={`group flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
        active
          ? "bg-blue-50 text-blue-700"
          : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
      }`}
    >
      {Icon && (
        <Icon
          size={18}
          className={active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}
        />
      )}
      {link.title}
    </Link>
  );
}

function SidebarGroup({ group, pathname }: { group: NavGroup; pathname: string }) {
  const Icon = group.icon;
  const active = group.children.some(
    (child) => pathname === child.href || pathname.startsWith(`${child.href}/`),
  );
  const [open, setOpen] = useState(active);
  // Auto-expand when navigation lands inside this group.
  const [wasActive, setWasActive] = useState(active);
  if (wasActive !== active) {
    setWasActive(active);
    if (active) setOpen(true);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={`group flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
          active
            ? "text-slate-900"
            : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
        }`}
      >
        <Icon
          size={18}
          className={active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}
        />
        <span className="flex-1 text-left">{group.title}</span>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="my-1 ml-[21px] space-y-0.5 border-l border-slate-200 pl-3">
            {group.children.map((child) => {
              const childActive = pathname === child.href;
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  tabIndex={open ? undefined : -1}
                  aria-current={childActive ? "page" : undefined}
                  className={`relative flex h-9 items-center rounded-lg px-3 text-[13px] transition-colors ${
                    childActive
                      ? "bg-blue-50 font-semibold text-blue-700 before:absolute before:-left-[13px] before:h-5 before:w-0.5 before:rounded-full before:bg-blue-600"
                      : "font-medium text-slate-500 hover:bg-slate-100/70 hover:text-slate-900"
                  }`}
                >
                  {child.title}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
