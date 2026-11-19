export const PAGE_SIZE = 25;

type Param = string | string[] | undefined;

export function firstParam(value: Param): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

/** `?page=` as a positive integer, default 1. */
export function parsePage(value: Param): number {
  const page = Number.parseInt(firstParam(value), 10);
  return Number.isFinite(page) && page > 0 ? Math.min(page, 100_000) : 1;
}

export function pageWindow(page: number) {
  return { skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE };
}

/** Clamp the requested page to the real last page once the total is known. */
export function clampPage(page: number, total: number) {
  return Math.min(page, Math.max(1, Math.ceil(total / PAGE_SIZE)));
}

/** Date range from `YYYY-MM-DD` inputs; `to` is inclusive. */
export function dateRange(from: string, to: string) {
  const start = /^\d{4}-\d{2}-\d{2}$/.test(from) ? new Date(`${from}T00:00:00`) : undefined;
  const end = /^\d{4}-\d{2}-\d{2}$/.test(to) ? new Date(`${to}T23:59:59.999`) : undefined;
  if (!start && !end) return undefined;
  return { gte: start, lte: end };
}
