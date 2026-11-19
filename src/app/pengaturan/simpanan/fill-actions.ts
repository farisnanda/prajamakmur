"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { missingPrincipalWhere, recordPrincipalSavings } from "@/lib/principalSavings";

export async function fillPrincipalSavings(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || !["SUPER_ADMIN", "ADMIN_KOPERASI"].includes(session.user.role))
    throw new Error("Akses admin diperlukan.");

  const parsed = z
    .object({
      channel: z.enum(["BANK", "TUNAI"]),
      confirm: z.literal("on"),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/pengaturan/simpanan?error=fill");

  const result = await prisma.$transaction(
    async (tx) => {
      const members = await tx.member.findMany({
        where: missingPrincipalWhere,
        select: { id: true, name: true },
      });
      return recordPrincipalSavings(tx, {
        members,
        createdById: session.user.id,
        channel: parsed.data.channel,
        note: "Simpanan pokok otomatis (pengisian awal anggota aktif)",
      });
    },
    { timeout: 120_000, maxWait: 10_000 },
  );

  revalidatePath("/pengaturan/simpanan");
  revalidatePath("/simpanan");
  revalidatePath("/anggota");
  redirect(`/pengaturan/simpanan?filled=${result.count}`);
}
