import { CANONICAL_PRODUCTION_ORIGIN, getAppOrigin } from "@/lib/appUrl";

const STATIC_ALLOWED_HOSTS = new Set([
  "structuro.ai",
  "www.structuro.ai",
  "localhost:3000",
  "localhost:3001",
  "127.0.0.1:3000",
]);

/** Veilige redirect-basis: env-first, daarna request-host, nooit blind VERCEL_URL. */
export function resolveTrustedAppOrigin(requestOrigin: string): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.NODE_ENV === "development") {
    return requestOrigin.replace(/\/$/, "");
  }
  try {
    const host = new URL(requestOrigin).host.toLowerCase();
    if (isAllowedAppHost(host)) {
      return requestOrigin.replace(/\/$/, "");
    }
  } catch {
    /* ignore */
  }
  if (process.env.VERCEL_ENV === "production") {
    return CANONICAL_PRODUCTION_ORIGIN;
  }
  return getAppOrigin().replace(/\/$/, "");
}

export function isAllowedAppHost(hostHeader: string | null): boolean {
  if (!hostHeader) return false;
  const host = hostHeader.split(",")[0]?.trim().toLowerCase();
  if (!host) return false;
  if (STATIC_ALLOWED_HOSTS.has(host)) return true;

  const vercel = process.env.VERCEL_URL?.trim().toLowerCase();
  if (vercel) {
    const vercelHost = vercel.replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (host === vercelHost) return true;
  }

  return false;
}

/** Alleen relatieve paden binnen de app; blokkeert open redirects. */
export function sanitizeNextPath(next: string | null | undefined): string {
  const raw = (next ?? "/").trim();
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/";
  if (raw.includes("://") || raw.includes("\\")) return "/";
  if (raw.includes("@")) return "/";
  return raw;
}

export function buildTrustedRedirectUrl(
  requestOrigin: string,
  forwardedHost: string | null,
  nextPath: string
): string {
  const safeNext = sanitizeNextPath(nextPath);
  const trustedOrigin = resolveTrustedAppOrigin(requestOrigin);

  if (process.env.NODE_ENV === "development") {
    return `${trustedOrigin}${safeNext}`;
  }

  if (isAllowedAppHost(forwardedHost)) {
    const host = forwardedHost!.split(",")[0]!.trim().toLowerCase();
    return `https://${host}${safeNext}`;
  }

  return `${trustedOrigin}${safeNext}`;
}
