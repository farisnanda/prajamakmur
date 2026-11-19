"use server";

import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ProfileState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

const schema = z.object({
  nik: z
    .string()
    .trim()
    .refine((value) => !value || /^\d{16}$/.test(value), "NIK harus 16 angka."),
  phone: z
    .string()
    .trim()
    .max(20, "Nomor telepon terlalu panjang.")
    .refine(
      (value) => !value || /^[0-9+\-\s]+$/.test(value),
      "Nomor telepon hanya boleh angka.",
    ),
  address: z.string().trim().max(300, "Alamat maksimal 300 karakter."),
});

/** Anggota hanya mengubah datanya sendiri: NIK, telepon, dan alamat. */
export async function updateOwnProfile(
  _state: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const session = await getServerSession(authOptions);
  if (!session) return { message: "Sesi berakhir. Silakan masuk kembali." };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { memberId: true, isActive: true },
  });
  if (!user?.isActive || !user.memberId)
    return { message: "Akun Anda belum terhubung dengan data anggota." };

  const parsed = schema.safeParse({
    nik: formData.get("nik") ?? "",
    phone: formData.get("phone") ?? "",
    address: formData.get("address") ?? "",
  });
  if (!parsed.success)
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: "Periksa kembali isian Anda.",
    };

  try {
    await prisma.member.update({
      where: { id: user.memberId },
      data: {
        nik: parsed.data.nik || null,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      return {
        errors: { nik: ["NIK ini sudah terdaftar pada anggota lain."] },
        message: "NIK sudah terdaftar. Hubungi pengurus jika ini keliru.",
      };
    throw error;
  }

  revalidatePath("/profil");
  revalidatePath("/anggota");
  return { ok: true, message: "Profil berhasil disimpan." };
}
