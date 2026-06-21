/**
 * Anonieme onboarding-gebruikers mogen de AI-microstappen proberen vóór ze een
 * account maken. Geen Supabase-quota beschikbaar (geen auth.uid), dus best-effort
 * IP-limiet per serverless-instance. Bewust laag om misbruik/kosten te beperken.
 */
const WINDOW_MS = 60 * 60 * 1000; // 1 uur
const MAX_REQUESTS = 6;

const hitsByIp = new Map<string, number[]>();

export type AnonymousMicroStepsQuota = {
  allowed: boolean;
  remaining: number;
  limit: number;
};

export function consumeAnonymousMicroStepsQuota(
  ip: string
): AnonymousMicroStepsQuota {
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
