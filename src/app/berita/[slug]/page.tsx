import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { mediaUrl } from "@/lib/landing";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params,
    post = await prisma.newsPost.findUnique({ where: { slug } });
  if (!post || !post.isPublished) notFound();
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3 font-bold">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              PM
            </span>
            Praja Makmur
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-bold text-blue-700"
          >
            <ArrowLeft size={17} />
            Kembali
          </Link>
        </div>
      </header>
      <article className="mx-auto max-w-4xl px-6 py-16">
        <div className="flex items-center gap-2 text-sm font-bold text-blue-600">
          <CalendarDays size={18} />
          {new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(
            post.eventDate,
          )}
        </div>
        <h1 className="mt-5 text-4xl font-black leading-tight md:text-5xl">
          {post.title}
        </h1>
        <p className="mt-5 text-xl leading-8 text-slate-600">{post.excerpt}</p>
        <img
          src={mediaUrl(post.imageUrl)}
          alt={post.title}
          className="mt-10 aspect-[16/9] w-full rounded-[32px] object-cover shadow-xl"
        />
        <div className="mt-10 whitespace-pre-line text-lg leading-9 text-slate-700">
          {post.content}
        </div>
      </article>
      <footer className="border-t bg-white py-8 text-center text-sm text-slate-500">
        © 2026 Koperasi Praja Makmur
      </footer>
    </main>
  );
}
