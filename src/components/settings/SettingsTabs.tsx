import Link from "next/link";

const tabs = [
  { key: "landing", href: "/pengaturan", label: "Konten Landing" },
  { key: "simpanan", href: "/pengaturan/simpanan", label: "Nominal Simpanan" },
  { key: "pinjaman", href: "/pengaturan/pinjaman", label: "Aturan Pinjaman" },
  { key: "berita", href: "/pengaturan/berita", label: "Berita & Kegiatan" },
  { key: "akun", href: "/pengaturan/akun", label: "Akun Pengguna" },
  { key: "audit", href: "/pengaturan/audit", label: "Jejak Audit" },
] as const;

export type SettingsTab = (typeof tabs)[number]["key"];

export function SettingsTabs({ active }: { active: SettingsTab }) {
  return (
    <nav
      aria-label="Menu pengaturan"
      className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === active ? "page" : undefined}
          className={`shrink-0 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
            tab.key === active
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
