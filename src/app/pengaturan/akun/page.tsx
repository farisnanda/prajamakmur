import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { KeyRound, UserPlus, Users } from "lucide-react";
import {
  createMemberAccount,
  resetAccountPassword,
  updateAccount,
} from "./actions";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
const roleLabels = {
  SUPER_ADMIN: "Super Admin",
  ADMIN_KOPERASI: "Admin Koperasi",
  BENDAHARA: "Bendahara",
  KETUA_KOPERASI: "Ketua Koperasi",
  PENGURUS: "Pengurus",
  AUDITOR: "Auditor",
  ANGGOTA: "Anggota",
};
const input =
  "h-11 rounded-xl border border-slate-200 px-3 text-sm text-slate-900";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const s = await getServerSession(authOptions);
  if (!s) redirect("/login");
  if (!["SUPER_ADMIN", "ADMIN_KOPERASI"].includes(s.user.role))
    redirect("/dashboard");
  const q = await searchParams,
    [users, members] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          member: { select: { memberNumber: true } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.member.findMany({
        where: { isActive: true, user: null },
        select: { id: true, name: true, memberNumber: true },
        orderBy: { name: "asc" },
      }),
    ]);
  const error = {
    invalid: "Data akun belum valid atau email sudah digunakan.",
    linked: "Anggota tersebut sudah memiliki akun.",
    self: "Anda tidak dapat menonaktifkan atau mengubah role akun sendiri.",
    password: "Password baru minimal 8 karakter.",
    permission: "Admin Koperasi tidak dapat mengubah akun Super Admin.",
  }[q.error ?? ""];
  return (
    <>
      <AppSidebar />
      <Topbar
        user={s.user}
        title="Pengaturan Akun"
        subtitle="Kelola akses pengguna dan akun anggota"
      />
      <main className="ml-[280px] min-h-screen bg-slate-50 px-8 pb-10 pt-32">
        {q.success && (
          <div className="mb-5 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            Perubahan akun berhasil disimpan.
          </div>
        )}
        {error && (
          <div className="mb-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}
        <div className="mb-6 flex gap-3">
          <Link
            href="/pengaturan"
            className="rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-600"
          >
            Konten Landing
          </Link>
          <Link
            href="/pengaturan/berita"
            className="rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-600"
          >
            Berita & Kegiatan
          </Link>
          <span className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">
            Pengaturan Akun
          </span>
        </div>
        <section className="rounded-[28px] bg-white p-7 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <UserPlus />
            </span>
            <div>
              <h3 className="font-bold">Buat Akun Anggota</h3>
              <p className="text-sm text-slate-500">
                {members.length} anggota aktif belum memiliki akun
              </p>
            </div>
          </div>
          <form
            action={createMemberAccount}
            className="mt-5 grid grid-cols-4 gap-3"
          >
            <select name="memberId" required className={`${input} col-span-2`}>
              <option value="">Pilih anggota</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.memberNumber} · {m.name}
                </option>
              ))}
            </select>
            <input
              name="email"
              type="email"
              required
              placeholder="Email login"
              className={input}
            />
            <input
              name="password"
              type="password"
              minLength={8}
              required
              placeholder="Password awal (min. 8)"
              className={input}
            />
            <button
              disabled={!members.length}
              className="col-start-4 h-11 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white disabled:opacity-40"
            >
              Buat Akun Anggota
            </button>
          </form>
        </section>
        <section className="mt-6 rounded-[28px] bg-white p-7 shadow-sm">
          <div className="flex items-center gap-3">
            <Users className="text-blue-600" />
            <div>
              <h3 className="font-bold">Daftar Akun</h3>
              <p className="text-sm text-slate-500">
                {users.length} akun terdaftar
              </p>
            </div>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-[1100px] w-full text-left text-sm">
              <thead>
                <tr>
                  <th>Pengguna</th>
                  <th>Nama & Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Simpan</th>
                  <th>Reset Password</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <b>{u.member?.memberNumber ?? "Akun Pengelola"}</b>
                      <p className="text-xs text-slate-400">
                        {u.id === s.user.id ? "Akun Anda" : ""}
                      </p>
                    </td>
                    <td>
                      <form
                        id={`account-${u.id}`}
                        action={updateAccount}
                        className="grid gap-2"
                      >
                        <input type="hidden" name="userId" value={u.id} />
                        <input
                          name="name"
                          defaultValue={u.name}
                          required
                          className={input}
                        />
                        <input
                          name="email"
                          type="email"
                          defaultValue={u.email}
                          required
                          className={input}
                        />
                      </form>
                    </td>
                    <td>
                      <select
                        form={`account-${u.id}`}
                        name="role"
                        defaultValue={u.role}
                        className={input}
                      >
                        {Object.entries(roleLabels).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        form={`account-${u.id}`}
                        name="isActive"
                        defaultValue={String(u.isActive)}
                        className={input}
                      >
                        <option value="true">Aktif</option>
                        <option value="false">Nonaktif</option>
                      </select>
                    </td>
                    <td>
                      <button
                        form={`account-${u.id}`}
                        className="h-10 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white"
                      >
                        Simpan
                      </button>
                    </td>
                    <td>
                      <form
                        action={resetAccountPassword}
                        className="flex gap-2"
                      >
                        <input type="hidden" name="userId" value={u.id} />
                        <input
                          name="password"
                          type="password"
                          minLength={8}
                          required
                          placeholder="Password baru"
                          className={`${input} w-40`}
                        />
                        <button
                          title="Reset password"
                          className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700"
                        >
                          <KeyRound size={17} />
                        </button>
                      </form>
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
