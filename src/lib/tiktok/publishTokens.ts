import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "crypto";

export const TIKTOK_TOKEN_COOKIE = "structuro_tiktok_publish";
export const TIKTOK_OAUTH_STATE_COOKIE = "structuro_tiktok_oauth_state";
export const TIKTOK_TOKEN_COOKIE_MAX_AGE_SEC = 30 * 24 * 60 * 60;
export const TIKTOK_OAUTH_STATE_MAX_AGE_SEC = 10 * 60;

export type TikTokStoredTokens = {
  access_token: string;
  refresh_token: string;
  open_id: string;
  scope: string;
  /** unix seconds */
  access_expires_at: number;
  /** unix seconds */
  refresh_expires_at: number;
};

function tokenSecret(): string {
  return (
    process.env.TIKTOK_TOKEN_SECRET?.trim() ||
    process.env.STRUCTURO_ACTIVITY_ADMIN_SECRET?.trim() ||
    ""
  );
}

function aesKey(): Buffer | null {
  const secret = tokenSecret();
  if (!secret) return null;
  return createHash("sha256").update(`tiktok-publish:${secret}`).digest();
}

/** Versleutelt token-payload voor httpOnly cookie. */
export function sealTikTokTokens(tokens: TikTokStoredTokens): string | null {
  const key = aesKey();
  if (!key) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(tokens), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function openTikTokTokens(
  sealed: string | null | undefined
): TikTokStoredTokens | null {
  const key = aesKey();
  if (!key || !sealed) return null;
  const parts = sealed.split(".");
  if (parts.length !== 3) return null;
  try {
    const [ivB64, tagB64, dataB64] = parts;
    const iv = Buffer.from(ivB64, "base64url");
    const tag = Buffer.from(tagB64, "base64url");
    const data = Buffer.from(dataB64, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(data), decipher.final()]);
    const parsed = JSON.parse(plaintext.toString("utf8")) as TikTokStoredTokens;
    if (
      typeof parsed.access_token !== "string" ||
      typeof parsed.refresh_token !== "string" ||
      typeof parsed.open_id !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function createOAuthState(): string {
  return randomBytes(24).toString("base64url");
}

export function signOAuthState(state: string): string {
  const secret = tokenSecret();
  if (!secret) return "";
  return createHmac("sha256", secret).update(state).digest("base64url");
}

export function verifyOAuthStateCookie(
  cookieValue: string | null | undefined,
  returnedState: string | null | undefined
): boolean {
  if (!cookieValue || !returnedState) return false;
  const [state, sig] = cookieValue.split(".");
  if (!state || !sig || state !== returnedState) return false;
  const expected = signOAuthState(state);
  if (!expected) return false;
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function packOAuthStateCookie(state: string): string {
  return `${state}.${signOAuthState(state)}`;
}

export function tokensFromOAuthResponse(body: {
  access_token: string;
  refresh_token: string;
  open_id: string;
  scope?: string;
  expires_in: number;
  refresh_expires_in: number;
}): TikTokStoredTokens {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    open_id: body.open_id,
    scope: body.scope ?? "",
    access_expires_at: now + Number(body.expires_in || 0),
    refresh_expires_at: now + Number(body.refresh_expires_in || 0),
  };
}
