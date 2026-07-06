"use server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
async function admin() {
  const s = await getServerSession(authOptions);
  if (!s || !["SUPER_ADMIN", "ADMIN_KOPERASI"].includes(s.user.role))
    throw new Error("Akses admin diperlukan.");
}
const slugify = (v: string) =>
  v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export async function createNews(formData: FormData) {
  await admin();
  const parsed = z
    .object({
      title: z.string().trim().min(5),
      excerpt: z.string().trim().min(10),
      content: z.string().trim().min(20),
      eventDate: z.coerce.date(),
    })
    .safeParse(Object.fromEntries(formData));
  const image = formData.get("image");
  if (
    !parsed.success ||
    !(image instanceof File) ||
    !image.type.startsWith("image/") ||
    image.size === 0 ||
    image.size > 5_000_000
  )
    redirect("/pengaturan/berita?error=invalid");
  const ext =
      image.type === "image/png"
        ? "png"
        : image.type === "image/webp"
          ? "webp"
          : "jpg",
    name = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`,
    dir = path.join(process.cwd(), "public", "uploads", "news");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await image.arrayBuffer()));
  let slug = slugify(parsed.data.title),
    n = 1;
  while (await prisma.newsPost.findUnique({ where: { slug } }))
    slug = `${slugify(parsed.data.title)}-${++n}`;
  await prisma.newsPost.create({
    data: { ...parsed.data, slug, imageUrl: `/uploads/news/${name}` },
  });
  revalidatePath("/");
  revalidatePath("/pengaturan/berita");
  redirect("/pengaturan/berita?success=created");
}
export async function deleteNews(formData: FormData) {
  await admin();
  const id = z.string().min(1).parse(formData.get("id"));
  await prisma.newsPost.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/pengaturan/berita");
  redirect("/pengaturan/berita?success=deleted");
}
