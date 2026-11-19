"use client";

import { LoaderCircle, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";

type Select = {
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
};

const SEARCH_DELAY_MS = 300;

/**
 * Search and filters that apply as you type or choose: no Apply button.
 * Each change rewrites the query string (dropping `page`, so results start
 * at page 1) and the server re-renders the list. The input keeps focus.
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
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, startTransition] = useTransition();

  const active = q || selects.some((s) => s.value) || dates?.from || dates?.to;
  const control =
    "h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50";

  function apply() {
    const form = formRef.current;
    if (!form) return;
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form).entries()) {
      const text = String(value).trim();
      if (text) params.set(key, text);
    }
    const search = params.toString();
    startTransition(() => {
      router.replace(search ? `${basePath}?${search}` : basePath, { scroll: false });
    });
  }

  function applySoon() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(apply, SEARCH_DELAY_MS);
  }

  function reset() {
    const form = formRef.current;
    if (timer.current) clearTimeout(timer.current);
    if (form) {
      for (const element of Array.from(form.elements)) {
        if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement) {
          if (element.type !== "submit") element.value = "";
        }
      }
    }
    startTransition(() => router.replace(basePath, { scroll: false }));
  }

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <form
      ref={formRef}
      action={basePath}
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        if (timer.current) clearTimeout(timer.current);
        apply();
      }}
      className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center"
    >
      <div className="flex h-11 flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-blue-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100">
        {pending ? (
          <LoaderCircle size={18} className="shrink-0 animate-spin text-blue-500" />
        ) : (
          <Search size={18} className="shrink-0 text-slate-400" />
        )}
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder={placeholder}
          aria-label="Cari"
          autoComplete="off"
          onChange={applySoon}
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400 [&::-webkit-search-cancel-button]:appearance-none"
        />
      </div>

      {selects.map((select) => (
        <select
          key={select.name}
          name={select.name}
          defaultValue={select.value}
          aria-label={select.label}
          onChange={apply}
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
          <input
            type="date"
            name="from"
            defaultValue={dates.from}
            aria-label="Dari tanggal"
            onChange={apply}
            className={control}
          />
          <span className="text-slate-400">–</span>
          <input
            type="date"
            name="to"
            defaultValue={dates.to}
            aria-label="Sampai tanggal"
            onChange={apply}
            className={control}
          />
        </div>
      )}

      {active && (
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          <X size={16} /> Reset
        </button>
      )}
      {/* Enter key and no-JS fallback */}
      <button type="submit" className="sr-only">
        Cari
      </button>
    </form>
  );
}
