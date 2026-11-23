"use server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const amount = z.coerce
  .number()
  .int()
  .min(0)
  .max(100_000_000);

export async function updateSavingsSetting(formData: FormData) {
  const s = await getServerSession(authOptions);
  if (!s || !["SUPER_ADMIN", "ADMIN_KOPERASI"].includes(s.user.role))
    throw new Error("Akses admin diperlukan.");

  const parsed = z
    .object({
      principalAmount: amount,
      mandatoryPnsAmount: amount,
      mandatoryPppkAmount: amount,
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/pengaturan/simpanan?error=invalid");

  await prisma.savingsSetting.upsert({
    where: { id: "default" },
    update: parsed.data,
    create: { id: "default", ...parsed.data },
  });
  await audit({
    action: "SETTINGS_SAVINGS",
    summary: `Mengubah nominal simpanan: pokok Rp${parsed.data.principalAmount.toLocaleString("id-ID")}, wajib PNS Rp${parsed.data.mandatoryPnsAmount.toLocaleString("id-ID")}, wajib PPPK Rp${parsed.data.mandatoryPppkAmount.toLocaleString("id-ID")}`,
    metadata: parsed.data,
  });
  revalidatePath("/");
  revalidatePath("/simpanan");
  revalidatePath("/pengaturan/simpanan");
  redirect("/pengaturan/simpanan?success=saved");
}
