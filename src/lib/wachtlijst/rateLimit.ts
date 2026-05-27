const WINDOW_MS = 60_000;
const MAX_REQUESTS = 8;

const hitsByIp = new Map<string, number[]>();

/** Best-effort per-instance rate limit (serverless); combineert met e-mail dedup. */
export function isWaitlistRateLimited(ip: string): boolean {
  const key = ip.trim() || "unknown";
  const now = Date.now();
  const recent = (hitsByIp.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) return true;
  recent.push(now);
  hitsByIp.set(key, recent);
  return false;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
