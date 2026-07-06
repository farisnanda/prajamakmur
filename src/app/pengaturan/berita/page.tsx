import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ImagePlus, Newspaper, Trash2 } from "lucide-react";
import { createNews, deleteNews } from "./actions";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mediaUrl } from "@/lib/landing";
const input =
  "mt-2 w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const s = await getServerSession(authOptions);
  if (!s) redirect("/login");
  if (!["SUPER_ADMIN", "ADMIN_KOPERASI"].includes(s.user.role))
    redirect("/dashboard");
  const q = await searchParams,
    posts = await prisma.newsPost.findMany({ orderBy: { eventDate: "desc" } });
  return (
    <>
      <AppSidebar />
      <Topbar
        user={s.user}
        title="Berita & Kegiatan"
        subtitle="Kelola publikasi kegiatan Koperasi Praja Makmur"
      />
      <main className="ml-[280px] min-h-screen bg-slate-50 px-8 pb-10 pt-32">
        {q.success && (
          <div className="mb-5 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            Berita berhasil diperbarui.
          </div>
        )}
        {q.error && (
          <div className="mb-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
            Data belum valid. Foto maksimal 5 MB dan seluruh kolom wajib diisi.
          </div>
        )}
        <div className="mb-6 flex gap-3">
          <Link
            href="/pengaturan"
            className="rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-600"
          >
            Konten Landing
          </Link>
          <span className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">
            Berita & Kegiatan
          </span>
        </div>
        <section className="grid grid-cols-12 gap-6">
          <div className="col-span-5 rounded-[28px] bg-white p-7 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <ImagePlus />
              </span>
              <div>
                <h3 className="font-bold">Tambah Berita</h3>
                <p className="text-xs text-slate-500">
                  Publikasikan kegiatan terbaru
                </p>
              </div>
            </div>
            <form action={createNews} className="mt-6 space-y-4">
              <label className="block text-sm font-semibold">
                Judul
                <input name="title" required className={`${input} h-12`} />
              </label>
              <label className="block text-sm font-semibold">
                Tanggal Kegiatan
                <input
                  name="eventDate"
                  type="date"
                  required
                  className={`${input} h-12`}
                />
              </label>
              <label className="block text-sm font-semibold">
                Ringkasan
                <textarea
                  name="excerpt"
                  rows={3}
                  required
                  className={`${input} py-3`}
                />
              </label>
              <label className="block text-sm font-semibold">
                Isi Berita
                <textarea
                  name="content"
                  rows={8}
                  required
                  className={`${input} py-3`}
                />
              </label>
              <label className="block text-sm font-semibold">
                Foto Kegiatan
                <input
                  name="image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                  className={`${input} py-3`}
                />
                <span className="mt-1 block text-xs font-normal text-slate-400">
                  JPG, PNG, atau WebP · maksimal 5 MB
                </span>
              </label>
              <button className="h-12 w-full rounded-xl bg-blue-600 font-bold text-white">
                Publikasikan Berita
              </button>
            </form>
          </div>
          <div className="col-span-7 rounded-[28px] bg-white p-7 shadow-sm">
            <h3 className="font-bold">Berita Terbit</h3>
            <p className="text-sm text-slate-500">
              {posts.length} berita dan kegiatan
            </p>
            <div className="mt-5 space-y-4">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="flex gap-4 rounded-2xl border border-slate-100 p-4"
                >
                  <img
                    src={mediaUrl(post.imageUrl)}
                    alt=""
                    className="h-24 w-32 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-blue-600">
                      {new Intl.DateTimeFormat("id-ID", {
                        dateStyle: "long",
                      }).format(post.eventDate)}
                    </p>
                    <h4 className="mt-1 truncate font-bold">{post.title}</h4>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                      {post.excerpt}
                    </p>
                    <Link
                      href={`/berita/${post.slug}`}
                      target="_blank"
                      className="mt-2 inline-block text-xs font-bold text-blue-700"
                    >
                      Lihat berita
                    </Link>
                  </div>
                  <form action={deleteNews}>
                    <input type="hidden" name="id" value={post.id} />
                    <button
                      aria-label="Hapus berita"
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </form>
                </article>
              ))}
              {!posts.length && (
                <div className="py-16 text-center text-slate-400">
                  <Newspaper className="mx-auto" />
                  <p className="mt-3 text-sm">Belum ada berita.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
