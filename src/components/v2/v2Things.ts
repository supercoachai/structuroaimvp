import {
  V2_ENERGY_OPTIONS,
  V2_SUGGESTIONS,
  type V2Energy,
  type V2Suggestion,
} from "./V2Context";
import { v2IsAnxietyTitle } from "./v2Anxiety";
import { loadV2Tasks, todayYmd, type V2Task, type V2TaskEnergy } from "./v2Tasks";

export { v2IsAnxietyTitle } from "./v2Anxiety";

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

/** Suggesties voor zelf-swipen (breder). Niet gebruiken na "Structuro kiest". */
export function v2SuggestionsForDayEnergy(energy: V2Energy | null): V2Suggestion[] {
  const day = energy ?? "enough";
  return v2AllowedSuggestionEnergies(day).flatMap((e) => V2_SUGGESTIONS[e]);
}

/**
 * Opties voor V2AdjustStep: geselecteerd + open taken (incl. anxiety) + energie-suggesties.
 * Anxiety blijft kiesbaar; UI soft-labelt met "Mag later".
 */
export function v2BuildAdjustOptions(
  energy: V2Energy | null,
  selectedThings: string[],
  max = 8,
): string[] {
  const today = todayYmd();
  const openTitles = loadV2Tasks()
    .filter((t) => isTaskVisibleForPick(t, today))
    .map((t) => t.title.trim())
    .filter(Boolean);
  const suggestions = v2SuggestionsForDayEnergy(energy).map((s) => s.title);
  const merged = [...selectedThings, ...openTitles, ...suggestions];
  const seen = new Set<string>();
  return merged
    .filter((x) => {
      const k = x.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, max);
}

function dayEnergyMatchesTask(day: V2Energy, taskEnergy: V2TaskEnergy): boolean {
  if (!taskEnergy) return true;
  if (taskEnergy === "medium") return day === "enough" || day === "high";
  if (taskEnergy === "high") return day === "high";
  return true; // low past altijd
}

function isTaskVisibleForPick(task: V2Task, today: string): boolean {
  if (task.done) return false;
  if (!task.title.trim()) return false;
  if (task.snoozeUntil === "rest") return false;
  if (typeof task.snoozeUntil === "string" && task.snoozeUntil > today) return false;
  return true;
}

/**
 * Structuro kiest: maxSlots items, niet de hele bak.
 * Volgorde: open taken met deadline eerst (dichtste eerst), passend bij energie,
 * daarna vaste suggesties uit dezelfde energie-bak.
 * Anxiety-titels (Belasting etc.) worden overgeslagen in de default-picks.
 */
export function v2StructuroThingPicks(energy: V2Energy | null, maxSlots: number): string[] {
  const day = energy ?? "enough";
  const slots = Math.max(1, Math.min(3, maxSlots));
  const today = todayYmd();
  const picks: string[] = [];
  const seen = new Set<string>();

  const push = (title: string) => {
    const t = title.trim();
    if (!t || seen.has(t.toLowerCase()) || picks.length >= slots) return;
    if (v2IsAnxietyTitle(t)) return;
    seen.add(t.toLowerCase());
    picks.push(t);
  };

  const openTasks = loadV2Tasks()
    .filter((t) => isTaskVisibleForPick(t, today))
    .filter((t) => dayEnergyMatchesTask(day, t.energy))
    .sort((a, b) => {
      // Deadline eerst (nulls achteraan), daarna prioriteit (1 = hoog), daarna created.
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      const pa = a.priority ?? 99;
      const pb = b.priority ?? 99;
      if (pa !== pb) return pa - pb;
      return a.createdAt.localeCompare(b.createdAt);
    });

  for (const task of openTasks) push(task.title);

  for (const s of V2_SUGGESTIONS[day]) push(s.title);

  return picks.slice(0, slots);
}

/** Titel na Structuro-voorstel (geen "kies tot n" keuze-druk). */
export function v2StructuroPicksTitle(count: number): string {
  if (count <= 1) return "Dit past bij vandaag.";
  if (count === 2) return "Deze twee passen bij vandaag.";
  return "Deze drie passen bij vandaag.";
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
