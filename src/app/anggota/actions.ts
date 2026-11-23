"use server";

import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { nextMemberNumber } from "@/lib/memberNumber";
import { recordPrincipalSavings } from "@/lib/principalSavings";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const allowedRoles = new Set(["SUPER_ADMIN", "ADMIN_KOPERASI", "PENGURUS"]);

const memberSchema = z.object({
  memberNumber: z.string().trim().min(1, "Nomor anggota wajib diisi."),
  nik: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^\d{16}$/.test(value), "NIK harus terdiri dari 16 angka."),
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
  return session;
}

function parseMember(formData: FormData, memberNumber?: string) {
  return memberSchema.safeParse({
    memberNumber: memberNumber ?? formData.get("memberNumber"),
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
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return { message: "Nomor anggota, NIK, atau NIP/NI PPPK sudah digunakan." };
  }
  return { message: "Data belum dapat disimpan. Silakan coba lagi." };
}

export async function createMember(
  _state: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const session = await authorizeMemberManagement();

  // Nomor anggota selalu dibuat otomatis (berurutan); isian dari form diabaikan.
  // Dicoba ulang bila dua pengurus menyimpan pada saat bersamaan.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const memberNumber = await nextMemberNumber(prisma);
    const parsed = parseMember(formData, memberNumber);
    if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

    try {
      // Anggota aktif otomatis memiliki simpanan pokok (kas dan jurnal ikut tercatat).
      await prisma.$transaction(async (tx) => {
        const member = await tx.member.create({
          data: {
            ...parsed.data,
            nik: parsed.data.nik || null,
            employeeNumber: parsed.data.employeeNumber || null,
            phone: parsed.data.phone || null,
            address: parsed.data.address || null,
          },
        });
        if (member.isActive) {
          await recordPrincipalSavings(tx, {
            members: [{ id: member.id, name: member.name }],
            createdById: session.user.id,
          });
        }
      });
      await audit({
        action: "MEMBER_CREATE",
        entity: "Member",
        summary: `Menambah anggota ${parsed.data.name} (${parsed.data.memberNumber})`,
      });
      revalidatePath("/anggota");
      redirect("/anggota?success=created");
    } catch (error) {
      if (isRedirectError(error)) throw error;
      const clash =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        JSON.stringify(error.meta ?? {}).includes("memberNumber");
      if (clash && attempt < 3) continue;
      return databaseError(error);
    }
  }
  return { message: "Data belum dapat disimpan. Silakan coba lagi." };
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
        nik: parsed.data.nik || null,
        employeeNumber: parsed.data.employeeNumber || null,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
      },
    });
  } catch (error) {
    return databaseError(error);
  }

  await audit({
    action: "MEMBER_UPDATE",
    entity: "Member",
    entityId: id,
    summary: `Mengubah data anggota ${parsed.data.name} (${parsed.data.memberNumber})`,
  });
  revalidatePath("/anggota");
  redirect("/anggota?success=updated");
}
