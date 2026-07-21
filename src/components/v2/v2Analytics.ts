"use client";

import { captureAnonymousEvent } from "@/lib/posthog/track";

import { isV2EveningLocal } from "./v2Dump";
import { patchV2Settings, readV2Settings } from "./v2Settings";
import { todayYmd } from "./v2Tasks";
import type { V2Energy } from "./V2Context";

const SESSION_FIRED_KEY = "v2_analytics_session_fired";
const DAY2_FIRED_PREFIX = "v2_day2_return_fired_";

function trackV2(event: string, properties?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  // Opt-in: settings-toggle moet aan staan (doctrine: geen stille tracking).
  if (!readV2Settings().analyticsConsent) return;
  captureAnonymousEvent(event, { ...properties, surface: "v2" });
}

function calendarDaysBetween(earlierYmd: string, laterYmd: string): number {
  const [y1, m1, d1] = earlierYmd.split("-").map(Number);
  const [y2, m2, d2] = laterYmd.split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function ensureFirstOpenYmd(): string {
  const settings = readV2Settings();
  if (settings.firstOpenYmd) return settings.firstOpenYmd;
  const today = todayYmd();
  patchV2Settings({ firstOpenYmd: today });
  return today;
}

function daysSinceLastVisit(): number | null {
  const { lastVisitAt } = readV2Settings();
  if (!lastVisitAt) return null;
  const prev = new Date(lastVisitAt).getTime();
  if (Number.isNaN(prev)) return null;
  return (Date.now() - prev) / (1000 * 60 * 60 * 24);
}

/** Eén keer per browsersessie bij openen van v2. */
export function trackV2SessionStart(): void {
  if (typeof window === "undefined") return;
  try {
    if (window.sessionStorage.getItem(SESSION_FIRED_KEY) === "1") return;
    window.sessionStorage.setItem(SESSION_FIRED_KEY, "1");
  } catch {
    // sessionStorage geblokkeerd: toch proberen te tracken.
  }

  const firstOpenYmd = ensureFirstOpenYmd();
  const today = todayYmd();
  const daysSinceFirst = calendarDaysBetween(firstOpenYmd, today);
  const visitGap = daysSinceLastVisit();

  trackV2("v2_session_start", {
    date: today,
    days_since_first_open: daysSinceFirst,
    days_since_last_visit:
      visitGap === null ? null : Math.round(visitGap * 10) / 10,
  });

  if (daysSinceFirst >= 1) {
    try {
      const guardKey = `${DAY2_FIRED_PREFIX}${today}`;
      if (window.localStorage.getItem(guardKey) === "1") return;
      window.localStorage.setItem(guardKey, "1");
    } catch {
      // negeren
    }
    trackV2("v2_day2_return", {
      date: today,
      days_since_first_open: daysSinceFirst,
      days_since_last_visit:
        visitGap === null ? null : Math.round(visitGap * 10) / 10,
    });
  }
}

export function trackV2DagstartComplete(props: {
  energy: V2Energy | null;
  thingCount: number;
  hasWhy: boolean;
}): void {
  trackV2("v2_dagstart_complete", {
    energy_level: props.energy,
    thing_count: props.thingCount,
    has_why: props.hasWhy,
  });
}

export function trackV2ShutdownCompleted(props: {
  winCount: number;
  dumpAdded: boolean;
}): void {
  trackV2("v2_shutdown_completed", {
    win_count: props.winCount,
    dump_added: props.dumpAdded,
    is_evening: isV2EveningLocal(),
  });
}

export function trackV2FrisseStartAccepted(props: {
  daysSinceLastVisit: number | null;
}): void {
  trackV2("v2_frisse_start_accepted", {
    days_since_last_visit:
      props.daysSinceLastVisit === null
        ? null
        : Math.round(props.daysSinceLastVisit * 10) / 10,
  });
}

export function trackV2EveningDumpAdded(props: {
  source: "dump" | "shutdown";
  contentLength: number;
}): void {
  trackV2("v2_evening_dump_added", {
    source: props.source,
    content_length: props.contentLength,
    hour_local: new Date().getHours(),
  });
}

export function trackV2WhySuggestionShown(props: {
  source: "task" | "journey";
}): void {
  trackV2("v2_why_suggestion_shown", { source: props.source });
}

export function trackV2WhySuggestionAccepted(props: {
  source: "task" | "journey";
}): void {
  trackV2("v2_why_suggestion_accepted", { source: props.source });
}

export function trackV2EnergyShortcutShown(props: { energy: V2Energy }): void {
  trackV2("v2_energy_shortcut_shown", { energy_level: props.energy });
}

export function trackV2EnergyShortcutAccepted(props: { energy: V2Energy }): void {
  trackV2("v2_energy_shortcut_accepted", { energy_level: props.energy });
}

export function trackV2EnergyShortcutSkipped(): void {
  trackV2("v2_energy_shortcut_skipped", {});
}

export function trackV2CycleHintShown(props: { kind: "active_only" | "phase" }): void {
  trackV2("v2_cycle_hint_shown", { hint_kind: props.kind });
}

export function trackV2ReturnReminderOptIn(props: {
  variant: "notification" | "widget_hint";
}): void {
  trackV2("v2_return_reminder_opt_in", { variant: props.variant });
}

export function trackV2ReturnReminderShown(props: {
  channel: "notification" | "widget_hint";
}): void {
  trackV2("v2_return_reminder_shown", { channel: props.channel });
}

export function trackV2ReturnReminderDismissed(props: {
  channel: "notification" | "widget_hint";
}): void {
  trackV2("v2_return_reminder_dismissed", { channel: props.channel });
}

export function trackV2SkipDay1HookShown(): void {
  trackV2("v2_skip_day1_hook_shown", {});
}

export function trackV2ShutdownNudgeShown(): void {
  trackV2("v2_shutdown_nudge_shown", {});
}

export function trackV2ReturnPermissionShown(_props: Record<string, never>): void {
  trackV2("v2_return_permission_prompt_shown", {});
}

export function trackV2ReturnPermissionAccepted(props: {
  variant: "notification" | "widget_hint";
}): void {
  trackV2("v2_return_permission_prompt_accepted", { variant: props.variant });
}

export function trackV2ReturnPermissionDismissed(_props: Record<string, never>): void {
  trackV2("v2_return_permission_prompt_dismissed", {});
}

export function trackV2HomePromptPriority(props: { prompt_kind: string }): void {
  trackV2("v2_home_prompt_priority", { prompt_kind: props.prompt_kind });
}

export function trackV2ShutdownSentiment(props: {
  sentiment: "calm_yes" | "calm_no" | "skipped";
}): void {
  trackV2("v2_shutdown_sentiment", { sentiment: props.sentiment });
}

export function trackV2ReminderCadenceChanged(props: {
  cadence: "none" | "morning" | "evening" | "both";
}): void {
  trackV2("v2_reminder_cadence_changed", { cadence: props.cadence });
}

export function trackV2OpenTaskReminderOptIn(_props: Record<string, never>): void {
  trackV2("v2_open_task_reminder_opt_in", {});
}

export function trackV2OpenTaskReminderShown(props: { channel: "home" | "notification" }): void {
  trackV2("v2_open_task_reminder_shown", { channel: props.channel });
}

export function trackV2OpenTaskReminderDismissed(props: { channel: "home" | "notification" }): void {
  trackV2("v2_open_task_reminder_dismissed", { channel: props.channel });
}

export function trackV2QuoteOptIn(_props: Record<string, never>): void {
  trackV2("v2_quote_opt_in", {});
}

export function trackV2QuoteShown(props: { surface: "home" | "notification" }): void {
  trackV2("v2_quote_shown", { surface: props.surface });
}

export function trackV2QuoteDismissed(_props: Record<string, never>): void {
  trackV2("v2_quote_dismissed", {});
}

export function trackV2NotificationFired(props: {
  kind: "morning" | "evening" | "open_task";
}): void {
  trackV2("v2_notification_fired", { kind: props.kind });
}

export function trackV2NotificationMutedToday(_props: Record<string, never>): void {
  trackV2("v2_notification_muted_today", {});
}

export function trackV2PwaInstallShown(platformHint: string): void {
  trackV2("v2_pwa_install_shown", { platform_hint: platformHint });
}

export function trackV2PwaInstallPromptAvailable(): void {
  trackV2("v2_pwa_install_prompt_available", { platform_hint: "android" });
}

export function trackV2PwaInstallPromptClicked(): void {
  trackV2("v2_pwa_install_prompt_clicked", { platform_hint: "android" });
}

export function trackV2PwaInstallPromptResult(
  outcome: "accepted" | "dismissed" | "unavailable",
): void {
  trackV2("v2_pwa_install_prompt_result", {
    platform_hint: "android",
    outcome,
  });
}

export function trackV2PwaInstallSkipped(): void {
  trackV2("v2_pwa_install_skipped", {});
}
