import { createHmac, timingSafeEqual } from "node:crypto";

import { getAppOrigin } from "@/lib/appUrl";

function isProductionRuntime(): boolean {
  return (
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production"
  );
}

/**
 * Secret voor one-click cancel HMAC.
 * Productie: LIFECYCLE_UNSUBSCRIBE_SECRET of dedicated SUBSCRIPTION_CANCEL_SECRET.
 */
function secret(): string {
  const dedicated =
    process.env.SUBSCRIPTION_CANCEL_SECRET?.trim() ||
    process.env.LIFECYCLE_UNSUBSCRIBE_SECRET?.trim();
  if (dedicated) return dedicated;
  if (isProductionRuntime()) return "";
  return process.env.CRON_SECRET?.trim() || "";
}

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Token: userId.expMs.sig (base64url). */
export function signSubscriptionCancelToken(
  userId: string,
  ttlMs = DEFAULT_TTL_MS
): string | null {
  const s = secret();
  if (!s || !userId) return null;
  const exp = String(Date.now() + Math.max(60_000, ttlMs));
  const payload = `${userId}.${exp}`;
  const sig = createHmac("sha256", s).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySubscriptionCancelToken(
  token: string | null | undefined
): string | null {
  const s = secret();
  if (!s || !token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expRaw, sig] = parts;
  if (!userId || !expRaw || !sig) return null;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Date.now()) return null;
  const expected = createHmac("sha256", s)
    .update(`${userId}.${expRaw}`)
    .digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return userId;
}

export function subscriptionCancelPageUrl(userId: string): string | null {
  const token = signSubscriptionCancelToken(userId);
  if (!token) return null;
  const origin = getAppOrigin();
  return `${origin}/stop-abonnement?token=${encodeURIComponent(token)}`;
}
