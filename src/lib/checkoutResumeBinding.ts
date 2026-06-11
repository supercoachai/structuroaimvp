import { createHmac, timingSafeEqual } from "crypto";

export const CHECKOUT_RESUME_COOKIE = "structuro_checkout_resume";
export const CHECKOUT_RESUME_MAX_AGE_SEC = 48 * 60 * 60;

function resolveSecret(): string {
  const fromEnv =
    process.env.CHECKOUT_RESUME_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "development") {
    return "dev-checkout-resume-secret";
  }
  throw new Error("CHECKOUT_RESUME_SECRET ontbreekt");
}

/** Ondertekend token dat session_id aan deze browser koppelt. */
export function signCheckoutResumeToken(sessionId: string): string {
  const exp = Math.floor(Date.now() / 1000) + CHECKOUT_RESUME_MAX_AGE_SEC;
  const payload = `${sessionId}.${exp}`;
  const sig = createHmac("sha256", resolveSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyCheckoutResumeToken(
  token: string | undefined | null,
  sessionId: string
): boolean {
  if (!token || !sessionId.startsWith("cs_")) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [sid, expStr, sig] = parts;
  if (sid !== sessionId) return false;

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    return false;
  }

  const payload = `${sid}.${expStr}`;
  const expected = createHmac("sha256", resolveSecret())
    .update(payload)
    .digest("base64url");

  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
