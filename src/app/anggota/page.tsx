import { BriefcaseBusiness, Pencil, Plus, Search, UserCheck, Users } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const employmentLabels = {
  PNS: "PNS",
  PPPK: "PPPK",
  PPPK_PARUH_WAKTU: "PPPK Paruh Waktu",
};

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; success?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const filters = await searchParams;
  const query = filters.q?.trim() ?? "";
  const employmentStatus = ["PNS", "PPPK", "PPPK_PARUH_WAKTU"].includes(filters.status ?? "")
    ? (filters.status as "PNS" | "PPPK" | "PPPK_PARUH_WAKTU")
    : undefined;

  const [members, total, active, pns, pppk] = await Promise.all([
    prisma.member.findMany({
      where: {
        employmentStatus,
        OR: query
          ? [
              { name: { contains: query, mode: "insensitive" } },
              { memberNumber: { contains: query, mode: "insensitive" } },
              { nik: { contains: query } },
              { employeeNumber: { contains: query, mode: "insensitive" } },
            ]
          : undefined,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.member.count(),
    prisma.member.count({ where: { isActive: true } }),
    prisma.member.count({ where: { employmentStatus: "PNS" } }),
    prisma.member.count({ where: { employmentStatus: { in: ["PPPK", "PPPK_PARUH_WAKTU"] } } }),
  ]);

  return (
    <>
      <AppSidebar />
      <Topbar user={session.user} title="Master Anggota" subtitle="Kelola data anggota Koperasi Praja Makmur" />

      <main className="ml-[280px] min-h-screen bg-slate-50 px-8 pb-10 pt-32">
        {filters.success && (
          <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
            Data anggota berhasil {filters.success === "updated" ? "diperbarui" : "ditambahkan"}.
          </div>
        )}

        <section className="grid grid-cols-4 gap-5">
          <Stat label="Total Anggota" value={total} icon={Users} />
          <Stat label="Anggota Aktif" value={active} icon={UserCheck} />
          <Stat label="PNS" value={pns} icon={BriefcaseBusiness} />
          <Stat label="PPPK & Paruh Waktu" value={pppk} icon={BriefcaseBusiness} />
        </section>

        <section className="mt-6 rounded-[28px] border border-slate-100 bg-white p-7 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Daftar Anggota</h3>
              <p className="text-sm text-slate-500">Maksimal 100 data terbaru ditampilkan</p>
            </div>
            <Link href="/anggota/tambah" className="flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">
              <Plus size={18} /> Tambah Anggota
            </Link>
          </div>

          <form className="mt-6 flex gap-3">
            <div className="flex h-11 flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4">
              <Search size={18} className="text-slate-400" />
              <input name="q" defaultValue={query} className="w-full bg-transparent text-sm outline-none" placeholder="Cari nama, nomor anggota, NIK, atau NIP..." />
            </div>
            <select name="status" defaultValue={employmentStatus ?? ""} className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 outline-none">
              <option value="">Semua Kepegawaian</option>
              <option value="PNS">PNS</option>
              <option value="PPPK">PPPK</option>
              <option value="PPPK_PARUH_WAKTU">PPPK Paruh Waktu</option>
            </select>
            <button className="h-11 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white">Terapkan</button>
          </form>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400"><th className="py-4">Anggota</th><th>Identitas</th><th>Kepegawaian</th><th>Bergabung</th><th>Status</th><th className="text-right">Aksi</th></tr></thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-b border-slate-50 text-slate-600">
                    <td className="py-4"><p className="font-bold text-slate-900">{member.name}</p><p className="text-xs text-slate-400">{member.memberNumber}</p></td>
                    <td><p>{member.nik}</p><p className="text-xs text-slate-400">{member.employeeNumber || "NIP/NI belum diisi"}</p></td>
                    <td><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{employmentLabels[member.employmentStatus]}</span></td>
                    <td>{new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(member.joinedAt)}</td>
                    <td><span className={`rounded-full px-3 py-1 text-xs font-bold ${member.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{member.isActive ? "Aktif" : "Nonaktif"}</span></td>
                    <td className="text-right"><Link href={`/anggota/${member.id}/edit`} className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-blue-50 hover:text-blue-600" aria-label={`Edit ${member.name}`}><Pencil size={17} /></Link></td>
                  </tr>
                ))}
                {!members.length && <tr><td colSpan={6} className="py-16 text-center text-slate-400">Belum ada anggota yang sesuai.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Users }) {
  return <div className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-slate-900">{value}</p></div><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Icon size={23} /></div></div></div>;
}
