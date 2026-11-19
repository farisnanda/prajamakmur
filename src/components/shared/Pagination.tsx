import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { PAGE_SIZE } from "@/lib/listing";

type Query = Record<string, string | undefined>;

function hrefFor(basePath: string, query: Query, page: number, pageParam: string) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value && key !== pageParam) params.set(key, value);
  }
  if (page > 1) params.set(pageParam, String(page));
  const search = params.toString();
  return search ? `${basePath}?${search}` : basePath;
}

/** Page numbers with gaps: 1 … 4 5 [6] 7 8 … 20 */
function pages(current: number, last: number): (number | "gap")[] {
  const set = new Set([1, last, current, current - 1, current + 1, current - 2, current + 2]);
  const sorted = [...set].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

export function Pagination({
  basePath,
  query,
  page,
  total,
  pageParam = "page",
}: {
  basePath: string;
  /** Current filters, so they survive page changes. */
  query: Query;
  page: number;
  total: number;
  /** Query key for this table's page, when a screen has several tables. */
  pageParam?: string;
}) {
  const last = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const link =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2.5 text-sm font-semibold transition-colors";

  return (
    <nav
      aria-label="Halaman"
      className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row"
    >
      <p className="text-sm text-slate-500 tabular-nums">
        {total === 0 ? (
          "Tidak ada data"
        ) : (
          <>
            Menampilkan <b className="font-semibold text-slate-800">{from}–{to}</b> dari{" "}
            <b className="font-semibold text-slate-800">{total.toLocaleString("id-ID")}</b> data
          </>
        )}
      </p>

      {last > 1 && (
        <div className="flex items-center gap-1.5">
          {page > 1 ? (
            <Link
              href={hrefFor(basePath, query, page - 1, pageParam)}
              aria-label="Halaman sebelumnya"
              className={`${link} border-slate-200 text-slate-600 hover:bg-slate-50`}
            >
              <ChevronLeft size={16} />
            </Link>
          ) : (
            <span aria-hidden="true" className={`${link} border-slate-100 text-slate-300`}>
              <ChevronLeft size={16} />
            </span>
          )}

          {pages(page, last).map((item, index) =>
            item === "gap" ? (
              <span key={`gap-${index}`} className="px-1 text-slate-400">
                …
              </span>
            ) : (
              <Link
                key={item}
                href={hrefFor(basePath, query, item, pageParam)}
                aria-current={item === page ? "page" : undefined}
                className={`${link} tabular-nums ${
                  item === page
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {item}
              </Link>
            ),
          )}

          {page < last ? (
            <Link
              href={hrefFor(basePath, query, page + 1, pageParam)}
              aria-label="Halaman berikutnya"
              className={`${link} border-slate-200 text-slate-600 hover:bg-slate-50`}
            >
              <ChevronRight size={16} />
            </Link>
          ) : (
            <span aria-hidden="true" className={`${link} border-slate-100 text-slate-300`}>
              <ChevronRight size={16} />
            </span>
          )}
        </div>
      )}
    </nav>
  );
}
