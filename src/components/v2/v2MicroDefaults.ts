import { matchMicroStepTemplate } from "@/lib/ai/microStepTemplates";
import type { Locale } from "@/lib/i18n/types";

import {
  v2BankMicroDefaultsForTitle,
  v2GenericMicroDefaults,
  v2NormalizeLocale,
} from "./v2ThingBank";
import {
  emptyDraft,
  findV2TaskByTitle,
  loadV2Tasks,
  saveV2Tasks,
  v2Id,
  type V2MicroStep,
  type V2Task,
} from "./v2Tasks";

export function v2DefaultMicroTitlesForThing(
  title: string,
  locale?: string | null,
): string[] {
  const lang = v2NormalizeLocale(locale);
  const key = title.trim();
  if (!key) return v2GenericMicroDefaults(lang);

  const fromBank = v2BankMicroDefaultsForTitle(key, lang);
  if (fromBank?.length) return fromBank;

  const template = matchMicroStepTemplate(key, lang);
  if (template?.steps?.length) return template.steps.slice(0, 4);

  return v2GenericMicroDefaults(lang);
}

function toMicroSteps(titles: string[]): V2MicroStep[] {
  return titles.map((stepTitle) => ({
    id: v2Id("ms"),
    title: stepTitle,
    done: false,
  }));
}

/**
 * Zorgt dat vandaag-dingen als taken bestaan mét soft microstappen
 * (alleen bij nieuwe taak of lege microSteps).
 */
export function ensureV2ThingsHaveTasks(
  things: string[],
  locale?: Locale | string | null,
): V2Task[] {
  const lang = v2NormalizeLocale(locale);
  const titles = things.map((t) => t.trim()).filter(Boolean);
  if (titles.length === 0) return loadV2Tasks();

  let tasks = loadV2Tasks();
  let changed = false;

  for (const title of titles) {
    const existing = findV2TaskByTitle(tasks, title);
    if (!existing) {
      const seed = emptyDraft();
      seed.title = title;
      seed.microSteps = toMicroSteps(v2DefaultMicroTitlesForThing(title, lang));
      tasks = [...tasks, seed];
      changed = true;
      continue;
    }
    if (existing.microSteps.length === 0) {
      tasks = tasks.map((t) =>
        t.id === existing.id
          ? {
              ...t,
              microSteps: toMicroSteps(v2DefaultMicroTitlesForThing(title, lang)),
            }
          : t,
      );
      changed = true;
    }
  }

  if (changed) saveV2Tasks(tasks);
  return tasks;
}
