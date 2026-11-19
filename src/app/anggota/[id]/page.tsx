import {
  ArrowLeft,
  Landmark,
  Pencil,
  PiggyBank,
  Wallet,
} from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { authOptions } from "@/lib/auth";
import { Pagination } from "@/components/shared/Pagination";
import { PAGE_SIZE, clampPage, parsePage } from "@/lib/listing";
import { prisma } from "@/lib/prisma";

const employmentLabels = {
  PNS: "PNS",
  PPPK: "PPPK",
  PPPK_PARUH_WAKTU: "PPPK Paruh Waktu",
};

const loanStatus: Record<string, { label: string; className: string }> = {
  SUBMITTED: { label: "Diajukan", className: "bg-amber-100 text-amber-700" },
  SALARY_TREASURER_APPROVED: {
    label: "Disetujui Bendahara",
    className: "bg-amber-100 text-amber-700",
  },
  FINAL_APPROVED: {
    label: "Menunggu Pencairan",
    className: "bg-amber-100 text-amber-700",
  },
  ACTIVE: { label: "Berjalan", className: "bg-emerald-100 text-emerald-700" },
  LUNAS: { label: "Lunas", className: "bg-blue-100 text-blue-700" },
  REJECTED: { label: "Ditolak", className: "bg-red-100 text-red-700" },
};

const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
const date = (value: Date | null) =>
  value
    ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(value)
    : "-";

const tabs = [
  { key: "pinjaman", label: "Pinjaman" },
  { key: "simpanan", label: "Simpanan" },
] as const;

