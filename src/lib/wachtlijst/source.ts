/**
 * Tracking voor wachtlijst-aanmelding (?source= in URL naar /inschrijven of /wachtlijst).
 */
export function sanitizeWaitlistSourceParam(raw: string | undefined | null): string {
  const t = (raw ?? "").trim().slice(0, 64);
  if (!t) return "landing_form";
  const cleaned = t.replace(/[^a-zA-Z0-9_-]/g, "");
  return cleaned || "landing_form";
}
