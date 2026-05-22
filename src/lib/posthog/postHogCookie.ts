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