export default async function MemberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; lp?: string; pp?: string; wp?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role === "ANGGOTA") redirect("/dashboard");

  const { id } = await params;
  const query = await searchParams;
  const tab = query.tab === "simpanan" ? "simpanan" : "pinjaman";

  const member = await prisma.member.findUnique({
    where: { id },
    include: {
      loans: {
        orderBy: { applicationDate: "desc" },
        include: { payments: { orderBy: { installmentNumber: "asc" } } },
      },
      savings: {
        where: { savingsType: { in: ["POKOK", "WAJIB"] } },
        orderBy: { transactionDate: "desc" },
      },
    },
  });
  if (!member) notFound();

  // --- Pinjaman ---
  const activeLoans = member.loans.filter((loan) => loan.status === "ACTIVE");
  const pendingLoans = member.loans.filter((loan) =>
    ["SUBMITTED", "SALARY_TREASURER_APPROVED", "FINAL_APPROVED"].includes(
      loan.status,
    ),
  );
  const remainingPrincipal = (loan: (typeof member.loans)[number]) => {
    const paid = loan.payments.reduce(
      (total, payment) => total + payment.principalComponent.toNumber(),
      0,
    );
    return Math.max(loan.principalAmount.toNumber() - paid, 0);
  };
  const outstanding = activeLoans.reduce(
    (sum, loan) => sum + remainingPrincipal(loan),
    0,
  );

  // --- Simpanan ---
  const net = (type: "POKOK" | "WAJIB") =>
    member.savings
      .filter((row) => row.savingsType === type)
      .reduce(
        (sum, row) =>
          sum +
          (row.transactionType === "SETORAN" ? 1 : -1) * row.amount.toNumber(),
        0,
      );
  const principalSavings = net("POKOK");
  const mandatorySavings = net("WAJIB");
  const principalRows = member.savings.filter(
    (row) => row.savingsType === "POKOK",
  );
  const mandatoryRows = member.savings.filter(
    (row) => row.savingsType === "WAJIB",
  );

  const slicePage = <T,>(rows: T[], raw: string | undefined) => {
    const page = clampPage(parsePage(raw), rows.length);
    return { page, rows: rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) };
  };
  const loansPaged = slicePage(member.loans, query.lp);
  const principalPaged = slicePage(principalRows, query.pp);
  const mandatoryPaged = slicePage(mandatoryRows, query.wp);
  const detailPath = `/anggota/${member.id}`;
  const keep = (extra: Record<string, string | undefined>) => ({
    tab,
    lp: query.lp,
    pp: query.pp,
    wp: query.wp,
    ...extra,
  });

  return (
    <>
      <AppSidebar />
      <Topbar
        user={session.user}
        title="Detail Anggota"
        subtitle={`${member.name} · ${member.memberNumber}`}
      />
      <main className="min-h-screen bg-slate-50 px-4 pb-12 pt-24 sm:px-6 lg:ml-[280px] lg:px-10 lg:pt-28">
        <Link
          href="/anggota"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600"
        >
          <ArrowLeft size={17} /> Kembali ke daftar anggota
        </Link>

        {/* Identity */}
        <section className="rounded-card border border-slate-200/70 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-xl font-semibold text-white">
                {member.name.charAt(0).toUpperCase()}
              </span>
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                  {member.name}
                </h2>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                  <span>{member.memberNumber}</span>
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                    {employmentLabels[member.employmentStatus]}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${member.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                  >
                    {member.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </p>
              </div>
            </div>
            <Link
              href={`/anggota/${member.id}/edit`}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Pencil size={16} /> Edit data
            </Link>
          </div>

          <dl className="mt-6 grid gap-x-8 gap-y-4 border-t border-slate-100 pt-6 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Info label="NIK" value={member.nik ?? "Belum diisi"} />
            <Info
              label="NIP / NI"
              value={member.employeeNumber || "Belum diisi"}
            />
            <Info label="Telepon" value={member.phone || "-"} />
            <Info label="Bergabung" value={date(member.joinedAt)} />
            <div className="sm:col-span-2 lg:col-span-4">
              <Info label="Alamat" value={member.address || "-"} />
            </div>
          </dl>
        </section>

        {/* Summary */}
        <section className="mt-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
          <Stat
            icon={Landmark}
            label="Sisa pokok pinjaman"
            value={rupiah(outstanding)}
          />
          <Stat
            icon={Landmark}
            label="Pinjaman berjalan"
            value={String(activeLoans.length)}
          />
          <Stat
            icon={PiggyBank}
            label="Simpanan pokok"
            value={rupiah(principalSavings)}
          />
          <Stat
            icon={Wallet}
            label="Simpanan wajib"
            value={rupiah(mandatorySavings)}
          />
        </section>

        {/* Tabs */}
        <nav aria-label="Detail anggota" className="mb-5 mt-7 flex gap-2">
          {tabs.map((item) => (
            <Link
              key={item.key}
              href={`/anggota/${member.id}?tab=${item.key}`}
              aria-current={item.key === tab ? "page" : undefined}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                item.key === tab
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {tab === "pinjaman" ? (
          <div className="space-y-6">
            <Panel
              title="Pinjaman berjalan"
              note="Pinjaman yang sudah cair dan masih diangsur"
            >
              {activeLoans.length ? (
                <div className="space-y-5">
                  {activeLoans.map((loan) => {
                    const paid = loan.payments.length;
                    const progress = Math.min(
                      (paid / loan.tenureMonths) * 100,
                      100,
                    );
                    return (
                      <div
                        key={loan.id}
                        className="rounded-2xl border border-slate-200/80 p-5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {loan.loanNumber}
                            </p>
                            <p className="text-sm text-slate-500">
                              {loan.purpose}
                            </p>
                          </div>
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                            Berjalan
                          </span>
                        </div>
                        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                          <Info
                            label="Pokok pinjaman"
                            value={rupiah(loan.principalAmount.toNumber())}
                          />
                          <Info
                            label="Angsuran / bulan"
                            value={
                              loan.monthlyPayment
                                ? rupiah(loan.monthlyPayment.toNumber())
                                : "-"
                            }
                          />
                          <Info
                            label="Sisa pokok"
                            value={rupiah(remainingPrincipal(loan))}
                          />
                          <Info
                            label="Bunga / tenor"
                            value={`${loan.interestRate.toNumber()}% · ${loan.tenureMonths} bln`}
                          />
                          <Info label="Dicairkan" value={date(loan.disbursedAt)} />
                          <Info
                            label="Mulai angsuran"
                            value={date(loan.startDate)}
                          />
                          <Info
                            label="Jatuh tempo akhir"
                            value={date(loan.dueDate)}
                          />
                          <Info
                            label="Referensi transfer"
                            value={loan.transferReference || "-"}
                          />
                        </dl>
                        <div className="mt-5">
                          <div className="flex justify-between text-xs text-slate-500">
                            <span>
                              Terbayar {paid} dari {loan.tenureMonths} angsuran
                            </span>
                            <span className="tabular-nums">
                              {Math.round(progress)}%
                            </span>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-blue-600"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        {loan.payments.length > 0 && (
                          <div className="mt-5 overflow-x-auto">
                            <table className="w-full min-w-[560px] text-left text-sm">
                              <thead>
                                <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
                                  <th className="py-3">Angsuran</th>
                                  <th>Tanggal</th>
                                  <th className="text-right">Pokok</th>
                                  <th className="text-right">Bunga</th>
                                  <th className="text-right">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {loan.payments.map((payment) => (
                                  <tr
                                    key={payment.id}
                                    className="border-b border-slate-50 text-slate-600"
                                  >
                                    <td className="py-3 font-semibold text-slate-900">
                                      ke-{payment.installmentNumber}
                                    </td>
                                    <td>{date(payment.paymentDate)}</td>
                                    <td className="text-right tabular-nums">
                                      {rupiah(
                                        payment.principalComponent.toNumber(),
                                      )}
                                    </td>
                                    <td className="text-right tabular-nums">
                                      {rupiah(
                                        payment.interestComponent.toNumber(),
                                      )}
                                    </td>
                                    <td className="text-right font-semibold tabular-nums text-slate-900">
                                      {rupiah(payment.amount.toNumber())}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Empty>Tidak ada pinjaman yang sedang berjalan.</Empty>
              )}

              {pendingLoans.length > 0 && (
                <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Ada {pendingLoans.length} pengajuan pinjaman yang masih
                  diproses: {pendingLoans.map((loan) => loan.loanNumber).join(", ")}
                  .
                </p>
              )}
            </Panel>

            <Panel
              title="Riwayat pinjaman"
              note="Semua pengajuan, terbaru di atas"
            >
              {member.loans.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
                        <th className="py-3">No. pinjaman</th>
                        <th>Diajukan</th>
                        <th className="text-right">Pokok</th>
                        <th className="text-right">Tenor</th>
                        <th className="text-right">Angsuran</th>
                        <th className="pl-6">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loansPaged.rows.map((loan) => {
                        const status = loanStatus[loan.status];
                        return (
                          <tr
                            key={loan.id}
                            className="border-b border-slate-50 text-slate-600"
                          >
                            <td className="py-3.5">
                              <p className="font-semibold text-slate-900">
                                {loan.loanNumber}
                              </p>
                              <p className="text-xs text-slate-400">
                                {loan.purpose}
                              </p>
                            </td>
                            <td>{date(loan.applicationDate)}</td>
                            <td className="text-right tabular-nums">
                              {rupiah(loan.principalAmount.toNumber())}
                            </td>
                            <td className="text-right tabular-nums">
                              {loan.tenureMonths} bln
                            </td>
                            <td className="text-right tabular-nums">
                              {loan.monthlyPayment
                                ? rupiah(loan.monthlyPayment.toNumber())
                                : "-"}
                            </td>
                            <td className="pl-6">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${status?.className ?? "bg-slate-100 text-slate-600"}`}
                              >
                                {status?.label ?? loan.status}
                              </span>
                              {loan.status === "REJECTED" &&
                                loan.rejectionNote && (
                                  <p className="mt-1 max-w-[16rem] text-xs text-red-600">
                                    {loan.rejectionNote}
                                  </p>
                                )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <Pagination
                    basePath={detailPath}
                    pageParam="lp"
                    query={keep({ lp: undefined })}
                    page={loansPaged.page}
                    total={member.loans.length}
                  />
                </div>
              ) : (
                <Empty>Anggota ini belum pernah mengajukan pinjaman.</Empty>
              )}
            </Panel>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-2">
            <SavingsPanel
              title="Simpanan pokok"
              note="Dibayar sekali saat mendaftar"
              total={principalSavings}
              rows={principalPaged.rows}
              footer={
                <Pagination
                  basePath={detailPath}
                  pageParam="pp"
                  query={keep({ pp: undefined })}
                  page={principalPaged.page}
                  total={principalRows.length}
                />
              }
              empty="Simpanan pokok belum dibayar."
            />
            <SavingsPanel
              title="Simpanan wajib"
              note="Dibayar setiap bulan"
              total={mandatorySavings}
              rows={mandatoryPaged.rows}
              footer={
                <Pagination
                  basePath={detailPath}
                  pageParam="wp"
                  query={keep({ wp: undefined })}
                  page={mandatoryPaged.page}
                  total={mandatoryRows.length}
                />
              }
              empty="Belum ada setoran simpanan wajib."
            />
          </div>
        )}
      </main>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Landmark;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-card border border-slate-200/70 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1.5 truncate text-xl font-semibold tracking-tight text-slate-900 tabular-nums sm:text-2xl">
            {value}
          </p>
        </div>
        <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:flex">
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-slate-200/70 bg-white p-5 shadow-sm sm:p-7">
      <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
        {title}
      </h3>
      {note && <p className="mt-0.5 text-sm text-slate-500">{note}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
      {children}
    </p>
  );
}

function SavingsPanel({
  title,
  note,
  total,
  rows,
  footer,
  empty,
}: {
  title: string;
  note: string;
  total: number;
  rows: {
    id: string;
    receiptNumber: string;
    transactionType: string;
    amount: { toNumber(): number };
    transactionDate: Date;
    periodKey: string | null;
  }[];
  footer?: React.ReactNode;
  empty: string;
}) {
  return (
    <Panel title={title} note={note}>
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
        Saldo
      </p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">
        {rupiah(total)}
      </p>
      <div className="mt-6">
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[440px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
                  <th className="py-3">Tanggal</th>
                  <th>Periode</th>
                  <th>Bukti</th>
                  <th className="text-right">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-50 text-slate-600"
                  >
                    <td className="py-3">{date(row.transactionDate)}</td>
                    <td>{row.periodKey ?? "-"}</td>
                    <td className="text-xs text-slate-400">
                      {row.receiptNumber}
                    </td>
                    <td
                      className={`text-right font-semibold tabular-nums ${row.transactionType === "SETORAN" ? "text-slate-900" : "text-red-600"}`}
                    >
                      {row.transactionType === "SETORAN" ? "" : "-"}
                      {rupiah(row.amount.toNumber())}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>{empty}</Empty>
        )}
        {rows.length > 0 && footer}
      </div>
    </Panel>
  );
}
