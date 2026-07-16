/**
 * v2 dumplijst-triage: best-effort IP-limiet voor anonieme testgebruikers.
 * Zelfde patroon als anonymousMicroStepsRateLimit, aparte bucket.
 */
const WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS = 6;

const hitsByIp = new Map<string, number[]>();

export type AnonymousTriageDumpQuota = {
  allowed: boolean;
  remaining: number;
  limit: number;
};

export function consumeAnonymousTriageDumpQuota(ip: string): AnonymousTriageDumpQuota {
  const key = ip.trim() || "unknown";
  const now = Date.now();
  const recent = (hitsByIp.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0, limit: MAX_REQUESTS };
  }

  recent.push(now);
  hitsByIp.set(key, recent);
  return {
    allowed: true,
    remaining: Math.max(0, MAX_REQUESTS - recent.length),
    limit: MAX_REQUESTS,
  };
}
