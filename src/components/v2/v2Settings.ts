"use client";

import {
  CYCLE_LENGTH_DEFAULT,
  CYCLE_LENGTH_MAX,
  CYCLE_LENGTH_MIN,
  MENSTRUATION_DURATION_DEFAULT,
  clampCycleLength,
  clampMenstruationDuration,
} from "@/lib/cycle/types";

import { todayYmd } from "./v2Tasks";

export type V2Locale = "nl" | "en";

export type V2ReminderCadence = "none" | "morning" | "evening" | "both";

export type V2Settings = {
  locale: V2Locale;
  analyticsConsent: boolean;
  /** @deprecated Sync met reminderCadence; blijft voor backward compat. */
  notificationsEnabled: boolean;
  /** Opt-in herinneringscadans. Standaard uit. */
  reminderCadence: V2ReminderCadence;
  /** Zachte herinnering als focus gestart maar niet afgerond. Standaard uit. */
  openTaskReminderEnabled: boolean;
  /** Af en toe een rustige zin op home of in ochtendnotificatie. Standaard uit. */
  quoteEnabled: boolean;
  /** ISO-timestamp laatste browsernotificatie (24u cap). */
  lastNotificationAt: string | null;
  /** Datum (YMD) waarop quote op home getoond werd. */
  quoteShownOn: string | null;
  /** Datum (YMD) waarop quote vandaag weggeswiped werd. */
  quoteDismissedOn: string | null;
  /** Datum (YMD) waarop open-task prompt vandaag weggeswiped werd. */
  openTaskReminderDismissedOn: string | null;
  /** ISO-timestamp van laatste v2-bezoek (frisse-start detectie). */
  lastVisitAt: string | null;
  /** Eerste kalenderdag (YMD) waarop v2 geopend werd (day-2 return). */
  firstOpenYmd: string | null;
  /** Ochtendregel na avonddump: welk dump-item is weggeswiped. */
  morningEveningDumpDismissedItemId: string | null;
  /** Why-suggestie weggeswiped (task:id of journey). */
  whySuggestionDismissedId: string | null;
  /** Kalenderdag (YMD) van de idle-open teller voor why-suggestie. */
  whySuggestionIdleOpensOn: string | null;
  /** Aantal app-opens vandaag zonder dagstart/taak (voor soft why-nudge). */
  whySuggestionIdleOpenCount: number;
  /** Why-anker (zacht zetje) vandaag weggeklikt. */
  whyAnchorDismissedOn: string | null;
  /** A/B-variant terugkeer (bij eerste opt-in dagstart-herinnering). */
  returnVariant: "notification" | "widget_hint" | null;
  /** Onderdruk zachte prompts/notificaties voor vandaag. */
  muteTodayPaused: boolean;
  /** Datum (YMD) waarop muteTodayPaused is gezet; reset automatisch volgende dag. */
  muteTodayPausedOn: string | null;
  /** Day-1 skip-hook vandaag weggeswiped. */
  day1SkipHookDismissedOn: string | null;
  /** Shutdown-nudge vandaag weggeswiped. */
  shutdownNudgeDismissedOn: string | null;
  /** Return-permission prompt permanent weggeswiped. */
  returnPermissionPromptDismissed: boolean;
  /** Soft "Bewaar met Google" op home weggeklikt. */
  accountSavePromptDismissed: boolean;
  /**
   * Eerste waarde-moment (focus afgerond of shutdown voltooid).
   * Soft prompts zoals cyclus-opt-in en account-nudge wachten hierop.
   */
  firstValueAt: string | null;
  /** Cyclus home-prompt eenmalig weggeklikt of afgerond. */
  cycleOptInPromptDismissed: boolean;
  cycleLength: number;
  menstruationDuration: number;
  lastPeriodStart: string | null;
};

export const V2_SETTINGS_KEY = "v2_settings";

export const v2SettingsDefaults: V2Settings = {
  locale: "nl",
  analyticsConsent: false,
  notificationsEnabled: false,
  reminderCadence: "none",
  openTaskReminderEnabled: false,
  quoteEnabled: false,
  lastNotificationAt: null,
  quoteShownOn: null,
  quoteDismissedOn: null,
  openTaskReminderDismissedOn: null,
  lastVisitAt: null,
  firstOpenYmd: null,
  morningEveningDumpDismissedItemId: null,
  whySuggestionDismissedId: null,
  whySuggestionIdleOpensOn: null,
  whySuggestionIdleOpenCount: 0,
  whyAnchorDismissedOn: null,
  returnVariant: null,
  muteTodayPaused: false,
  muteTodayPausedOn: null,
  day1SkipHookDismissedOn: null,
  shutdownNudgeDismissedOn: null,
  returnPermissionPromptDismissed: false,
  accountSavePromptDismissed: false,
  firstValueAt: null,
  cycleOptInPromptDismissed: false,
  cycleLength: CYCLE_LENGTH_DEFAULT,
  menstruationDuration: MENSTRUATION_DURATION_DEFAULT,
  lastPeriodStart: null,
};

