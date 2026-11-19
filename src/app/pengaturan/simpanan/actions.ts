"use server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
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
  revalidatePath("/");
  revalidatePath("/simpanan");
  revalidatePath("/pengaturan/simpanan");
  redirect("/pengaturan/simpanan?success=saved");
}
