/**
 * Log terstruktur satu baris (JSON) ke stdout/stderr, supaya mudah dicari di
 * `docker compose logs`. Jangan masukkan password, token, atau data pribadi
 * ke `context`.
 */
function line(level: "error" | "warn" | "info", scope: string, message: string, extra: Record<string, unknown>) {
  return JSON.stringify({ level, scope, message, ...extra, at: new Date().toISOString() });
}

export function logError(scope: string, error: unknown, context: Record<string, unknown> = {}) {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(
    line("error", scope, err.message, {
      ...context,
      stack: err.stack?.split("\n").slice(0, 6).join(" | "),
    }),
  );
}

export function logWarn(scope: string, message: string, context: Record<string, unknown> = {}) {
  console.warn(line("warn", scope, message, context));
}

export function logInfo(scope: string, message: string, context: Record<string, unknown> = {}) {
  console.info(line("info", scope, message, context));
}
