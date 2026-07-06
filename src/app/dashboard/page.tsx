import {
  ArrowDownLeft,
  BadgeCheck,
  CircleDollarSign,
  CreditCard,
  Landmark,
  PieChart,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";

const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
const savingsLabels = {
  POKOK: "Simpanan Pokok",
  WAJIB: "Simpanan Wajib",
  SUKARELA: "Simpanan Sukarela",
};

const stats = [
  {
    title: "Total Anggota",
    value: "200",
    desc: "Anggota aktif koperasi",
    icon: Users,
  },
  {
    title: "Total Simpanan",
    value: "Rp425.000.000",
    desc: "+8,2% bulan ini",
    icon: Wallet,
  },
  {
    title: "Pinjaman Berjalan",
    value: "Rp312.500.000",
    desc: "48 pinjaman aktif",
    icon: Landmark,
  },
  {
    title: "SHU Berjalan",
    value: "Rp38.750.000",
    desc: "Estimasi tahun ini",
    icon: PieChart,
  },
];

const transactions = [
  ["Simpanan Wajib", "Budi Santoso", "Rp100.000", "Berhasil"],
  ["Angsuran Pinjaman", "Siti Aminah", "Rp750.000", "Berhasil"],
  ["Simpanan Sukarela", "Ahmad Fauzi", "Rp500.000", "Berhasil"],
  ["Pengajuan Pinjaman", "Dewi Lestari", "Rp10.000.000", "Menunggu"],
];

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  if (session.user.role === "ANGGOTA") {
    const member = await prisma.member.findFirst({
      where: { user: { id: session.user.id } },
      include: {
        savings: { orderBy: { transactionDate: "desc" }, take: 8 },
        loans: {
          where: {
            status: {
              in: [
                "SUBMITTED",
                "SALARY_TREASURER_APPROVED",
                "FINAL_APPROVED",
                "ACTIVE",
                "LUNAS",
              ],
            },
          },
          include: {
            payments: {
              select: {
                id: true,
                receiptNumber: true,
                amount: true,
                principalComponent: true,
                interestComponent: true,
                paymentDate: true,
              },
            },
          },
          orderBy: { applicationDate: "desc" },
        },
      },
    });
    return <MemberDashboard user={session.user} member={member} />;
  }

  return <AdminDashboard user={session.user} />;

  return (
    <>
      <AppSidebar />
      <Topbar user={session!.user} />

      <main className="ml-[280px] min-h-screen bg-slate-50 px-8 pb-10 pt-32">
        <section className="grid grid-cols-4 gap-6">
          {stats.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm"
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Icon size={28} />
                </div>
                <p className="text-sm font-medium text-slate-500">
                  {item.title}
                </p>
                <h3 className="mt-2 text-2xl font-bold text-slate-900">
                  {item.value}
                </h3>
                <p className="mt-2 text-sm text-blue-600">{item.desc}</p>
              </div>
            );
          })}
        </section>

        <section className="mt-6 grid grid-cols-12 gap-6">
          <div className="col-span-8 rounded-[28px] border border-slate-100 bg-white p-7 shadow-sm">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Grafik Simpanan Bulanan
                </h3>
                <p className="text-sm text-slate-500">
                  Perkembangan simpanan tahun berjalan
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
                <TrendingUp size={18} />
                +12.5%
              </div>
            </div>

            <div className="flex h-72 items-end gap-5">
              {[45, 62, 38, 74, 55, 80, 67, 72, 58, 84, 76, 90].map(
                (height, index) => (
                  <div
                    key={index}
                    className="flex flex-1 flex-col items-center gap-3"
                  >
                    <div className="relative h-56 w-full rounded-full bg-slate-100">
                      <div
                        className="absolute bottom-0 w-full rounded-full bg-blue-600"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-400">
                      {index + 1}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="col-span-4 rounded-[28px] border border-slate-100 bg-white p-7 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Komposisi Dana</h3>
            <p className="text-sm text-slate-500">Simpanan dan pinjaman</p>

            <div className="mt-8 rounded-3xl bg-blue-600 p-6 text-white">
              <p className="text-sm text-blue-100">Saldo Kas Tersedia</p>
              <h4 className="mt-2 text-3xl font-bold">Rp112.450.000</h4>
              <p className="mt-4 text-sm text-blue-100">
                Dana likuid koperasi bulan ini
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Simpanan Pokok</span>
                <b>25%</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Simpanan Wajib</span>
                <b>45%</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Simpanan Sukarela</span>
                <b>30%</b>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[28px] border border-slate-100 bg-white p-7 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Transaksi Terbaru
              </h3>
              <p className="text-sm text-slate-500">
                Aktivitas keuangan terakhir
              </p>
            </div>
            <button className="rounded-2xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
              Lihat Semua
            </button>
          </div>

          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400">
                <th className="py-4">Jenis</th>
                <th>Anggota</th>
                <th>Nominal</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((trx) => (
                <tr
                  key={`${trx[0]}-${trx[1]}`}
                  className="border-b border-slate-50"
                >
                  <td className="py-4 font-semibold text-slate-700">
                    {trx[0]}
                  </td>
                  <td className="text-slate-600">{trx[1]}</td>
                  <td className="font-bold text-slate-900">{trx[2]}</td>
                  <td>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                      {trx[3]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}

type MemberDashboardData = NonNullable<
  Awaited<
    ReturnType<
      typeof prisma.member.findFirst<{
        include: {
          savings: { orderBy: { transactionDate: "desc" }; take: 8 };
          loans: {
            where: { status: { in: ("SUBMITTED" | "ACTIVE")[] } };
            include: {
              payments: {
                select: {
                  id: true;
                  receiptNumber: true;
                  amount: true;
                  principalComponent: true;
                  interestComponent: true;
                  paymentDate: true;
                };
              };
            };
            orderBy: { applicationDate: "desc" };
          };
        };
      }>
    >
  >
>;

function MemberDashboard({
  user,
  member,
}: {
  user: Parameters<typeof Topbar>[0]["user"];
  member: MemberDashboardData | null;
}) {
  if (!member)
    return (
      <>
        <AppSidebar />
        <Topbar
          user={user}
          title="Dashboard Anggota"
          subtitle="Ringkasan keanggotaan dan keuangan Anda"
        />
        <main className="ml-[280px] min-h-screen bg-slate-50 px-8 pb-10 pt-32">
          <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-8">
            <h3 className="text-lg font-bold text-amber-900">
              Akun belum terhubung ke data anggota
            </h3>
            <p className="mt-2 text-sm text-amber-700">
              Hubungi administrator koperasi untuk menghubungkan akun login
              dengan nomor anggota Anda.
            </p>
          </div>
        </main>
      </>
    );

  const balance = (type: "POKOK" | "WAJIB" | "SUKARELA") =>
    member.savings
      .filter((item) => item.savingsType === type)
      .reduce(
        (total, item) =>
          total +
          (item.transactionType === "SETORAN"
            ? item.amount.toNumber()
            : -item.amount.toNumber()),
        0,
      );
  const activeLoans = member.loans
    .filter((loan) => loan.status === "ACTIVE")
    .map((loan) => {
      const contractTotal =
        (loan.monthlyPayment?.toNumber() ?? 0) * loan.tenureMonths;
      const paid = loan.payments.reduce(
        (sum, payment) => sum + payment.amount.toNumber(),
        0,
      );
      const outstanding = Math.max(0, contractTotal - paid);
      const remainingPrincipal = contractTotal
        ? loan.principalAmount.toNumber() * (outstanding / contractTotal)
        : loan.principalAmount.toNumber();
      return { ...loan, paid, outstanding, remainingPrincipal };
    })
    .filter((loan) => loan.outstanding > 0);
  const submittedLoans = member.loans.filter((loan) =>
    ["SUBMITTED", "SALARY_TREASURER_APPROVED", "FINAL_APPROVED"].includes(
      loan.status,
    ),
  );
  const usedLimit = activeLoans.reduce(
    (total, loan) => total + loan.remainingPrincipal,
    0,
  );
  const maximumLimit =
    member.employmentStatus === "PNS" ? 50_000_000 : 40_000_000;
  const remainingLimit = Math.max(0, maximumLimit - usedLimit);
  const usagePercent = Math.min(
    100,
    maximumLimit ? (usedLimit / maximumLimit) * 100 : 0,
  );
  const activeIds = new Set(activeLoans.map((loan) => loan.id));
  const visibleLoans = member.loans.filter(
    (loan) =>
      submittedLoans.some((item) => item.id === loan.id) ||
      activeIds.has(loan.id),
  );

  return (
    <>
      <AppSidebar />
      <Topbar
        user={user}
        title={`Halo, ${member.name}`}
        subtitle={`${member.memberNumber} · ${member.employmentStatus === "PPPK_PARUH_WAKTU" ? "PPPK Paruh Waktu" : member.employmentStatus}`}
      />
      <main className="ml-[280px] min-h-screen bg-slate-50 px-8 pb-10 pt-32">
        <section className="grid grid-cols-3 gap-5">
          <MemberStat
            label="Simpanan Pokok"
            value={rupiah(balance("POKOK"))}
            note="Setoran awal keanggotaan"
            icon={Landmark}
            color="blue"
          />
          <MemberStat
            label="Simpanan Wajib"
            value={rupiah(balance("WAJIB"))}
            note="Akumulasi iuran bulanan"
            icon={Wallet}
            color="emerald"
          />
          <MemberStat
            label="Simpanan Sukarela"
            value={rupiah(balance("SUKARELA"))}
            note="Saldo yang dapat ditarik"
            icon={CircleDollarSign}
            color="violet"
          />
        </section>

        <section className="mt-6 grid grid-cols-12 gap-6">
          <div className="col-span-7 overflow-hidden rounded-[28px] bg-gradient-to-br from-blue-700 to-blue-950 p-7 text-white shadow-xl shadow-blue-900/10">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-200">
                  Limit Pinjaman Anda
                </p>
                <h3 className="mt-2 text-3xl font-bold">
                  {rupiah(remainingLimit)}
                </h3>
                <p className="mt-2 text-sm text-blue-100">
                  Sisa dari plafon {rupiah(maximumLimit)} untuk status{" "}
                  {member.employmentStatus === "PNS"
                    ? "PNS"
                    : "PPPK/PPPK Paruh Waktu"}
                </p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                <CreditCard size={28} />
              </div>
            </div>
            <div className="mt-7 h-3 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-cyan-300"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <div className="mt-3 flex justify-between text-xs font-semibold text-blue-200">
              <span>Terpakai {rupiah(usedLimit)}</span>
              <span>{usagePercent.toFixed(0)}% dari limit</span>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs text-blue-200">Pinjaman berjalan</p>
                <p className="mt-1 text-xl font-bold">{activeLoans.length}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs text-blue-200">Menunggu persetujuan</p>
                <p className="mt-1 text-xl font-bold">
                  {submittedLoans.length}
                </p>
              </div>
            </div>
          </div>
          <div className="col-span-5 rounded-[28px] border border-slate-100 bg-white p-7 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Pinjaman Saya</h3>
            <p className="text-sm text-slate-500">
              Pinjaman aktif dan pengajuan terakhir
            </p>
            <div className="mt-5 space-y-3">
              {visibleLoans.map((loan) => (
                <div
                  key={loan.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-slate-900">
                        {rupiah(loan.principalAmount.toNumber())}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {loan.loanNumber} · {loan.tenureMonths} bulan
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${loan.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                    >
                      {loan.status === "ACTIVE" ? "Berjalan" : "Diajukan"}
                    </span>
                  </div>
                  {loan.status === "ACTIVE" && (
                    <p className="mt-3 text-sm font-semibold text-blue-700">
                      Angsuran {rupiah(loan.monthlyPayment?.toNumber() ?? 0)} /
                      bulan
                    </p>
                  )}
                </div>
              ))}
              {!visibleLoans.length && (
                <div className="rounded-2xl bg-slate-50 px-5 py-10 text-center">
                  <BadgeCheck className="mx-auto text-slate-300" size={30} />
                  <p className="mt-3 text-sm font-semibold text-slate-500">
                    Belum memiliki pinjaman
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Limit {rupiah(maximumLimit)} masih tersedia penuh.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
        <section className="mt-6 rounded-[28px] border border-slate-100 bg-white p-7 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900">
            Riwayat Pembayaran Pinjaman
          </h3>
          <p className="text-sm text-slate-500">
            Tanggal dan rincian angsuran yang telah dibayarkan
          </p>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Pinjaman</th>
                  <th>Pokok</th>
                  <th>Bunga Jasa</th>
                  <th className="text-right">Total Bayar</th>
                </tr>
              </thead>
              <tbody>
                {member.loans
                  .flatMap((loan) =>
                    loan.payments.map((payment) => ({ loan, payment })),
                  )
                  .sort(
                    (a, b) =>
                      b.payment.paymentDate.getTime() -
                      a.payment.paymentDate.getTime(),
                  )
                  .slice(0, 10)
                  .map(({ loan, payment }) => (
                    <tr key={payment.id}>
                      <td>
                        {new Intl.DateTimeFormat("id-ID", {
                          dateStyle: "medium",
                        }).format(payment.paymentDate)}
                      </td>
                      <td>
                        <b>{loan.loanNumber}</b>
                        <p className="text-xs text-slate-400">
                          {payment.receiptNumber}
                        </p>
                      </td>
                      <td>{rupiah(payment.principalComponent.toNumber())}</td>
                      <td className="text-emerald-700">
                        {rupiah(payment.interestComponent.toNumber())}
                      </td>
                      <td className="text-right font-bold">
                        {rupiah(payment.amount.toNumber())}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 rounded-[28px] border border-slate-100 bg-white p-7 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900">
            Riwayat Simpanan Terbaru
          </h3>
          <p className="text-sm text-slate-500">
            Delapan transaksi terakhir Anda
          </p>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase text-slate-400">
                  <th className="py-4">Jenis</th>
                  <th>Tanggal</th>
                  <th>Transaksi</th>
                  <th className="text-right">Nominal</th>
                </tr>
              </thead>
              <tbody>
                {member.savings.map((item) => (
                  <tr key={item.id} className="border-b border-slate-50">
                    <td className="py-4 font-bold text-slate-800">
                      {savingsLabels[item.savingsType]}
                    </td>
                    <td className="text-slate-500">
                      {new Intl.DateTimeFormat("id-ID", {
                        dateStyle: "medium",
                      }).format(item.transactionDate)}
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold ${item.transactionType === "SETORAN" ? "text-emerald-600" : "text-orange-600"}`}
                      >
                        <ArrowDownLeft size={15} />
                        {item.transactionType === "SETORAN"
                          ? "Setoran"
                          : "Penarikan"}
                      </span>
                    </td>
                    <td className="text-right font-bold text-slate-900">
                      {rupiah(item.amount.toNumber())}
                    </td>
                  </tr>
                ))}
                {!member.savings.length && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-12 text-center text-slate-400"
                    >
                      Belum ada transaksi simpanan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}

function MemberStat({
  label,
  value,
  note,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof Wallet;
  color: "blue" | "emerald" | "violet";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <div className="rounded-[24px] border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          <p className="mt-2 text-xs font-semibold text-slate-400">{note}</p>
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${colors[color]}`}
        >
          <Icon size={23} />
        </div>
      </div>
    </div>
  );
}