export function hydrateV2Settings(raw: string | null): V2Settings {
  if (!raw) return { ...v2SettingsDefaults };
  try {
    const parsed = JSON.parse(raw) as Partial<V2Settings>;
    const cycleLength = clampCycleLength(
      typeof parsed.cycleLength === "number"
        ? parsed.cycleLength
        : v2SettingsDefaults.cycleLength,
    );
    return {
      ...v2SettingsDefaults,
      ...parsed,
      locale: parsed.locale === "en" ? "en" : "nl",
      cycleLength,
      menstruationDuration: clampMenstruationDuration(
        cycleLength,
        typeof parsed.menstruationDuration === "number"
          ? parsed.menstruationDuration
          : v2SettingsDefaults.menstruationDuration,
      ),
      lastPeriodStart:
        typeof parsed.lastPeriodStart === "string" ? parsed.lastPeriodStart : null,
      lastVisitAt: typeof parsed.lastVisitAt === "string" ? parsed.lastVisitAt : null,
      firstOpenYmd: typeof parsed.firstOpenYmd === "string" ? parsed.firstOpenYmd : null,
      morningEveningDumpDismissedItemId:
        typeof parsed.morningEveningDumpDismissedItemId === "string"
          ? parsed.morningEveningDumpDismissedItemId
          : null,
      whySuggestionDismissedId:
        typeof parsed.whySuggestionDismissedId === "string"
          ? parsed.whySuggestionDismissedId
          : null,
      whySuggestionIdleOpensOn:
        typeof parsed.whySuggestionIdleOpensOn === "string"
          ? parsed.whySuggestionIdleOpensOn
          : null,
      whySuggestionIdleOpenCount:
        typeof parsed.whySuggestionIdleOpenCount === "number" &&
        Number.isFinite(parsed.whySuggestionIdleOpenCount)
          ? Math.max(0, Math.floor(parsed.whySuggestionIdleOpenCount))
          : 0,
      whyAnchorDismissedOn:
        typeof parsed.whyAnchorDismissedOn === "string"
          ? parsed.whyAnchorDismissedOn
          : null,
      returnVariant:
        parsed.returnVariant === "notification" || parsed.returnVariant === "widget_hint"
          ? parsed.returnVariant
          : null,
      muteTodayPaused: parsed.muteTodayPaused === true,
      muteTodayPausedOn:
        typeof parsed.muteTodayPausedOn === "string" ? parsed.muteTodayPausedOn : null,
      day1SkipHookDismissedOn:
        typeof parsed.day1SkipHookDismissedOn === "string"
          ? parsed.day1SkipHookDismissedOn
          : null,
      shutdownNudgeDismissedOn:
        typeof parsed.shutdownNudgeDismissedOn === "string"
          ? parsed.shutdownNudgeDismissedOn
          : null,
      returnPermissionPromptDismissed: parsed.returnPermissionPromptDismissed === true,
      accountSavePromptDismissed: parsed.accountSavePromptDismissed === true,
      firstValueAt:
        typeof parsed.firstValueAt === "string" ? parsed.firstValueAt : null,
      cycleOptInPromptDismissed: parsed.cycleOptInPromptDismissed === true,
      reminderCadence: normalizeReminderCadence(parsed),
      openTaskReminderEnabled: parsed.openTaskReminderEnabled === true,
      quoteEnabled: parsed.quoteEnabled === true,
      lastNotificationAt:
        typeof parsed.lastNotificationAt === "string" ? parsed.lastNotificationAt : null,
      quoteShownOn: typeof parsed.quoteShownOn === "string" ? parsed.quoteShownOn : null,
      quoteDismissedOn:
        typeof parsed.quoteDismissedOn === "string" ? parsed.quoteDismissedOn : null,
      openTaskReminderDismissedOn:
        typeof parsed.openTaskReminderDismissedOn === "string"
          ? parsed.openTaskReminderDismissedOn
          : null,
    };
  } catch {
    return { ...v2SettingsDefaults };
  }
}

function normalizeReminderCadence(parsed: Partial<V2Settings>): V2ReminderCadence {
  if (
    parsed.reminderCadence === "morning" ||
    parsed.reminderCadence === "evening" ||
    parsed.reminderCadence === "both"
  ) {
    return parsed.reminderCadence;
  }
  if (parsed.notificationsEnabled === true) return "morning";
  return "none";
}

export function readV2Settings(): V2Settings {
  if (typeof window === "undefined") return { ...v2SettingsDefaults };
  try {
    return hydrateV2Settings(window.localStorage.getItem(V2_SETTINGS_KEY));
  } catch {
    return { ...v2SettingsDefaults };
  }
}

export function writeV2Settings(next: V2Settings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(V2_SETTINGS_KEY, JSON.stringify(next));
  } catch {
    // Privémodus: negeren.
  }
}

export function patchV2Settings(patch: Partial<V2Settings>): V2Settings {
  const next = { ...readV2Settings(), ...patch };
  writeV2Settings(next);
  return next;
}

/** Of vandaag op pauze staat (mute reset automatisch na middernacht). */
export function isV2MutedToday(settings?: V2Settings): boolean {
  const s = settings ?? readV2Settings();
  if (!s.muteTodayPaused) return false;
  const today = todayYmd();
  if (s.muteTodayPausedOn !== today) {
    patchV2Settings({ muteTodayPaused: false, muteTodayPausedOn: null });
    return false;
  }
  return true;
}

/** Export lokale v2-data (journey + settings + taken + dump). */
export function exportV2LocalData(): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  const keys = [
    "v2_journey",
    V2_SETTINGS_KEY,
    "v2_tasks",
    "v2_dump",
    "v2_dump_draft",
    "v2_adaptive",
  ];
  const data: Record<string, unknown> = {};
  for (const key of keys) {
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;
    try {
      data[key] = JSON.parse(raw);
    } catch {
      data[key] = raw;
    }
  }
  return data;
}
