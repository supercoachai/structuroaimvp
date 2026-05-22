/**
 * Kill-switch voor de cyclus-suggestiekaart in Dagstart (taakkieze-stap).
 * Standaard aan voor iedereen met cyclus-consent. Uit: NEXT_PUBLIC_STRUCTURO_CYCLE_SUGGESTIONS=0, false, off of no
 */
export function cycleSuggestionsEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_STRUCTURO_CYCLE_SUGGESTIONS?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "off" || raw === "no") {
    return false;
  }
  return true;
}
