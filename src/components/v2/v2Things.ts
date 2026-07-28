import type { Locale } from "@/lib/i18n/types";

import {
  V2_ENERGY_OPTIONS,
  type V2Energy,
  type V2Suggestion,
} from "./V2Context";
import { v2IsAnxietyTitle } from "./v2Anxiety";
import { v2TaskEnergyToDay } from "./v2EnergyMeta";
import {
  v2Day1StarterSuggestions,
  v2FindThingBankItemByTitle,
  v2LocalizedSuggestions,
  v2NormalizeLocale,
  v2SeededShuffle,
} from "./v2ThingBank";
import {
  findV2TaskByTitle,
  loadV2Tasks,
  todayYmd,
  type V2Task,
  type V2TaskEnergy,
} from "./v2Tasks";

export { v2IsAnxietyTitle } from "./v2Anxiety";

/** Voorstel-regel met energie (batterij in propose). */
export type V2ThingProposal = {
  title: string;
  energy: V2Energy | null;
};

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

function suggestionSeed(
  energy: V2Energy,
  locale?: Locale | string | null,
  day = todayYmd(),
): string {
  return `${day}|${energy}|${v2NormalizeLocale(locale)}`;
}

/** Suggesties voor zelf-swipen (breder). Niet gebruiken na "Structuro kiest". */
export function v2SuggestionsForDayEnergy(
  energy: V2Energy | null,
  locale?: Locale | string | null,
): V2Suggestion[] {
  const day = energy ?? "enough";
  const lang = v2NormalizeLocale(locale);
  const seed = suggestionSeed(day, lang);
  return v2AllowedSuggestionEnergies(day).flatMap((e) =>
    v2LocalizedSuggestions(e, lang, `${seed}|pool-${e}`),
  );
}

/**
 * Opties voor V2AdjustStep: geselecteerd + open taken (incl. anxiety) + energie-suggesties.
 * Anxiety blijft kiesbaar; UI soft-labelt met "Mag later".
 */
export function v2BuildAdjustOptions(
  energy: V2Energy | null,
  selectedThings: string[],
  max = 8,
  locale?: Locale | string | null,
): string[] {
  const today = todayYmd();
  const openTitles = loadV2Tasks()
    .filter((t) => isTaskVisibleForPick(t, today))
    .map((t) => t.title.trim())
    .filter(Boolean);
  const suggestions = v2SuggestionsForDayEnergy(energy, locale).map(
    (s) => s.title,
  );
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
 * Zoek energie voor een titel: open taak eerst, daarna thing-bank.
 * Gebruikt voor batterij in propose/home.
 */
export function v2LookupThingEnergy(title: string): V2Energy | null {
  const task = findV2TaskByTitle(loadV2Tasks(), title);
  const fromTask = v2TaskEnergyToDay(task?.energy ?? null);
  if (fromTask) return fromTask;
  const bank = v2FindThingBankItemByTitle(title);
  return bank?.energy ?? null;
}

/** Verrijk titel-lijst met energie voor UI (batterij). */
export function v2EnrichThingProposals(titles: string[]): V2ThingProposal[] {
  return titles
    .map((title) => title.trim())
    .filter(Boolean)
    .map((title) => ({
      title,
      energy: v2LookupThingEnergy(title),
    }));
}

export function v2ThingProposalTitles(proposals: V2ThingProposal[]): string[] {
  return proposals.map((p) => p.title);
}

/**
 * Structuro kiest: maxSlots items, niet de hele bak.
 * Volgorde: open taken met deadline eerst (dichtste eerst), passend bij energie,
 * daarna vaste suggesties uit dezelfde energie-bak (locale).
 * Anxiety-titels (Belasting etc.) worden overgeslagen in de default-picks.
 */
export function v2StructuroThingPicks(
  energy: V2Energy | null,
  maxSlots: number,
  locale?: Locale | string | null,
): string[] {
  return v2ThingProposalTitles(
    v2StructuroThingProposals(energy, maxSlots, locale),
  );
}

/** Zelfde als v2StructuroThingPicks, maar met energie per voorstel. */
export function v2StructuroThingProposals(
  energy: V2Energy | null,
  maxSlots: number,
  locale?: Locale | string | null,
): V2ThingProposal[] {
  const day = energy ?? "enough";
  const lang = v2NormalizeLocale(locale);
  const slots = Math.max(1, Math.min(3, maxSlots));
  const today = todayYmd();
  const picks: V2ThingProposal[] = [];
  const seen = new Set<string>();

  const push = (title: string, itemEnergy: V2Energy | null) => {
    const t = title.trim();
    if (!t || seen.has(t.toLowerCase()) || picks.length >= slots) return;
    if (v2IsAnxietyTitle(t)) return;
    seen.add(t.toLowerCase());
    picks.push({ title: t, energy: itemEnergy });
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

  for (const task of openTasks) {
    push(task.title, v2TaskEnergyToDay(task.energy));
  }

  // Eerste dag / lege lijst: ultra-kleine starters vóór de volle bank.
  if (openTasks.length === 0) {
    const starters = v2Day1StarterSuggestions(
      day,
      lang,
      suggestionSeed(day, lang),
    );
    for (const s of starters) push(s.title, s.energy);
  }

  const bankPool = v2SeededShuffle(
    v2LocalizedSuggestions(day, lang),
    suggestionSeed(day, lang),
  );
  for (const s of bankPool) push(s.title, s.energy);

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
