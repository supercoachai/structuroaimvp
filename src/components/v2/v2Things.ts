import {
  V2_ENERGY_OPTIONS,
  V2_SUGGESTIONS,
  type V2Energy,
  type V2Suggestion,
} from "./V2Context";

/** Aantal dingen dat bij het energieniveau hoort (v2: laag=1, genoeg=2, hoog=3). */
export function v2MaxSlotsForEnergy(energy: V2Energy | null): number {
  if (energy === "high") return 3;
  if (energy === "enough") return 2;
  return 1;
}

/** Welke taak-energieën je mag zien bij je dagsenergie (zoals v1: zacht tot max-niveau). */
export function v2AllowedSuggestionEnergies(energy: V2Energy): V2Energy[] {
  if (energy === "high") return ["high", "enough", "low"];
  if (energy === "enough") return ["enough", "low"];
  return ["low"];
}

/** Suggesties voor de keuzelijst, met moeilijker eerst (past bij dagsenergie). */
export function v2SuggestionsForDayEnergy(energy: V2Energy | null): V2Suggestion[] {
  const day = energy ?? "enough";
  return v2AllowedSuggestionEnergies(day).flatMap((e) => V2_SUGGESTIONS[e]);
}

/** Structuro-voorselectie: alleen uit de bak die bij je dagsenergie past. */
export function v2StructuroThingPicks(energy: V2Energy | null, maxSlots: number): string[] {
  const day = energy ?? "enough";
  return V2_SUGGESTIONS[day].map((s) => s.title).slice(0, maxSlots);
}

export function v2SuggestionEnergyLabel(energy: V2Energy): string {
  return V2_ENERGY_OPTIONS.find((o) => o.value === energy)?.label ?? "Genoeg";
}

export function v2NormalizeThings(things: string[] | undefined | null): string[] {
  if (!Array.isArray(things)) return [];
  return things
    .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
    .map((t) => t.trim());
}

export function v2HasThings(things: string[]): boolean {
  return v2NormalizeThings(things).length > 0;
}

export function v2PrimaryThing(things: string[]): string | null {
  const normalized = v2NormalizeThings(things);
  return normalized[0] ?? null;
}

export function v2ThingTitle(maxSlots: number): string {
  if (maxSlots === 1) return "Kies één ding.";
  if (maxSlots === 2) return "Kies tot twee dingen.";
  return "Kies tot drie dingen.";
}

export function v2ThingCounter(selectedCount: number, maxSlots: number): string | null {
  if (maxSlots <= 1) return null;
  if (selectedCount === 0) return `Je mag er ${maxSlots} kiezen.`;
  if (selectedCount >= maxSlots) return `${selectedCount} van ${maxSlots} gekozen.`;
  const left = maxSlots - selectedCount;
  return `${selectedCount} van ${maxSlots}. Nog ${left} ${left === 1 ? "plek" : "plekken"}.`;
}
