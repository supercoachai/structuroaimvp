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
