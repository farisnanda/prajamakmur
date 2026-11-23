import { logWarn } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS_PER_IDENTIFIER = 5;
const MAX_FAILS_PER_IP = 30;
const KEEP_DAYS = 14;

export class RateLimited extends Error {
  constructor(readonly retryAfterMinutes: number) {
    super(`RATE_LIMITED:${retryAfterMinutes}`);
  }
}

export function clientIp(headers: Record<string, string | string[] | undefined> | undefined) {
  const raw = headers?.["x-forwarded-for"] ?? headers?.["x-real-ip"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.split(",")[0]?.trim() || null;
}

/**
 * Tolak login bila terlalu banyak percobaan gagal belakangan ini untuk NIP/email
 * yang sama (sejak login berhasil terakhir) atau dari alamat yang sama.
 * Dihitung dari identifier yang diketik, ada atau tidaknya akun tidak bocor.
 */
export async function assertLoginAllowed(identifier: string, ip: string | null) {
  const since = new Date(Date.now() - WINDOW_MS);
  const lastSuccess = await prisma.loginAttempt.findFirst({
    where: { identifier, success: true, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const from = lastSuccess?.createdAt ?? since;

  const [byIdentifier, byIp, oldest] = await Promise.all([
    prisma.loginAttempt.count({ where: { identifier, success: false, createdAt: { gt: from } } }),
    ip
      ? prisma.loginAttempt.count({ where: { ip, success: false, createdAt: { gte: since } } })
      : Promise.resolve(0),
    prisma.loginAttempt.findFirst({
      where: { identifier, success: false, createdAt: { gt: from } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);

  if (byIdentifier >= MAX_FAILS_PER_IDENTIFIER || byIp >= MAX_FAILS_PER_IP) {
    const unlockAt = (oldest?.createdAt.getTime() ?? Date.now()) + WINDOW_MS;
    const minutes = Math.max(1, Math.ceil((unlockAt - Date.now()) / 60000));
    logWarn("login", "percobaan login dibatasi", { identifier, ip, byIdentifier, byIp });
    throw new RateLimited(minutes);
  }
}

export async function recordLoginAttempt(identifier: string, ip: string | null, success: boolean) {
  await prisma.loginAttempt.create({ data: { identifier, ip, success } });
  // Rapikan catatan lama sesekali.
  if (Math.random() < 0.02) {
    await prisma.loginAttempt.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - KEEP_DAYS * 24 * 3600 * 1000) } },
    });
  }
}
