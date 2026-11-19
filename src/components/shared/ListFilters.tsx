import { Search, X } from "lucide-react";
import Link from "next/link";

type Select = {
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
};

/**
 * GET form for search and filters. Submitting drops `page`, so the result
 * always starts from page 1. Works without JavaScript.
 */
export function ListFilters({
  basePath,
  q,
  placeholder = "Cari...",
  selects = [],
  dates,
}: {
  basePath: string;
  q: string;
  placeholder?: string;
  selects?: Select[];
  dates?: { from: string; to: string };
}) {
  const active = q || selects.some((s) => s.value) || dates?.from || dates?.to;
  const control =
    "h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50";

  return (
    <form action={basePath} className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="flex h-11 flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-blue-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100">
        <Search size={18} className="shrink-0 text-slate-400" />
        <input
          name="q"
          defaultValue={q}
          placeholder={placeholder}
          aria-label="Cari"
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
      </div>

      {selects.map((select) => (
        <select
          key={select.name}
          name={select.name}
          defaultValue={select.value}
          aria-label={select.label}
          className={`${control} font-medium`}
        >
          <option value="">{select.label}</option>
          {select.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ))}

      {dates && (
        <div className="flex items-center gap-2">
          <input type="date" name="from" defaultValue={dates.from} aria-label="Dari tanggal" className={control} />
          <span className="text-slate-400">–</span>
          <input type="date" name="to" defaultValue={dates.to} aria-label="Sampai tanggal" className={control} />
        </div>
      )}

      <div className="flex gap-2">
        <button className="h-11 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-slate-800">
          Terapkan
        </button>
        {active && (
          <Link
            href={basePath}
            className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            <X size={16} /> Reset
          </Link>
        )}
      </div>
    </form>
  );
}
