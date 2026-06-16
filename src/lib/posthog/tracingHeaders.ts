/** Hostnames waarvoor posthog-js X-POSTHOG-SESSION-ID op fetch/XHR zet. */
export const POSTHOG_TRACING_HEADER_HOSTNAMES = [
  "localhost",
  "127.0.0.1",
  "structuro.ai",
  "www.structuro.ai",
  "structuro.eu",
  "www.structuro.eu",
  "t.structuro.eu",
] as const;

export function posthogTracingHeaderHostnames(): string[] {
  const hostnames = new Set<string>(POSTHOG_TRACING_HEADER_HOSTNAMES);
  if (typeof window !== "undefined") {
    const current = window.location.hostname?.trim();
    if (current) hostnames.add(current);
  }
  return [...hostnames];
}

export const POSTHOG_SESSION_ID_HEADER = "x-posthog-session-id";
