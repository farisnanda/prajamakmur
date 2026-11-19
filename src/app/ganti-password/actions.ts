"use server";

import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ChangePasswordState = { ok?: boolean; message?: string };

const schema = z.object({
  current: z.string().min(1, "Isi kata sandi saat ini."),
  next: z.string().min(8, "Kata sandi baru minimal 8 karakter."),
  confirm: z.string(),
});

export async function changePassword(
  _state: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const session = await getServerSession(authOptions);
  if (!session) return { message: "Sesi berakhir. Silakan masuk kembali." };

  const parsed = schema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { message: parsed.error.issues[0].message };
  const { current, next, confirm } = parsed.data;
  if (next !== confirm) return { message: "Konfirmasi kata sandi tidak sama." };
  if (next === current)
    return { message: "Kata sandi baru harus berbeda dari yang lama." };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { member: { select: { employeeNumber: true, nik: true } } },
  });
  if (!user?.isActive) return { message: "Akun tidak aktif." };
  if (!(await bcrypt.compare(current, user.password)))
    return { message: "Kata sandi saat ini tidak sesuai." };
  if (
    next === user.member?.employeeNumber ||
    (!!user.member?.nik && next === user.member.nik)
  )
    return { message: "Jangan memakai NIP/NI atau NIK sebagai kata sandi." };

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(next, 10), mustChangePassword: false },
  });
  return { ok: true };
}
