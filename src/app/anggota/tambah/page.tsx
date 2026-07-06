import { ArrowLeft } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createMember } from "@/app/anggota/actions";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MemberForm } from "@/components/members/MemberForm";
import { authOptions } from "@/lib/auth";

export default async function AddMemberPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <>
      <AppSidebar />
      <Topbar
        user={session.user}
        title="Tambah Anggota"
        subtitle="Daftarkan anggota baru Praja Makmur"
      />
      <main className="ml-[280px] min-h-screen bg-slate-50 px-8 pb-10 pt-32">
        <Link
          href="/anggota"
          className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600"
        >
          <ArrowLeft size={17} /> Kembali ke daftar anggota
        </Link>
        <section className="rounded-[28px] border border-slate-100 bg-white p-8 shadow-sm">
          <div className="mb-8">
            <h3 className="text-xl font-bold text-slate-900">
              Informasi Anggota
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Lengkapi data identitas dan kepegawaian anggota.
            </p>
          </div>
          <MemberForm action={createMember} />
        </section>
      </main>
    </>
  );
}
