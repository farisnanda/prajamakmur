import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { KeyRound, UserPlus, Users } from "lucide-react";
import {
  createMemberAccount,
  resetAccountPassword,
  resetPasswordToNip,
  updateAccount,
} from "./actions";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
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
  searchParams: Promise<{ success?: string; error?: string; q?: string }>;
}) {
  const s = await getServerSession(authOptions);
  if (!s) redirect("/login");
  if (!["SUPER_ADMIN", "ADMIN_KOPERASI"].includes(s.user.role))
    redirect("/dashboard");
  const q = await searchParams,
    query = q.q?.trim() ?? "",
    isSuper = s.user.role === "SUPER_ADMIN",
    [users, members] = await Promise.all([
      prisma.user.findMany({
        where: query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
                { member: { employeeNumber: { contains: query } } },
                { member: { memberNumber: { contains: query, mode: "insensitive" } } },
              ],
            }
          : undefined,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          mustChangePassword: true,
          member: { select: { memberNumber: true, employeeNumber: true } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.member.findMany({
        where: { isActive: true, user: null, employeeNumber: { not: null } },
        select: { id: true, name: true, memberNumber: true, employeeNumber: true },
        orderBy: { name: "asc" },
      }),
    ]);
  const error = {
    invalid: "Data akun belum valid atau email sudah digunakan.",
    linked: "Anggota tersebut sudah memiliki akun.",
    self: "Anda tidak dapat menonaktifkan atau mengubah role akun sendiri.",
    password: "Password baru minimal 8 karakter.",
    permission: "Admin Koperasi tidak dapat mengubah akun Super Admin.",
    role: "Hanya Super Admin yang dapat mengubah role pengguna.",
    nip: "Anggota ini belum memiliki NIP/NI, sehingga akun login belum bisa dibuat. Isi NIP/NI di data anggota.",
  }[q.error ?? ""];
  return (
    <>
      <AppSidebar />
      <Topbar
        user={s.user}
        title="Pengaturan Akun"
        subtitle="Kelola akses pengguna dan akun anggota"
      />
      <main className="min-h-screen bg-slate-50 px-4 pb-12 pt-24 sm:px-6 lg:ml-[280px] lg:px-10 lg:pt-28">
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
        <SettingsTabs active="akun" />
        <section className="rounded-card bg-white p-7 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <UserPlus />
            </span>
            <div>
              <h3 className="font-bold">Buat Akun Anggota</h3>
              <p className="text-sm text-slate-500">
                {members.length} anggota aktif ber-NIP/NI belum memiliki akun
              </p>
            </div>
          </div>
          <form
            action={createMemberAccount}
            className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]"
          >
            <select name="memberId" required className={input}>
              <option value="">Pilih anggota (punya NIP/NI)</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.employeeNumber} · {m.name}
                </option>
              ))}
            </select>
            <button
              disabled={!members.length}
              className="h-11 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white disabled:opacity-40"
            >
              Buat Akun Anggota
            </button>
          </form>
          <p className="mt-3 text-xs text-slate-500">
            Login memakai NIP/NI. Kata sandi awal sama dengan NIP/NI, dan
            anggota wajib menggantinya saat masuk pertama kali. Anggota tanpa
            NIP/NI tidak muncul di daftar ini.
          </p>
        </section>
        <section className="mt-6 rounded-card bg-white p-7 shadow-sm">
          <div className="flex items-center gap-3">
            <Users className="text-blue-600" />
            <div>
              <h3 className="font-bold">Daftar Akun</h3>
              <p className="text-sm text-slate-500">
                {users.length} akun terdaftar
              </p>
            </div>
          </div>
          <form className="mt-5 flex gap-3">
            <input
              name="q"
              defaultValue={query}
              placeholder="Cari NIP/NI, nama, atau email..."
              className={`${input} w-full max-w-md`}
            />
            <button className="h-11 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white">
              Cari
            </button>
          </form>
          {!isSuper && (
            <p className="mt-3 text-xs text-slate-500">
              Role hanya dapat diubah oleh Super Admin.
            </p>
          )}
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-[1100px] w-full text-left text-sm">
              <thead>
                <tr>
                  <th>NIP/NI</th>
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
                      <b>{u.member?.employeeNumber ?? "Akun Pengelola"}</b>
                      <p className="text-xs text-slate-400">
                        {u.member?.memberNumber ?? ""}
                        {u.id === s.user.id ? " · Akun Anda" : ""}
                      </p>
                      {u.mustChangePassword && (
                        <p className="mt-1 text-xs font-semibold text-amber-600">
                          Belum ganti password
                        </p>
                      )}
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
                        {u.member ? (
                          <>
                            <input type="hidden" name="email" value={u.email} />
                            <p className="truncate px-1 text-xs text-slate-400">
                              Login: NIP/NI
                            </p>
                          </>
                        ) : (
                          <input
                            name="email"
                            type="email"
                            defaultValue={u.email}
                            required
                            className={input}
                          />
                        )}
                      </form>
                    </td>
                    <td>
                      {!isSuper && (
                        <input
                          type="hidden"
                          form={`account-${u.id}`}
                          name="role"
                          value={u.role}
                        />
                      )}
                      <select
                        form={`account-${u.id}`}
                        name={isSuper ? "role" : undefined}
                        defaultValue={u.role}
                        disabled={!isSuper}
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
                      {u.member?.employeeNumber && (
                        <form action={resetPasswordToNip} className="mb-2">
                          <input type="hidden" name="userId" value={u.id} />
                          <button className="h-9 rounded-lg border border-amber-200 px-3 text-xs font-semibold text-amber-700 hover:bg-amber-50">
                            Reset ke NIP/NI
                          </button>
                        </form>
                      )}
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
