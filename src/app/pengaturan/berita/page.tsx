import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ImagePlus, Newspaper, Trash2 } from "lucide-react";
import { createNews, deleteNews } from "./actions";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
import { authOptions } from "@/lib/auth";
import { ListFilters } from "@/components/shared/ListFilters";
import { Pagination } from "@/components/shared/Pagination";
import { clampPage, dateRange, firstParam, pageWindow, parsePage } from "@/lib/listing";
import { prisma } from "@/lib/prisma";
import { mediaUrl } from "@/lib/landing";
const input =
  "mt-2 w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    success?: string;
    error?: string;
    q?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const s = await getServerSession(authOptions);
  if (!s) redirect("/login");
  if (!["SUPER_ADMIN", "ADMIN_KOPERASI"].includes(s.user.role))
    redirect("/dashboard");
  const q = await searchParams,
    search = firstParam(q.q),
    from = firstParam(q.from),
    to = firstParam(q.to),
    where = {
      eventDate: dateRange(from, to),
      OR: search
        ? [
            { title: { contains: search, mode: "insensitive" as const } },
            { excerpt: { contains: search, mode: "insensitive" as const } },
          ]
        : undefined,
    },
    total = await prisma.newsPost.count({ where }),
    page = clampPage(parsePage(q.page), total),
    posts = await prisma.newsPost.findMany({
      where,
      orderBy: [{ eventDate: "desc" }, { id: "asc" }],
      ...pageWindow(page),
    });
  return (
    <>
      <AppSidebar />
      <Topbar
        user={s.user}
        title="Berita & Kegiatan"
        subtitle="Kelola publikasi kegiatan Koperasi Praja Makmur"
      />
      <main className="min-h-screen bg-slate-50 px-4 pb-12 pt-24 sm:px-6 lg:ml-[280px] lg:px-10 lg:pt-28">
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
        <SettingsTabs active="berita" />
        <section className="grid gap-6 xl:grid-cols-12">
          <div className="rounded-card border border-slate-200/70 bg-white p-5 shadow-sm sm:p-7 xl:col-span-5">
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
          <div className="rounded-card border border-slate-200/70 bg-white p-5 shadow-sm sm:p-7 xl:col-span-7">
            <h3 className="font-bold">Berita Terbit</h3>
            <p className="text-sm text-slate-500">
              {total.toLocaleString("id-ID")} berita dan kegiatan
            </p>
            <ListFilters
              basePath="/pengaturan/berita"
              q={search}
              placeholder="Cari judul atau ringkasan..."
              dates={{ from, to }}
            />
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
                  <p className="mt-3 text-sm">
                    {search || from || to
                      ? "Tidak ada berita yang sesuai."
                      : "Belum ada berita."}
                  </p>
                </div>
              )}
            </div>
            <Pagination
              basePath="/pengaturan/berita"
              query={{ q: search, from, to }}
              page={page}
              total={total}
            />
          </div>
        </section>
      </main>
    </>
  );
}
