/**
 * Anonieme onboarding-gebruikers mogen AI-microstappen vóór account-aanmaak.
 * Geen shared store (geen Redis/KV): best-effort per serverless-instance.
 *
 * Twee vensters:
 * - burst: blokkeert snelle spam (bots die knoppen hammeren)
 * - uur: lage kostenplafond voor echte onboarding (1–3 clicks volstaat)
 */

const BURST_WINDOW_MS = 60 * 1000;
const BURST_MAX = 2;

const HOUR_WINDOW_MS = 60 * 60 * 1000;
const HOUR_MAX = 3;

const hitsByIp = new Map<string, number[]>();

export type AnonymousMicroStepsQuota = {
  allowed: boolean;
  remaining: number;
  limit: number;
  reason?: "burst" | "hourly";
};

function prune(timestamps: number[], now: number, windowMs: number): number[] {
  return timestamps.filter((t) => now - t < windowMs);
}

/** Alleen voor unit tests. */
export function __resetAnonymousMicroStepsQuotaForTests(): void {
  hitsByIp.clear();
}

/**
 * Verbruikt 1 anonieme poging voor dit IP. Telt voor elke POST
 * (ook template-hits), zodat bots het endpoint niet kunnen leeghameren.
 */
export function consumeAnonymousMicroStepsQuota(
  ip: string,
): AnonymousMicroStepsQuota {
  const key = ip.trim() || "unknown";
  const now = Date.now();
  const recentHour = prune(hitsByIp.get(key) ?? [], now, HOUR_WINDOW_MS);
  const recentBurst = prune(recentHour, now, BURST_WINDOW_MS);

  if (recentBurst.length >= BURST_MAX) {
    return {
      allowed: false,
      remaining: 0,
      limit: HOUR_MAX,
      reason: "burst",
    };
  }

  if (recentHour.length >= HOUR_MAX) {
    return {
      allowed: false,
      remaining: 0,
      limit: HOUR_MAX,
      reason: "hourly",
    };
  }

  recentHour.push(now);
  hitsByIp.set(key, recentHour);
  return {
    allowed: true,
    remaining: Math.max(0, HOUR_MAX - recentHour.length),
    limit: HOUR_MAX,
  };
}
