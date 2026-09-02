/**
 * Alleen anonieme taak-referenties naar analytics: UUID of interne id.
 * Geen spaties (taaktitels), geen vrije tekst.
 */
const ANALYTICS_TASK_ID_RE = /^[a-zA-Z0-9_-]{8,64}$/;

export function sanitizeAnalyticsTaskId(
  raw: string | null | undefined
): string {
  const t = (raw ?? "").trim();
  if (!t || /\s/.test(t)) return "";
  if (!ANALYTICS_TASK_ID_RE.test(t)) return "";
  return t;
}
