import type { Locale } from "@/lib/i18n/types";
import {
  WELCOME_MICRO_STEP_TITLES,
  WELCOME_TASK_TITLE,
} from "@/lib/onboardingWelcomeTask";

import type { V2Energy } from "./V2Context";
import {
  emptyDraft,
  findV2TaskByTitle,
  loadV2Tasks,
  saveV2Tasks,
  v2Id,
  type V2MicroStep,
  type V2TaskEnergy,
} from "./v2Tasks";
import { v2MaxSlotsForEnergy, v2StructuroThingPicks } from "./v2Things";

const WELCOME_TASK_TITLE_EN =
  "Cancel a subscription you've been paying for too long";

const WELCOME_MICRO_STEP_TITLES_EN = [
  "Pick which subscription to cancel",
  "Find how to cancel (site, email or phone)",
  "Complete the cancellation",
  "Wait for confirmation",
] as const;

export type WelcomeTaskContent = {
  title: string;
  microSteps: readonly string[];
};

/** Voorbeeldkaarten op own-task stap (variant B). */
export type OwnTaskExample = {
  id: "cancel" | "mail" | "doctor";
  title: string;
  hint: string;
  microSteps: readonly string[];
};

export function getWelcomeTaskContent(
  locale?: Locale | string | null,
): WelcomeTaskContent {
  if (locale === "en") {
    return {
      title: WELCOME_TASK_TITLE_EN,
      microSteps: WELCOME_MICRO_STEP_TITLES_EN,
    };
  }
  return {
    title: WELCOME_TASK_TITLE,
    microSteps: WELCOME_MICRO_STEP_TITLES,
  };
}

export function getOwnTaskExamples(
  locale?: Locale | string | null,
): OwnTaskExample[] {
  if (locale === "en") {
    return [
      {
        id: "cancel",
        title: "Cancel a subscription",
        hint: "Often left hanging",
        microSteps: [
          "Find the email for your subscription",
          "Open the cancel page",
          "Confirm the cancellation",
          "Save a screenshot of the confirmation",
        ],
      },
      {
        id: "mail",
        title: "Reply to that one email",
        hint: "Takes 4 minutes, not 4 days",
        microSteps: [
          "Open the email",
          "Read it once",
          "Type three sentences",
          "Send without rereading",
        ],
      },
      {
        id: "doctor",
        title: "Book a GP appointment",
        hint: "Calling is the hurdle",
        microSteps: [
          "Look up the number",
          "Write down what you want to say",
          "Call between 8 and 10",
          "Note the appointment in your calendar",
        ],
      },
    ];
  }
  return [
    {
      id: "cancel",
      title: "Abonnement opzeggen",
      hint: "Blijft vaak liggen",
      microSteps: [
        "Zoek de mail van je abonnement",
        "Open de opzegpagina",
        "Bevestig de opzegging",
        "Bewaar een screenshot van de bevestiging",
      ],
    },
    {
      id: "mail",
      title: "Die ene mail beantwoorden",
      hint: "Kost 4 minuten, geen 4 dagen",
      microSteps: [
        "Open de mail",
        "Lees hem één keer",
        "Typ drie zinnen",
        "Verstuur zonder herlezen",
      ],
    },
    {
      id: "doctor",
      title: "Afspraak bij de huisarts",
      hint: "Bellen is de hobbel",
      microSteps: [
        "Zoek het nummer op",
        "Schrijf op wat je wil zeggen",
        "Bel tussen 8 en 10",
        "Zet de afspraak in je agenda",
      ],
    },
  ];
}

export function isWelcomeTaskTitle(
  title: string,
  locale?: Locale | string | null,
): boolean {
  const needle = title.trim().toLowerCase();
  if (!needle) return false;
  const content = getWelcomeTaskContent(locale);
  const shortNl = "abonnement opzeggen";
  const shortEn = "cancel a subscription";
  return (
    needle === content.title.toLowerCase() ||
    needle === WELCOME_TASK_TITLE.toLowerCase() ||
    needle === WELCOME_TASK_TITLE_EN.toLowerCase() ||
    needle === shortNl ||
    needle === shortEn
  );
}

/** Map journey-energie naar taak/AI energyLevel. */
export function v2EnergyToTaskEnergy(
  energy: V2Energy | null,
): V2TaskEnergy {
  if (energy === "high") return "high";
  if (energy === "enough") return "medium";
  if (energy === "low") return "low";
  return "low";
}

export function v2EnergyToAiLevel(
  energy: V2Energy | null,
): "low" | "medium" | "high" {
  const mapped = v2EnergyToTaskEnergy(energy);
  return mapped ?? "low";
}

/**
 * Eigen taak eerst; daarna bank-companions tot energy-slots vol zijn.
 * low=1, enough=2, high=3.
 */
export function buildOnboardingThingsWithCompanions(
  userTitle: string,
  energy: V2Energy | null,
  locale?: Locale | string | null,
): string[] {
  const primary = userTitle.trim();
  if (!primary) return [];

  const maxSlots = v2MaxSlotsForEnergy(energy);
  const companionCount = Math.max(0, maxSlots - 1);
  if (companionCount === 0) return [primary];

  const exclude = new Set<string>([
    primary.toLowerCase(),
    WELCOME_TASK_TITLE.toLowerCase(),
    WELCOME_TASK_TITLE_EN.toLowerCase(),
  ]);

  const pool = v2StructuroThingPicks(
    energy,
    Math.max(maxSlots + 4, companionCount + 4),
    locale,
  );
  const companions = pool
    .filter((title) => !exclude.has(title.trim().toLowerCase()))
    .slice(0, companionCount);

  return [primary, ...companions];
}

export function microTitlesToSteps(titles: string[]): V2MicroStep[] {
  return titles
    .map((title) => title.trim())
    .filter(Boolean)
    .map((title) => ({
      id: v2Id("ms"),
      title,
      done: false,
    }));
}

/** Sla eigen/welkomst-taak op in v2_tasks met optionele microstappen. */
export function persistOnboardingOwnTask(opts: {
  title: string;
  microStepTitles: string[];
  energy: V2Energy | null;
}): string {
  const title = opts.title.trim();
  if (!title) return "";

  const tasks = loadV2Tasks();
  const micros = microTitlesToSteps(opts.microStepTitles);
  const taskEnergy = v2EnergyToTaskEnergy(opts.energy);
  const existing = findV2TaskByTitle(tasks, title);

  if (existing) {
    const next = tasks.map((t) =>
      t.id === existing.id
        ? {
            ...t,
            energy: taskEnergy,
            microSteps: micros.length > 0 ? micros : t.microSteps,
            done: false,
            completedDate: null,
            completedAt: null,
            snoozeUntil: null,
          }
        : t,
    );
    saveV2Tasks(next);
    return existing.id;
  }

  const draft = emptyDraft();
  draft.title = title;
  draft.energy = taskEnergy;
  draft.microSteps = micros;
  saveV2Tasks([...tasks, draft]);
  return draft.id;
}
