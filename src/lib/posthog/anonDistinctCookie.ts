import { ACQUISITION_VISITOR_UUID_RE } from "@/lib/posthog/parseAcquisitionPayload";

/** First-party cookie: anonieme PostHog distinct_id voor server-side alias bij signup. */
export const ST_PH_DID_COOKIE = "st_ph_did";
const ST_PH_DID_MAX_AGE_SEC = 60 * 60 * 24 * 30;

export function isValidAnonDistinctId(
  raw: string | null | undefined
): raw is string {
  return typeof raw === "string" && ACQUISITION_VISITOR_UUID_RE.test(raw.trim());
}

export function normalizeAnonDistinctId(
  raw: string | null | undefined
): string | null {
  if (!isValidAnonDistinctId(raw)) return null;
  return raw.trim().toLowerCase();
}

/** Client: bewaar anon-id zodat /auth/callback hem kan lezen na OAuth/magic link. */
export function writeAnonDistinctIdCookie(distinctId: string): void {
  if (typeof document === "undefined") return;
  const id = normalizeAnonDistinctId(distinctId);
  if (!id) return;
  try {
    document.cookie = `${ST_PH_DID_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=${ST_PH_DID_MAX_AGE_SEC}; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

export function clearAnonDistinctIdCookie(): void {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${ST_PH_DID_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

export function readAnonDistinctIdFromCookieHeader(
  cookieHeader: string | null | undefined
): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rest] = part.trim().split("=");
    if (rawName !== ST_PH_DID_COOKIE) continue;
    try {
      return normalizeAnonDistinctId(decodeURIComponent(rest.join("=")));
    } catch {
      return normalizeAnonDistinctId(rest.join("="));
    }
  }
  return null;
}

/** Haal `_ph_did` uit een relative next-path (`/abonnement?_ph_did=…`). */
export function readAnonDistinctIdFromNextPath(
  nextPath: string | null | undefined
): string | null {
  if (!nextPath || !nextPath.startsWith("/")) return null;
  const q = nextPath.indexOf("?");
  if (q < 0) return null;
  try {
    const params = new URLSearchParams(nextPath.slice(q + 1));
    return normalizeAnonDistinctId(params.get("_ph_did"));
  } catch {
    return null;
  }
}

/** Plak `_ph_did` op een relative path voor OAuth/magic-link round-trip. */
export function appendAnonDistinctIdToPath(
  path: string,
  distinctId: string | null | undefined
): string {
  const id = normalizeAnonDistinctId(distinctId);
  if (!id) return path;
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  const hashIdx = path.indexOf("#");
  const beforeHash = hashIdx >= 0 ? path.slice(0, hashIdx) : path;
  const hash = hashIdx >= 0 ? path.slice(hashIdx) : "";
  const q = beforeHash.indexOf("?");
  const pathname = q >= 0 ? beforeHash.slice(0, q) : beforeHash;
  const params = new URLSearchParams(q >= 0 ? beforeHash.slice(q + 1) : "");
  params.set("_ph_did", id);
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ""}${hash}`;
}

/** Verwijder `_ph_did` uit next-path vóór de zichtbare redirect. */
export function stripAnonDistinctIdFromPath(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  const hashIdx = path.indexOf("#");
  const beforeHash = hashIdx >= 0 ? path.slice(0, hashIdx) : path;
  const hash = hashIdx >= 0 ? path.slice(hashIdx) : "";
  const q = beforeHash.indexOf("?");
  if (q < 0) return path;
  const pathname = beforeHash.slice(0, q);
  const params = new URLSearchParams(beforeHash.slice(q + 1));
  if (!params.has("_ph_did")) return path;
  params.delete("_ph_did");
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ""}${hash}`;
}
