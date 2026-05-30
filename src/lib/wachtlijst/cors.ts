const ALLOWED_ORIGINS = new Set([
  "https://structuro.eu",
  "https://www.structuro.eu",
  "https://structuro.ai",
  "https://www.structuro.ai",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

export function waitlistCorsHeaders(origin: string | null): HeadersInit {
  const allowed =
    origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://www.structuro.eu";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, X-POSTHOG-SESSION-ID, X-POSTHOG-DISTINCT-ID",
  };
}
