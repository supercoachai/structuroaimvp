import { createHmac, timingSafeEqual } from "node:crypto";

function isProductionRuntime(): boolean {
  return (
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production"
  );
}

/**
 * Dedicated secret voor unsubscribe HMAC.
 * Productie: fail-closed zonder LIFECYCLE_UNSUBSCRIBE_SECRET (geen CRON_SECRET-fallback).
 * Dev: CRON_SECRET mag als fallback, met console.warn.
 */
function secret(): string {
  const dedicated = process.env.LIFECYCLE_UNSUBSCRIBE_SECRET?.trim();
  if (dedicated) return dedicated;

  if (isProductionRuntime()) {
    return "";
  }

  const fallback = process.env.CRON_SECRET?.trim() || "";
  if (fallback) {
    console.warn(
      "[lifecycleMail] LIFECYCLE_UNSUBSCRIBE_SECRET ontbreekt; CRON_SECRET-fallback alleen in non-production."
    );
  }
  return fallback;
}

export function signLifecycleUnsubscribeToken(userId: string): string | null {
  const s = secret();
  if (!s || !userId) return null;
  const sig = createHmac("sha256", s).update(userId).digest("base64url");
  return `${userId}.${sig}`;
}

export function verifyLifecycleUnsubscribeToken(
  token: string | null | undefined
): string | null {
  const s = secret();
  if (!s || !token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [userId, sig] = parts;
  if (!userId || !sig) return null;
  const expected = createHmac("sha256", s).update(userId).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return userId;
}
