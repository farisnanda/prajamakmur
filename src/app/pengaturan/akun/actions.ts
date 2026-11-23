"use server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
const roles = [
  "SUPER_ADMIN",
  "ADMIN_KOPERASI",
  "BENDAHARA",
  "KETUA_KOPERASI",
  "PENGURUS",
  "AUDITOR",
  "ANGGOTA",
] as const;
async function admin() {
  const s = await getServerSession(authOptions);
  if (!s || !["SUPER_ADMIN", "ADMIN_KOPERASI"].includes(s.user.role))
    throw new Error("Akses admin diperlukan.");
  return s;
}
export async function createMemberAccount(fd: FormData) {
  await admin();
  const p = z
    .object({ memberId: z.string().min(1) })
    .safeParse(Object.fromEntries(fd));
  if (!p.success) redirect("/pengaturan/akun?error=invalid");
  const member = await prisma.member.findUnique({
    where: { id: p.data.memberId },
    include: { user: true },
  });
  if (!member || member.user) redirect("/pengaturan/akun?error=linked");
  if (!member.employeeNumber) redirect("/pengaturan/akun?error=nip");
  try {
    // Login memakai NIP/NI. Password awal = NIP/NI dan wajib diganti saat masuk pertama.
    await prisma.user.create({
      data: {
        name: member.name,
        email: `${member.employeeNumber.toLowerCase()}@anggota.praja-makmur.local`,
        password: await bcrypt.hash(member.employeeNumber, 10),
        role: "ANGGOTA",
        isActive: true,
        mustChangePassword: true,
        memberId: member.id,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      redirect("/pengaturan/akun?error=invalid");
    throw error;
  }
  await audit({
    action: "ACCOUNT_CREATE",
    entity: "User",
    entityId: member.id,
    summary: `Membuat akun login untuk ${member.name} (NIP/NI ${member.employeeNumber})`,
  });
  revalidatePath("/pengaturan/akun");
  redirect("/pengaturan/akun?success=created");
}
export async function updateAccount(fd: FormData) {
  const s = await admin();
  const p = z
    .object({
      userId: z.string().min(1),
      name: z.string().trim().min(2),
      email: z.email().trim().toLowerCase(),
      role: z.enum(roles),
      isActive: z.enum(["true", "false"]),
    })
    .safeParse(Object.fromEntries(fd));
  if (!p.success) redirect("/pengaturan/akun?error=invalid");
  const target = await prisma.user.findUnique({
    where: { id: p.data.userId },
    select: { role: true },
  });
  if (!target) redirect("/pengaturan/akun?error=invalid");
  if (
    s.user.role === "ADMIN_KOPERASI" &&
    (target.role === "SUPER_ADMIN" || p.data.role === "SUPER_ADMIN")
  )
    redirect("/pengaturan/akun?error=permission");
  // Hanya Super Admin yang boleh menetapkan atau mengubah role.
  if (s.user.role !== "SUPER_ADMIN" && p.data.role !== target.role)
    redirect("/pengaturan/akun?error=role");
  if (
    p.data.userId === s.user.id &&
    (p.data.role !== s.user.role || p.data.isActive !== "true")
  )
    redirect("/pengaturan/akun?error=self");
  try {
    await prisma.user.update({
      where: { id: p.data.userId },
      data: {
        name: p.data.name,
        email: p.data.email,
        role: p.data.role,
        isActive: p.data.isActive === "true",
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      redirect("/pengaturan/akun?error=invalid");
    throw error;
  }
  await audit({
    action: "ACCOUNT_UPDATE",
    entity: "User",
    entityId: p.data.userId,
    summary: `Mengubah akun ${p.data.name}: role ${target.role} menjadi ${p.data.role}, status ${p.data.isActive === "true" ? "aktif" : "nonaktif"}`,
    metadata: { roleBefore: target.role, roleAfter: p.data.role, active: p.data.isActive === "true" },
  });
  revalidatePath("/pengaturan/akun");
  redirect("/pengaturan/akun?success=updated");
}
export async function resetAccountPassword(fd: FormData) {
  const s = await admin();
  const p = z
    .object({ userId: z.string().min(1), password: z.string().min(8) })
    .safeParse(Object.fromEntries(fd));
  if (!p.success) redirect("/pengaturan/akun?error=password");
  const target = await prisma.user.findUnique({
    where: { id: p.data.userId },
    select: { role: true },
  });
  if (!target) redirect("/pengaturan/akun?error=invalid");
  if (s.user.role === "ADMIN_KOPERASI" && target.role === "SUPER_ADMIN")
    redirect("/pengaturan/akun?error=permission");
  await prisma.user.update({
    where: { id: p.data.userId },
    data: {
      password: await bcrypt.hash(p.data.password, 10),
      mustChangePassword: true,
    },
  });
  await audit({
    action: "PASSWORD_RESET",
    entity: "User",
    entityId: p.data.userId,
    summary: "Mereset password akun (password baru diisi manual)",
  });
  redirect("/pengaturan/akun?success=password");
}

export async function resetPasswordToNip(fd: FormData) {
  const s = await admin();
  const userId = z.string().min(1).safeParse(fd.get("userId"));
  if (!userId.success) redirect("/pengaturan/akun?error=invalid");
  const target = await prisma.user.findUnique({
    where: { id: userId.data },
    select: { role: true, member: { select: { employeeNumber: true } } },
  });
  const nip = target?.member?.employeeNumber;
  if (!target || !nip) redirect("/pengaturan/akun?error=nip");
  if (s.user.role === "ADMIN_KOPERASI" && target.role === "SUPER_ADMIN")
    redirect("/pengaturan/akun?error=permission");
  await prisma.user.update({
    where: { id: userId.data },
    data: { password: await bcrypt.hash(nip, 10), mustChangePassword: true },
  });
  await audit({
    action: "PASSWORD_RESET",
    entity: "User",
    entityId: userId.data,
    summary: "Mereset password akun ke NIP/NI",
  });
  redirect("/pengaturan/akun?success=password");
}
