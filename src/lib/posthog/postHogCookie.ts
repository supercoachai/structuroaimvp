import { POSTHOG_SESSION_ID_HEADER } from "./tracingHeaders";

/** Parse PostHog cookie voor $session_id (geen user id / PII uit auth). */
export function extractPostHogSessionIdFromCookieHeader(
  cookieHeader: string | null | undefined
): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/ph_phc_.*?_posthog=([^;]+)/);
  if (!match?.[1]) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1])) as {
      $session_id?: unknown;
    };
    return typeof parsed.$session_id === "string" ? parsed.$session_id : null;
  } catch {
    return null;
  }
}

type RequestLikeHeaders = {
  get(name: string): string | null;
};

/** Session ID uit tracing header (fetch) of PostHog-cookie (SSR / legacy). */
export function extractPostHogSessionIdFromRequest(
  headers: RequestLikeHeaders
): string | null {
  const fromHeader = headers.get(POSTHOG_SESSION_ID_HEADER)?.trim();
  if (fromHeader) return fromHeader;
  return extractPostHogSessionIdFromCookieHeader(headers.get("cookie"));
}
