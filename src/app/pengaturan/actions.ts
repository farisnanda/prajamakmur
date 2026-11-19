"use server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { landingDefaults } from "@/lib/landing";
export async function updateLanding(formData: FormData) {
  const s = await getServerSession(authOptions);
  if (!s || !["SUPER_ADMIN", "ADMIN_KOPERASI"].includes(s.user.role))
    throw new Error("Akses admin diperlukan.");
  const imageKeys = [
    "heroImage",
    "showcaseImage1",
    "showcaseImage2",
    "ctaImage",
    "feature1Image",
    "feature2Image",
    "feature3Image",
  ] as const;
  const existing = await prisma.landingContent.findUnique({
    where: { id: "default" },
  });
  const current = {
    ...landingDefaults,
    ...(existing?.content && typeof existing.content === "object"
      ? existing.content
      : {}),
  };
  const content = Object.fromEntries(
    Object.keys(landingDefaults)
      .filter((key) => !imageKeys.includes(key as (typeof imageKeys)[number]))
      .map((key) => {
        // Fields no longer shown in the form keep their stored value.
        const submitted = formData.get(key);
        return [
          key,
          submitted === null
            ? String((current as Record<string, unknown>)[key] ?? "")
            : String(submitted).trim(),
        ];
      }),
  ) as Record<string, string>;
  const dir = path.join(process.cwd(), "public", "uploads", "landing");
  await mkdir(dir, { recursive: true });
  for (const key of imageKeys) {
    const file = formData.get(key);
    content[key] = String((current as Record<string, unknown>)[key] ?? "");
    if (formData.get(`remove_${key}`) === "on") content[key] = "";
    if (file instanceof File && file.size > 0) {
      if (!file.type.startsWith("image/") || file.size > 5_000_000)
        redirect("/pengaturan?error=image");
      const ext =
          file.type === "image/png"
            ? "png"
            : file.type === "image/webp"
              ? "webp"
              : "jpg",
        name = `${key}-${Date.now()}-${crypto.randomUUID().slice(0, 6)}.${ext}`;
      await writeFile(
        path.join(dir, name),
        Buffer.from(await file.arrayBuffer()),
      );
      content[key] = `/uploads/landing/${name}`;
    }
  }
  await prisma.landingContent.upsert({
    where: { id: "default" },
    update: { content },
    create: { id: "default", content },
  });
  revalidatePath("/");
  revalidatePath("/pengaturan");
  redirect("/pengaturan?success=saved");
}
