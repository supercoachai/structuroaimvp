import { createHmac, timingSafeEqual } from "crypto";

export type AdminScope = "activity";

const COOKIE_PREFIX = "structuro_admin_";
export const ADMIN_COOKIE_MAX_AGE_SEC = 12 * 60 * 60;

function secretForScope(_scope: AdminScope): string {
  return process.env.STRUCTURO_ACTIVITY_ADMIN_SECRET?.trim() ?? "";
}

export function adminCookieName(scope: AdminScope): string {
  return `${COOKIE_PREFIX}${scope}`;
}

/** Valideert het ruwe secret tegen de env-waarde voor deze scope. */
export function isAdminSecretValid(
  scope: AdminScope,
  provided: string | null | undefined
): boolean {
  const expected = secretForScope(scope);
  const got = (provided ?? "").trim();
  if (!expected || !got) return false;
  try {
    const a = Buffer.from(got);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Ondertekend cookie-token zodat het ruwe secret nooit in de cookie staat. */
export function signAdminCookie(scope: AdminScope): string {
  const exp = Math.floor(Date.now() / 1000) + ADMIN_COOKIE_MAX_AGE_SEC;
  const payload = `${scope}.${exp}`;
  const sig = createHmac("sha256", secretForScope(scope))
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyAdminCookie(
  scope: AdminScope,
  token: string | null | undefined
): boolean {
  const secret = secretForScope(scope);
  if (!secret || !token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [scopePart, expStr, sig] = parts;
  if (scopePart !== scope) return false;

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${scopePart}.${expStr}`)
    .digest("base64url");

  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
