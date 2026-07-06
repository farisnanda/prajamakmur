"use server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
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
    .object({
      memberId: z.string().min(1),
      email: z.email().trim().toLowerCase(),
      password: z.string().min(8),
    })
    .safeParse(Object.fromEntries(fd));
  if (!p.success) redirect("/pengaturan/akun?error=invalid");
  const member = await prisma.member.findUnique({
    where: { id: p.data.memberId },
    include: { user: true },
  });
  if (!member || member.user) redirect("/pengaturan/akun?error=linked");
  try {
    await prisma.user.create({
      data: {
        name: member.name,
        email: p.data.email,
        password: await bcrypt.hash(p.data.password, 10),
        role: "ANGGOTA",
        isActive: true,
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
    data: { password: await bcrypt.hash(p.data.password, 10) },
  });
  redirect("/pengaturan/akun?success=password");
}
