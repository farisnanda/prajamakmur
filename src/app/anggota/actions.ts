"use server";

import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const allowedRoles = new Set(["SUPER_ADMIN", "ADMIN_KOPERASI", "PENGURUS"]);

const memberSchema = z.object({
  memberNumber: z.string().trim().min(1, "Nomor anggota wajib diisi."),
  nik: z.string().trim().regex(/^\d{16}$/, "NIK harus terdiri dari 16 angka."),
  employeeNumber: z.string().trim().optional(),
  name: z.string().trim().min(3, "Nama minimal 3 karakter."),
  employmentStatus: z.enum(["PNS", "PPPK", "PPPK_PARUH_WAKTU"]),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  joinedAt: z.coerce.date(),
  isActive: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export type MemberFormState = {
  message?: string;
  errors?: Record<string, string[]>;
};

async function authorizeMemberManagement() {
  const session = await getServerSession(authOptions);
  if (!session || !allowedRoles.has(session.user.role)) {
    throw new Error("Anda tidak memiliki akses untuk mengelola anggota.");
  }
}

function parseMember(formData: FormData) {
  return memberSchema.safeParse({
    memberNumber: formData.get("memberNumber"),
    nik: formData.get("nik"),
    employeeNumber: formData.get("employeeNumber"),
    name: formData.get("name"),
    employmentStatus: formData.get("employmentStatus"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    joinedAt: formData.get("joinedAt"),
    isActive: formData.get("isActive"),
  });
}

function databaseError(error: unknown): MemberFormState {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return { message: "Nomor anggota, NIK, atau NIP/NI PPPK sudah digunakan." };
  }
  return { message: "Data belum dapat disimpan. Silakan coba lagi." };
}

export async function createMember(
  _state: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  await authorizeMemberManagement();
  const parsed = parseMember(formData);
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  try {
    await prisma.member.create({
      data: {
        ...parsed.data,
        employeeNumber: parsed.data.employeeNumber || null,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
      },
    });
  } catch (error) {
    return databaseError(error);
  }

  revalidatePath("/anggota");
  redirect("/anggota?success=created");
}

export async function updateMember(
  id: string,
  _state: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  await authorizeMemberManagement();
  const parsed = parseMember(formData);
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  try {
    await prisma.member.update({
      where: { id },
      data: {
        ...parsed.data,
        employeeNumber: parsed.data.employeeNumber || null,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
      },
    });
  } catch (error) {
    return databaseError(error);
  }

  revalidatePath("/anggota");
  redirect("/anggota?success=updated");
}
