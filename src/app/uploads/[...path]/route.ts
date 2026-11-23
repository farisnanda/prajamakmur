import { readFile, stat } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

// Foto yang diunggah setelah aplikasi berjalan tidak disajikan oleh folder `public`
// di mode produksi, jadi disajikan lewat rute ini langsung dari disk.
const ROOT = path.join(process.cwd(), "public", "uploads");

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const segments = (await params).path;
  const file = path.resolve(ROOT, ...segments);

  // Hanya file di dalam folder uploads, dan hanya gambar.
  const contentType = TYPES[path.extname(file).toLowerCase()];
  if (!file.startsWith(ROOT + path.sep) || !contentType) {
    return new NextResponse("Tidak ditemukan.", { status: 404 });
  }

  try {
    if (!(await stat(file)).isFile()) throw new Error("not a file");
    const body = await readFile(file);
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": contentType,
        // Nama file unik (waktu + acak), jadi aman di-cache lama.
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Tidak ditemukan.", { status: 404 });
  }
}
