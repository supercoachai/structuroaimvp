const SENSITIVE_QUERY_KEYS = new Set([
  "access_token",
  "refresh_token",
  "token",
  "code",
  "type",
]);

function isSensitiveQueryKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_QUERY_KEYS.has(lower) || lower.includes("token");
}

function hashLooksLikeAuth(hash: string): boolean {
  if (!hash || hash === "#") return false;
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  return (
    params.has("access_token") ||
    params.has("refresh_token") ||
    params.get("type") === "recovery" ||
    params.has("error_description")
  );
}

/** Verwijdert recovery/auth tokens uit URLs vóór PostHog telemetry. */
export function sanitizeCurrentUrl(raw: string): string {
  if (!raw) return raw;

  try {
    const url = new URL(raw);
    for (const key of [...url.searchParams.keys()]) {
      if (isSensitiveQueryKey(key)) {
        url.searchParams.set(key, "[redacted]");
      }
    }
    if (hashLooksLikeAuth(url.hash)) {
      url.hash = "#[redacted]";
    }
    return url.toString();
  } catch {
    if (/access_token|refresh_token|type=recovery/i.test(raw)) {
      return "[redacted-url]";
    }
    return raw;
  }
}
