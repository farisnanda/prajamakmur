"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { applyRebalance, planRebalance } from "@/lib/loanRebalance";
import { prisma } from "@/lib/prisma";

export async function rebalanceLoans(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || !["SUPER_ADMIN", "ADMIN_KOPERASI"].includes(session.user.role))
    throw new Error("Akses admin diperlukan.");
  if (formData.get("confirm") !== "on") redirect("/pengaturan/pinjaman?error=confirm");

  const count = await prisma.$transaction(
    async (tx) => {
      const plan = await planRebalance(tx);
      await applyRebalance(tx, plan.changes);
      return plan.changes.length;
    },
    { timeout: 180_000, maxWait: 10_000 },
  );

  revalidatePath("/pengaturan/pinjaman");
  revalidatePath("/pinjaman/pembayaran");
  revalidatePath("/akuntansi/hasil-usaha");
  revalidatePath("/akuntansi/arus-kas");
  revalidatePath("/dashboard");
  redirect(`/pengaturan/pinjaman?done=${count}`);
}
