import { ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
const SIZE = 10;
const rp = (v: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const s = await getServerSession(authOptions);
  if (!s) redirect("/login");
  if (s.user.role === "ANGGOTA") redirect("/dashboard");
  const q = await searchParams;
  const from = q.from ? new Date(`${q.from}T00:00:00`) : undefined,
    to = q.to ? new Date(`${q.to}T23:59:59.999`) : undefined;
  const where = {
    recognizedAt: from || to ? { gte: from, lte: to } : undefined,
    loan: q.q
      ? {
          OR: [
            { loanNumber: { contains: q.q, mode: "insensitive" as const } },
            {
              member: {
                OR: [
                  { name: { contains: q.q, mode: "insensitive" as const } },
                  {
                    memberNumber: {
                      contains: q.q,
                      mode: "insensitive" as const,
                    },
                  },
                ],
              },
            },
          ],
        }
      : undefined,
  };
  const requested = Math.max(1, parseInt(q.page ?? "1") || 1);
  const [count, total] = await Promise.all([
    prisma.businessIncome.count({ where }),
    prisma.businessIncome.aggregate({ where, _sum: { amount: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(count / SIZE));
  const page = Math.min(requested, pages);
  const rows = await prisma.businessIncome.findMany({
    where,
    select: {
      id: true,
      recognizedAt: true,
      amount: true,
      loanPayment: { select: { amount: true, receiptNumber: true } },
      loan: {
        select: {
          loanNumber: true,
          principalAmount: true,
          member: { select: { name: true, memberNumber: true } },
        },
      },
    },
    orderBy: { recognizedAt: "desc" },
    skip: (page - 1) * SIZE,
    take: SIZE,
  });
  return (
    <>
      <AppSidebar />
      <Topbar
        user={s.user}
        title="Hasil Usaha"
        subtitle="Bunga jasa yang terealisasi dari pembayaran angsuran"
      />
      <main className="ml-[280px] min-h-screen bg-slate-50 px-8 pb-10 pt-32">
        <section className="rounded-[28px] bg-gradient-to-br from-emerald-600 to-emerald-800 p-7 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-emerald-100">
                Total Hasil Usaha dari Bunga
              </p>
              <p className="mt-2 text-3xl font-bold">
                {rp(total._sum.amount?.toNumber() ?? 0)}
              </p>
              <p className="mt-2 text-sm text-emerald-100">
                {count} pembayaran berbunga tercatat
              </p>
            </div>
            <TrendingUp size={40} />
          </div>
        </section>
        <section className="mt-6 rounded-[28px] bg-white p-7 shadow-sm">
          <h3 className="text-lg font-bold">Riwayat Hasil Usaha</h3>
          <p className="text-sm text-slate-500">
            Diakui saat pembayaran angsuran diterima · 10 data per halaman
          </p>
          <form className="mt-5 grid grid-cols-5 gap-3">
            <input
              name="q"
              defaultValue={q.q}
              placeholder="Cari anggota / nomor pinjaman"
              className="col-span-2 h-11 rounded-xl border px-3 text-sm"
            />
            <input
              name="from"
              type="date"
              defaultValue={q.from}
              className="h-11 rounded-xl border px-3 text-sm"
            />
            <input
              name="to"
              type="date"
              defaultValue={q.to}
              className="h-11 rounded-xl border px-3 text-sm"
            />
            <button className="h-11 rounded-xl bg-slate-900 font-bold text-white">
              Terapkan
            </button>
          </form>
          <table className="mt-5 w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase text-slate-400">
                <th className="py-3">Tanggal</th>
                <th>Anggota</th>
                <th>Pinjaman</th>
                <th>Pembayaran</th>
                <th className="text-right">Pendapatan Bunga</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="py-4">
                    {new Intl.DateTimeFormat("id-ID").format(r.recognizedAt)}
                  </td>
                  <td>
                    <b>{r.loan.member.name}</b>
                    <p className="text-xs text-slate-400">
                      {r.loan.member.memberNumber}
                    </p>
                  </td>
                  <td>{r.loan.loanNumber}</td>
                  <td>
                    {rp(r.loanPayment?.amount.toNumber() ?? 0)}
                    <p className="text-xs text-slate-400">
                      {r.loanPayment?.receiptNumber}
                    </p>
                  </td>
                  <td className="text-right font-bold text-emerald-700">
                    {rp(r.amount.toNumber())}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-5 flex justify-between border-t pt-5">
            <p className="text-sm text-slate-500">
              Halaman {page} dari {pages}
            </p>
            <div className="flex gap-2">
              <Link
                href={`/akuntansi/hasil-usaha?page=${Math.max(1, page - 1)}`}
                className={page <= 1 ? "pointer-events-none opacity-40" : ""}
              >
                <ChevronLeft />
              </Link>
              <Link
                href={`/akuntansi/hasil-usaha?page=${Math.min(pages, page + 1)}`}
                className={
                  page >= pages ? "pointer-events-none opacity-40" : ""
                }
              >
                <ChevronRight />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
