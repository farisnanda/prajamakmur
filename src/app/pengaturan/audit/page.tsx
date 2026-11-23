import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
import { ListFilters } from "@/components/shared/ListFilters";
import { Pagination } from "@/components/shared/Pagination";
import { AUDIT_ACTIONS } from "@/lib/audit";
import { authOptions } from "@/lib/auth";
import { clampPage, dateRange, firstParam, pageWindow, parsePage } from "@/lib/listing";
import { prisma } from "@/lib/prisma";

const stamp = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; action?: string; from?: string; to?: string; page?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (!["SUPER_ADMIN", "ADMIN_KOPERASI", "AUDITOR"].includes(session.user.role))
    redirect("/dashboard");

  const params = await searchParams;
  const search = firstParam(params.q);
  const from = firstParam(params.from);
  const to = firstParam(params.to);
  const action = Object.keys(AUDIT_ACTIONS).includes(params.action ?? "") ? params.action : undefined;

  const where = {
    action,
    createdAt: dateRange(from, to),
    OR: search
      ? [
          { summary: { contains: search, mode: "insensitive" as const } },
          { actorName: { contains: search, mode: "insensitive" as const } },
        ]
      : undefined,
  };
  const total = await prisma.auditLog.count({ where });
  const page = clampPage(parsePage(params.page), total);
  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    ...pageWindow(page),
  });

  return (
    <>
      <AppSidebar />
      <Topbar
        user={session.user}
        title="Jejak Audit"
        subtitle="Siapa melakukan apa dan kapan pada aksi yang sensitif"
      />
      <main className="min-h-screen bg-slate-50 px-4 pb-12 pt-24 sm:px-6 lg:ml-[280px] lg:px-10 lg:pt-28">
        {session.user.role !== "AUDITOR" && <SettingsTabs active="audit" />}

        <section className="rounded-card border border-slate-200/70 bg-white p-5 shadow-sm sm:p-7">
          <h3 className="text-base font-semibold text-slate-900 sm:text-lg">Riwayat aksi</h3>
          <p className="text-sm text-slate-500">{total.toLocaleString("id-ID")} catatan</p>
          <ListFilters
            basePath="/pengaturan/audit"
            q={search}
            placeholder="Cari pelaku atau keterangan..."
            dates={{ from, to }}
            selects={[
              {
                name: "action",
                label: "Semua jenis aksi",
                value: action ?? "",
                options: Object.entries(AUDIT_ACTIONS).map(([value, label]) => ({ value, label })),
              },
            ]}
          />
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
                  <th className="py-3">Waktu</th>
                  <th>Pelaku</th>
                  <th>Aksi</th>
                  <th>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-50 align-top text-slate-600">
                    <td className="whitespace-nowrap py-3.5">{stamp.format(row.createdAt)}</td>
                    <td>
                      <p className="font-semibold text-slate-900">{row.actorName}</p>
                      <p className="text-xs text-slate-400">{row.actorRole}</p>
                    </td>
                    <td className="whitespace-nowrap">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {AUDIT_ACTIONS[row.action as keyof typeof AUDIT_ACTIONS] ?? row.action}
                      </span>
                    </td>
                    <td className="max-w-xl">{row.summary}</td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      Belum ada catatan yang sesuai.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            basePath="/pengaturan/audit"
            query={{ q: search, action, from, to }}
            page={page}
            total={total}
          />
        </section>
      </main>
    </>
  );
}
