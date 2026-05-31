/**
 * Tracking voor signup-bron (?source= in URL, o.a. legacy /inschrijven en /wachtlijst).
 */
export function sanitizeWaitlistSourceParam(raw: string | undefined | null): string {
  const t = (raw ?? "").trim().slice(0, 64);
  if (!t) return "landing_form";
  const cleaned = t.replace(/[^a-zA-Z0-9_-]/g, "");
  return cleaned || "landing_form";
}
