import {
  Banknote,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ReceiptText,
  Search,
} from "lucide-react";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import {
  LoanPaymentsTable,
  type BorrowerPaymentRow,
} from "@/components/loans/LoanPaymentsTable";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 10;
const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export default async function LoanPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    success?: string;
    created?: string;
    skipped?: string;
    error?: string;
  }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (
    !["SUPER_ADMIN", "ADMIN_KOPERASI", "BENDAHARA"].includes(session.user.role)
  )
    redirect("/dashboard");
  const query = await searchParams;
  const keyword = query.q?.trim() ?? "";
  const requestedPage = Math.max(
    1,
    Number.parseInt(query.page ?? "1", 10) || 1,
  );
  const searchClause = keyword
    ? Prisma.sql`AND (m."name" ILIKE ${`%${keyword}%`} OR m."memberNumber" ILIKE ${`%${keyword}%`})`
    : Prisma.empty;
  const countRows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM (
      SELECT m.id FROM "members" m
      JOIN "loans" l ON l."memberId"=m.id AND l.status::text='ACTIVE'
      LEFT JOIN (SELECT "loanId",SUM(amount) paid FROM "loan_payments" GROUP BY "loanId") p ON p."loanId"=l.id
      WHERE m."isActive"=true ${searchClause}
      GROUP BY m.id HAVING SUM(COALESCE(l."monthlyPayment",0)*l."tenureMonths"-COALESCE(p.paid,0))>0
    ) active_borrowers`;
  const totalBorrowers = Number(countRows[0]?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalBorrowers / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const idRows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT m.id FROM "members" m
    JOIN "loans" l ON l."memberId"=m.id AND l.status::text='ACTIVE'
    LEFT JOIN (SELECT "loanId",SUM(amount) paid FROM "loan_payments" GROUP BY "loanId") p ON p."loanId"=l.id
    WHERE m."isActive"=true ${searchClause}
    GROUP BY m.id,m."name" HAVING SUM(COALESCE(l."monthlyPayment",0)*l."tenureMonths"-COALESCE(p.paid,0))>0
    ORDER BY m."name" ASC LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`;
  const members = await prisma.member.findMany({
    where: { id: { in: idRows.map((x) => x.id) } },
    select: {
      id: true,
      name: true,
      memberNumber: true,
      loans: {
        where: { status: "ACTIVE" },
        select: {
          id: true,
          loanNumber: true,
          tenureMonths: true,
          monthlyPayment: true,
        },
        orderBy: { startDate: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });
  const loanIds = members.flatMap((member) =>
    member.loans.map((loan) => loan.id),
  );
  const paymentTotals = loanIds.length
    ? await prisma.loanPayment.groupBy({
        by: ["loanId"],
        where: { loanId: { in: loanIds } },
        _sum: { amount: true },
        _count: { _all: true },
      })
    : [];
  const paymentByLoan = new Map(
    paymentTotals.map((item) => [
      item.loanId,
      { paid: item._sum.amount?.toNumber() ?? 0, count: item._count._all },
    ]),
  );
  const borrowers: BorrowerPaymentRow[] = members.map((member) => {
    const loans = member.loans
      .map((loan) => {
        const installment = loan.monthlyPayment?.toNumber() ?? 0;
        const payment = paymentByLoan.get(loan.id) ?? { paid: 0, count: 0 };
        return {
          id: loan.id,
          loanNumber: loan.loanNumber,
          tenureMonths: loan.tenureMonths,
          installment,
          paid: payment.paid,
          paymentCount: payment.count,
          outstanding: Math.max(
            0,
            installment * loan.tenureMonths - payment.paid,
          ),
        };
      })
      .filter((loan) => loan.outstanding > 0);
    return {
      id: member.id,
      name: member.name,
      memberNumber: member.memberNumber,
      loans,
      installment: loans.reduce((sum, loan) => sum + loan.installment, 0),
      paid: loans.reduce((sum, loan) => sum + loan.paid, 0),
      paymentCount: loans.reduce((sum, loan) => sum + loan.paymentCount, 0),
      outstanding: loans.reduce((sum, loan) => sum + loan.outstanding, 0),
    };
  });
  const pageOutstanding = borrowers.reduce(
    (sum, borrower) => sum + borrower.outstanding,
    0,
  );
  const pagePayments = borrowers.reduce(
    (sum, borrower) => sum + borrower.paymentCount,
    0,
  );
  const pageHref = (target: number) =>
    `/pinjaman/pembayaran?page=${target}${keyword ? `&q=${encodeURIComponent(keyword)}` : ""}`;
  const recentPayments = await prisma.loanPayment.findMany({
    take: 10,
    orderBy: { paymentDate: "desc" },
    select: {
      id: true,
      receiptNumber: true,
      paymentDate: true,
      amount: true,
      principalComponent: true,
      interestComponent: true,
      loan: {
        select: {
          loanNumber: true,
          member: { select: { name: true, memberNumber: true } },
        },
      },
    },
  });

  return (
    <>
      <AppSidebar />
      <Topbar
        user={session.user}
        title="Pembayaran Pinjaman"
        subtitle="Daftar kewajiban dan pencatatan angsuran peminjam"
      />
      <main className="ml-[280px] min-h-screen bg-slate-50 px-8 pb-10 pt-32">
        {query.success && (
          <Notice tone="success">
            {query.success === "bulk"
              ? `${query.created ?? 0} pembayaran dicatat, ${query.skipped ?? 0} dilewati.`
              : "Pembayaran pinjaman berhasil dicatat."}
          </Notice>
        )}
        {query.error && (
          <Notice tone="error">
            {query.error === "exceeds"
              ? "Nominal melebihi sisa kewajiban."
              : "Data pembayaran tidak valid."}
          </Notice>
        )}
        <section className="grid grid-cols-3 gap-5">
          <Stat
            label="Total Peminjam Aktif"
            value={`${totalBorrowers} anggota`}
            icon={ReceiptText}
          />
          <Stat
            label="Sisa Kewajiban Halaman Ini"
            value={rupiah(pageOutstanding)}
            icon={Banknote}
          />
          <Stat
            label="Pembayaran Halaman Ini"
            value={`${pagePayments} transaksi`}
            icon={CheckCircle2}
          />
        </section>
        <section className="mt-6 rounded-[28px] border border-slate-100 bg-white p-7 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Daftar Anggota yang Memiliki Kewajiban
              </h3>
              <p className="text-sm text-slate-500">
                Maksimal 10 peminjam per halaman
              </p>
            </div>
            <form className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4">
              <Search size={17} className="text-slate-400" />
              <input
                name="q"
                defaultValue={keyword}
                className="bg-transparent text-sm text-slate-900 outline-none"
                placeholder="Cari nama atau nomor"
              />
              <button className="text-xs font-bold text-blue-700">Cari</button>
            </form>
          </div>
          <div className="mt-6">
            <LoanPaymentsTable borrowers={borrowers} />
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
            <p className="text-sm text-slate-500">
              Halaman {page} dari {totalPages} · {totalBorrowers} peminjam
            </p>
            <div className="flex gap-2">
              <PageLink href={pageHref(page - 1)} disabled={page <= 1}>
                <ChevronLeft size={16} /> Sebelumnya
              </PageLink>
              <PageLink href={pageHref(page + 1)} disabled={page >= totalPages}>
                Berikutnya <ChevronRight size={16} />
              </PageLink>
            </div>
          </div>
        </section>
        <section className="mt-6 rounded-[28px] border border-slate-100 bg-white p-7 shadow-sm">
          <h3 className="text-lg font-bold">Riwayat Pembayaran Pinjaman</h3>
          <p className="text-sm text-slate-500">
            10 transaksi pembayaran terakhir beserta tanggal pencatatan
          </p>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Anggota</th>
                  <th>Pinjaman</th>
                  <th>Pokok</th>
                  <th>Bunga Jasa</th>
                  <th className="text-right">Total Bayar</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {new Intl.DateTimeFormat("id-ID", {
                        dateStyle: "medium",
                      }).format(p.paymentDate)}
                    </td>
                    <td>
                      <b>{p.loan.member.name}</b>
                      <p className="text-xs text-slate-400">
                        {p.loan.member.memberNumber}
                      </p>
                    </td>
                    <td>
                      {p.loan.loanNumber}
                      <p className="text-xs text-slate-400">
                        {p.receiptNumber}
                      </p>
                    </td>
                    <td>{rupiah(p.principalComponent.toNumber())}</td>
                    <td className="font-semibold text-emerald-700">
                      {rupiah(p.interestComponent.toNumber())}
                    </td>
                    <td className="text-right font-bold">
                      {rupiah(p.amount.toNumber())}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}
function Notice({
  tone,
  children,
}: {
  tone: "success" | "error";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`mb-6 rounded-2xl border px-5 py-4 text-sm font-semibold ${tone === "success" ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-red-100 bg-red-50 text-red-700"}`}
    >
      {children}
    </div>
  );
}
function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return disabled ? (
    <span className="inline-flex h-10 items-center gap-1 rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-400">
      {children}
    </span>
  ) : (
    <Link
      href={href}
      className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700"
    >
      {children}
    </Link>
  );
}
function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof ReceiptText;
}) {
  return (
    <div className="rounded-[24px] border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <Icon size={23} />
        </div>
      </div>
    </div>
  );
}
