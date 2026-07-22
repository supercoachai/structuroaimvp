"use client";

import { isV2MutedToday, patchV2Settings, readV2Settings } from "./v2Settings";
import { loadV2Tasks, todayYmd, type V2Task } from "./v2Tasks";
import type { V2State } from "./V2Context";

export type V2WhySuggestion = {
  id: string;
  source: "task" | "journey";
  title: string;
  why: string;
  outcome: string | null;
  invitation: string;
};

/** Pas tonen na zoveel app-opens zonder dagstart/taak. */
export const WHY_SUGGESTION_IDLE_OPENS_REQUIRED = 2;

const SESSION_COUNTED_KEY = "v2_why_idle_open_counted";

function hasChosenThings(state: V2State): boolean {
  return state.things.some((t) => typeof t === "string" && t.trim().length > 0);
}

function pickOldestTaskWithWhy(tasks: V2Task[]): V2Task | null {
  const withWhy = tasks.filter((t) => !t.done && t.why && t.why.trim().length > 0);
  if (withWhy.length === 0) return null;
  return [...withWhy].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
}

function buildInvitation(title: string, why: string): string {
  const snippet =
    why.length > 60 ? `${why.slice(0, 59).trimEnd()}…` : why.trim();
  return `Je schreef bij "${title}" waarom dit telt: "${snippet}". Hoe zou het zijn als we die samen doen, om in ieder geval te beginnen?`;
}

/** Nog geen dagstart: kandidatie voor soft why-nudge. */
export function isIdleForWhySuggestion(state: V2State): boolean {
  if (state.todayDone) return false;
  if (hasChosenThings(state)) return false;
  return true;
}

function readIdleOpenCount(now = new Date()): number {
  const settings = readV2Settings();
  const today = todayYmd(now);
  if (settings.whySuggestionIdleOpensOn !== today) return 0;
  return settings.whySuggestionIdleOpenCount;
}

export function resetWhySuggestionIdleOpens(): void {
  patchV2Settings({
    whySuggestionIdleOpensOn: null,
    whySuggestionIdleOpenCount: 0,
  });
}

/**
 * Tel één idle app-open per browsersessie.
 * Reset als er wél dagstart/taak was. Geeft de actuele teller terug.
 */
export function recordWhySuggestionIdleOpen(state: V2State, now = new Date()): number {
  if (typeof window === "undefined") return 0;

  if (!isIdleForWhySuggestion(state)) {
    if (readV2Settings().whySuggestionIdleOpenCount > 0) {
      resetWhySuggestionIdleOpens();
    }
    return 0;
  }

  const today = todayYmd(now);
  let sessionAlreadyCounted = false;
  try {
    sessionAlreadyCounted = window.sessionStorage.getItem(SESSION_COUNTED_KEY) === today;
  } catch {
    // negeren
  }

  if (sessionAlreadyCounted) {
    return readIdleOpenCount(now);
  }

  try {
    window.sessionStorage.setItem(SESSION_COUNTED_KEY, today);
  } catch {
    // negeren
  }

  const settings = readV2Settings();
  const count =
    settings.whySuggestionIdleOpensOn === today
      ? settings.whySuggestionIdleOpenCount + 1
      : 1;

  patchV2Settings({
    whySuggestionIdleOpensOn: today,
    whySuggestionIdleOpenCount: count,
  });

  return count;
}

/** Soft nudge pas na genoeg idle opens vandaag. */
export function shouldShowWhySuggestionAfterIdleOpens(
  state: V2State,
  now = new Date(),
): boolean {
  if (!isIdleForWhySuggestion(state)) return false;
  return readIdleOpenCount(now) >= WHY_SUGGESTION_IDLE_OPENS_REQUIRED;
}

/** Eén zachte why-gevoede suggestie; null als gedismissed, gemute of geen bron. */
export function getV2WhySuggestion(state: V2State): V2WhySuggestion | null {
  if (typeof window === "undefined") return null;
  if (isV2MutedToday()) return null;

  const settings = readV2Settings();
  const task = pickOldestTaskWithWhy(loadV2Tasks());

  if (task?.why) {
    if (settings.whySuggestionDismissedId === `task:${task.id}`) return null;
    return {
      id: `task:${task.id}`,
      source: "task",
      title: task.title,
      why: task.why,
      outcome: task.outcome,
      invitation: buildInvitation(task.title, task.why),
    };
  }

  const journeyWhy = state.why.trim();
  if (journeyWhy.length > 0) {
    if (settings.whySuggestionDismissedId === "journey") return null;
    return {
      id: "journey",
      source: "journey",
      // Geen concrete open taak: CTA opent dagstart i.p.v. nep-ding "je dag".
      title: "Naar dagstart",
      why: journeyWhy,
      outcome: state.whyOutcome.trim() || null,
      invitation: `Je deed dit voor: "${journeyWhy}". Hoe zou het zijn als we samen die eerste taak doen, om in ieder geval te beginnen?`,
    };
  }

  return null;
}

export function dismissV2WhySuggestion(id: string): void {
  patchV2Settings({ whySuggestionDismissedId: id });
}

export function acceptV2WhySuggestion(suggestion: V2WhySuggestion): string {
  if (suggestion.source === "task") {
    return suggestion.title;
  }
  return suggestion.title.length > 0 ? suggestion.title : "Eén klein ding";
}
