import { ArrowLeft } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createMember } from "@/app/anggota/actions";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MemberForm } from "@/components/members/MemberForm";
import { MemberImport } from "@/components/members/MemberImport";
import { authOptions } from "@/lib/auth";
import { nextMemberNumber } from "@/lib/memberNumber";
import { prisma } from "@/lib/prisma";

const modes = [
  { key: "manual", label: "Input Manual", href: "/anggota/tambah" },
  { key: "import", label: "Import Excel", href: "/anggota/tambah?mode=import" },
] as const;

export default async function AddMemberPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role === "ANGGOTA") redirect("/dashboard");

  const mode = (await searchParams).mode === "import" ? "import" : "manual";
  const upcomingNumber =
    mode === "manual" ? await nextMemberNumber(prisma) : undefined;

  return (
    <>
      <AppSidebar />
      <Topbar
        user={session.user}
        title="Tambah Anggota"
        subtitle="Daftarkan anggota baru Praja Makmur"
      />
      <main className="min-h-screen bg-slate-50 px-4 pb-12 pt-24 sm:px-6 lg:ml-[280px] lg:px-10 lg:pt-28">
        <Link
          href="/anggota"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600"
        >
          <ArrowLeft size={17} /> Kembali ke daftar anggota
        </Link>

        <nav aria-label="Cara menambah anggota" className="mb-5 flex gap-2">
          {modes.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              aria-current={item.key === mode ? "page" : undefined}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                item.key === mode
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <section className="rounded-card border border-slate-200/70 bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-slate-900">
              {mode === "import" ? "Import dari Excel" : "Informasi Anggota"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {mode === "import"
                ? "Tambahkan banyak anggota sekaligus dari file Excel."
                : "Lengkapi data identitas dan kepegawaian anggota."}
            </p>
          </div>
          {mode === "import" ? (
            <MemberImport />
          ) : (
            <MemberForm action={createMember} autoNumber={upcomingNumber} />
          )}
        </section>
      </main>
    </>
  );
}
