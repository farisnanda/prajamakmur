import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

const DEFAULT_PREFIX = "PM-";
const DEFAULT_WIDTH = 4;

/**
 * Next free member numbers, continuing the existing sequence.
 * The sequence is the most common "prefix + digits" pattern among current
 * numbers (e.g. PM-0012 -> PM-0013), keeping its prefix and zero padding.
 * With no members yet it starts at PM-0001.
 */
export async function nextMemberNumbers(
  db: Db,
  count = 1,
  reserved: Iterable<string> = [],
): Promise<string[]> {
  const rows = await db.member.findMany({ select: { memberNumber: true } });

  const patterns = new Map<string, { n: number; max: number; width: number }>();
  for (const { memberNumber } of rows) {
    const match = /^(.*?)(\d+)$/.exec(memberNumber.trim());
    if (!match) continue;
    const entry = patterns.get(match[1]) ?? { n: 0, max: 0, width: 0 };
    entry.n += 1;
    entry.max = Math.max(entry.max, Number(match[2]));
    entry.width = Math.max(entry.width, match[2].length);
    patterns.set(match[1], entry);
  }

  let prefix = DEFAULT_PREFIX;
  let max = 0;
  let width = DEFAULT_WIDTH;
  let best = 0;
  for (const [key, entry] of patterns) {
    if (entry.n > best) {
      best = entry.n;
      prefix = key;
      max = entry.max;
      width = entry.width;
    }
  }

  const taken = new Set([...rows.map((row) => row.memberNumber), ...reserved]);
  const result: string[] = [];
  let next = max;
  while (result.length < count) {
    next += 1;
    const candidate = `${prefix}${String(next).padStart(width, "0")}`;
    if (!taken.has(candidate)) result.push(candidate);
  }
  return result;
}

export async function nextMemberNumber(db: Db): Promise<string> {
  return (await nextMemberNumbers(db, 1))[0];
}
