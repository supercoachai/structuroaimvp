"use client";

import { isV2MutedToday, patchV2Settings, readV2Settings } from "./v2Settings";
import { loadV2Tasks, type V2Task } from "./v2Tasks";
import type { V2State } from "./V2Context";

export type V2WhySuggestion = {
  id: string;
  source: "task" | "journey";
  title: string;
  why: string;
  outcome: string | null;
  invitation: string;
};

function pickOldestTaskWithWhy(tasks: V2Task[]): V2Task | null {
  const withWhy = tasks.filter((t) => !t.done && t.why && t.why.trim().length > 0);
  if (withWhy.length === 0) return null;
  return [...withWhy].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
}

function buildInvitation(title: string, why: string): string {
  const snippet =
    why.length > 60 ? `${why.slice(0, 59).trimEnd()}…` : why.trim();
  return `Je schreef bij "${title}" waarom dit telt: "${snippet}". Wil je die vandaag? Of kies zelf.`;
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
    const title = state.things[0] ?? "je dag";
    return {
      id: "journey",
      source: "journey",
      title,
      why: journeyWhy,
      outcome: state.whyOutcome.trim() || null,
      invitation: `Je deed dit voor: "${journeyWhy}". Eén zachte suggestie. Of kies zelf.`,
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
