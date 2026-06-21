/** Redirect na OAuth / magic link; altijd via /auth/callback zodat cookies gezet worden. */
export function buildAuthCallbackUrl(nextPath = "/onboarding"): string {
  const next = encodeURIComponent(nextPath);
  if (typeof window === "undefined") {
    return `https://www.structuro.ai/auth/callback?next=${next}`;
  }
  return `${window.location.origin}/auth/callback?next=${next}`;
}
