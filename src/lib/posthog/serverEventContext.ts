export type ServerEventRequestContext = {
  ip?: string | null;
  userAgent?: string | null;
};

/** Client IP + User-Agent uit een Next.js/API Request (Vercel x-forwarded-for). */
export function extractRequestClientContext(
  request: Request
): ServerEventRequestContext {
  const userAgent = request.headers.get("user-agent")?.trim() || null;
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    null;
  return { ip, userAgent };
}

export function withRequestClientContext(
  properties: Record<string, unknown>,
  context?: ServerEventRequestContext | null
): Record<string, unknown> {
  if (!context) return properties;
  const out = { ...properties };
  if (context.userAgent) out.$raw_user_agent = context.userAgent;
  if (context.ip) out.$ip = context.ip;
  return out;
}

/** Gedeelde properties voor server-side PostHog product events. */
export function getServerEventEnvironment(): string {
  return (
    process.env.VERCEL_ENV?.trim() ||
    process.env.NEXT_PUBLIC_VERCEL_ENV?.trim() ||
    (process.env.NODE_ENV === "production" ? "production" : "development")
  );
}

export function withServerEventContext(
  properties?: Record<string, unknown>
): Record<string, unknown> {
  return {
    site: "ai",
    environment: getServerEventEnvironment(),
    ...properties,
  };
}
