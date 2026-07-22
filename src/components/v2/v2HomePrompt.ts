"use client";

import { dismissDay1SkipHook, shouldShowDay1SkipHook, DAY1_SKIP_HOOK_LINE } from "./v2Day1Hook";
import {
  dismissV2MorningEveningReminder,
  getV2MorningEveningReminder,
  type V2MorningEveningReminder,
} from "./v2MorningReminder";
import {
  dismissShutdownNudge,
  shouldShowShutdownNudge,
  SHUTDOWN_NUDGE_LINE,
} from "./v2ShutdownNudge";
import { isV2MutedToday, patchV2Settings, readV2Settings } from "./v2Settings";
import { todayYmd } from "./v2Tasks";
import {
  dismissV2WhySuggestion,
  getV2WhySuggestion,
  shouldShowWhySuggestionAfterIdleOpens,
  type V2WhySuggestion,
} from "./v2WhySuggestion";
import {
  muteV2ReturnReminderToday,
  shouldShowReturnWidgetHint,
} from "./v2ReturnReminder";
import {
  dismissV2OpenTaskReminderToday,
  markV2OpenTaskReminderShown,
  OPEN_TASK_REMINDER_LINE,
  shouldShowV2OpenTaskReminder,
} from "./v2OpenTaskReminder";
import {
  dismissV2QuoteToday,
  getV2QuoteForToday,
  markV2QuoteShown,
  shouldShowV2QuoteOnHome,
} from "./v2Quotes";
import {
  CYCLE_OPTIN_PROMPT_LINE,
  dismissCycleOptInPrompt,
  shouldShowCycleOptInPrompt,
} from "./v2CycleOptInPrompt";
import { v2HasThings, v2NormalizeThings } from "./v2Things";
import type { V2State } from "./V2Context";

export type V2HomePromptKind =
  | "morning_reminder"
  | "day1_skip_hook"
  | "widget_hint"
  | "open_task_reminder"
  | "shutdown_nudge"
  | "cycle_optin"
  | "why_suggestion"
  | "why_anchor"
  | "quote";

export type V2HomePrompt =
  | {
      kind: "morning_reminder";
      reminder: V2MorningEveningReminder;
    }
  | { kind: "day1_skip_hook"; line: string }
  | { kind: "widget_hint"; line: string }
  | { kind: "open_task_reminder"; line: string }
  | { kind: "shutdown_nudge"; line: string }
  | { kind: "cycle_optin"; line: string }
  | { kind: "why_suggestion"; suggestion: V2WhySuggestion }
  | { kind: "why_anchor"; why: string; whyOutcome: string }
  | { kind: "quote"; line: string };

const PRIORITY: V2HomePromptKind[] = [
  "morning_reminder",
  "day1_skip_hook",
  "widget_hint",
  "open_task_reminder",
  "shutdown_nudge",
  "cycle_optin",
  "why_suggestion",
  "why_anchor",
  "quote",
];

export function resolveV2HomePrompt(state: V2State, now = new Date()): V2HomePrompt | null {
  if (typeof window === "undefined") return null;

  const candidates = new Map<V2HomePromptKind, V2HomePrompt>();
  const things = v2NormalizeThings(state.things);
  const hasThings = v2HasThings(things);
  const muted = isV2MutedToday();
  const evening = now.getHours() >= 20;

  // Avond: shutdown-nudge wint van andere soft-prompts (één ding in viewport).
  const priority = evening
    ? ([
        "shutdown_nudge",
        "morning_reminder",
        "day1_skip_hook",
        "widget_hint",
        "open_task_reminder",
        "cycle_optin",
        "why_suggestion",
        "why_anchor",
        "quote",
      ] as const)
    : PRIORITY;

  const morningReminder = getV2MorningEveningReminder(now);
  if (morningReminder) {
    candidates.set("morning_reminder", { kind: "morning_reminder", reminder: morningReminder });
  }

  if (shouldShowDay1SkipHook(state, now)) {
    candidates.set("day1_skip_hook", { kind: "day1_skip_hook", line: DAY1_SKIP_HOOK_LINE });
  }

  if (shouldShowReturnWidgetHint(now)) {
    candidates.set("widget_hint", {
      kind: "widget_hint",
      line: "Als je wilt: je dagstart staat klaar. Geen haast.",
    });
  }

  if (shouldShowV2OpenTaskReminder(state, now)) {
    candidates.set("open_task_reminder", {
      kind: "open_task_reminder",
      line: OPEN_TASK_REMINDER_LINE,
    });
  }

  if (shouldShowShutdownNudge(state, now)) {
    candidates.set("shutdown_nudge", { kind: "shutdown_nudge", line: SHUTDOWN_NUDGE_LINE });
  }

  if (!muted && shouldShowCycleOptInPrompt(state)) {
    candidates.set("cycle_optin", {
      kind: "cycle_optin",
      line: CYCLE_OPTIN_PROMPT_LINE,
    });
  }

  // Soft why-nudge: pas na 2 idle opens, onderin (zelfde slot als avondwolkje).
  if (
    !muted &&
    !hasThings &&
    !state.todayDone &&
    shouldShowWhySuggestionAfterIdleOpens(state, now)
  ) {
    const suggestion = getV2WhySuggestion(state);
    if (suggestion) {
      candidates.set("why_suggestion", { kind: "why_suggestion", suggestion });
    }
  }

  if (
    !muted &&
    state.energy === "low" &&
    state.why.trim().length > 0 &&
    readV2Settings().whyAnchorDismissedOn !== todayYmd(now)
  ) {
    candidates.set("why_anchor", {
      kind: "why_anchor",
      why: state.why.trim(),
      whyOutcome: state.whyOutcome.trim(),
    });
  }

  if (shouldShowV2QuoteOnHome(now)) {
    candidates.set("quote", { kind: "quote", line: getV2QuoteForToday(now) });
  }

  for (const kind of priority) {
    const prompt = candidates.get(kind);
    if (prompt) return prompt;
  }

  return null;
}

export function dismissV2HomePrompt(prompt: V2HomePrompt): void {
  switch (prompt.kind) {
    case "morning_reminder":
      dismissV2MorningEveningReminder(prompt.reminder.itemId);
      break;
    case "day1_skip_hook":
      dismissDay1SkipHook();
      break;
    case "widget_hint":
      muteV2ReturnReminderToday();
      break;
    case "open_task_reminder":
      dismissV2OpenTaskReminderToday();
      break;
    case "shutdown_nudge":
      dismissShutdownNudge();
      break;
    case "cycle_optin":
      dismissCycleOptInPrompt();
      break;
    case "why_suggestion":
      dismissV2WhySuggestion(prompt.suggestion.id);
      break;
    case "why_anchor":
      patchV2Settings({ whyAnchorDismissedOn: todayYmd() });
      break;
    case "quote":
      dismissV2QuoteToday();
      break;
    default:
      break;
  }
}
