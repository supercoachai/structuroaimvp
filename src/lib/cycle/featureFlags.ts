/**
 * Feature flag voor de fase 2 cyclus-suggestiekaart in Dagstart.
 * Default uit. Aan zetten via .env.local: NEXT_PUBLIC_STRUCTURO_CYCLE_SUGGESTIONS=1
 */
export function cycleSuggestionsEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_STRUCTURO_CYCLE_SUGGESTIONS;
  return raw === "1" || raw === "true";
}
