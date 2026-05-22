const PII_KEY_PATTERN =
  /(user_?id|userid|email|token|authorization|cookie|password|secret|session|stripe|supabase|customer|distinct_?id|phone|name|jwt|bearer|api_?key)/i;

const STRIP_VALUE_PATTERN =
  /(eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|sk_(live|test)_[A-Za-z0-9]+|Bearer\s+\S+)/;

function sanitizeScalar(value: unknown): unknown {
  if (typeof value === "string") {
    if (STRIP_VALUE_PATTERN.test(value)) return "[redacted]";
    if (value.length > 500) return `${value.slice(0, 500)}…`;
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map(sanitizeScalar);
  }
  if (value && typeof value === "object") {
    return sanitizeExceptionContext(value as Record<string, unknown>);
  }
  return value;
}

/** Verwijdert PII uit exception properties (GDPR: legitimate interest, geen consent). */
export function sanitizeExceptionContext(
  input?: Record<string, unknown> | null
): Record<string, unknown> {
  if (!input) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (PII_KEY_PATTERN.test(key)) continue;
    out[key] = sanitizeScalar(value);
  }
  return out;
}
