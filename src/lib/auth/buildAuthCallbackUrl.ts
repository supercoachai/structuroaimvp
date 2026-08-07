import { getAppOrigin } from "@/lib/appUrl";

/** Redirect na OAuth / magic link; altijd via /auth/callback zodat cookies gezet worden. */
export function buildAuthCallbackUrl(
  nextPath = "/onboarding",
  origin?: string
): string {
  const base = (
    origin ??
    (typeof window !== "undefined" ? window.location.origin : getAppOrigin())
  ).replace(/\/$/, "");
  const next = encodeURIComponent(nextPath);
  return `${base}/auth/callback?next=${next}`;
}
