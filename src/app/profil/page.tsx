import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ProfileForm } from "@/components/members/ProfileForm";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const employmentLabels = {
  PNS: "PNS",
  PPPK: "PPPK",
  PPPK_PARUH_WAKTU: "PPPK Paruh Waktu",
};

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { member: true },
  });
  const member = user?.member;

  return (
    <>
      <AppSidebar />
      <Topbar
        user={session.user}
        title="Profil Saya"
        subtitle="Data keanggotaan Anda"
      />
      <main className="min-h-screen bg-slate-50 px-4 pb-12 pt-24 sm:px-6 lg:ml-[280px] lg:px-10 lg:pt-28">
        {!member ? (
          <section className="max-w-2xl rounded-card border border-slate-200/70 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Akun ini tidak terhubung dengan data anggota, jadi tidak ada profil
            yang bisa diubah.
          </section>
        ) : (
          <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
            <section className="rounded-card border border-slate-200/70 bg-white p-5 shadow-sm sm:p-7">
              <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
                Data keanggotaan
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Data ini diatur pengurus. Hubungi pengurus jika ada yang keliru.
              </p>
              <dl className="mt-6 grid gap-4 text-sm">
                <Row label="Nama" value={member.name} />
                <Row label="Nomor anggota" value={member.memberNumber} />
                <Row
                  label="NIP / NI (untuk login)"
                  value={member.employeeNumber ?? "Belum diisi"}
                />
                <Row
                  label="Status kepegawaian"
                  value={employmentLabels[member.employmentStatus]}
                />
                <Row
                  label="Bergabung"
                  value={new Intl.DateTimeFormat("id-ID", {
                    dateStyle: "long",
                  }).format(member.joinedAt)}
                />
              </dl>
              <Link
                href="/ganti-password"
                className="mt-7 inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Ganti kata sandi
              </Link>
            </section>

            <section className="rounded-card border border-slate-200/70 bg-white p-5 shadow-sm sm:p-7">
              <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
                Data yang bisa Anda ubah
              </h3>
              <p className="mb-6 mt-1 text-sm text-slate-500">
                NIK, nomor telepon, dan alamat.
              </p>
              <ProfileForm
                defaults={{
                  nik: member.nik ?? "",
                  phone: member.phone ?? "",
                  address: member.address ?? "",
                }}
              />
            </section>
          </div>
        )}
      </main>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 font-medium text-slate-800">{value}</dd>
    </div>
  );
}
