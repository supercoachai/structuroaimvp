"use client";

import { trackClientFunnelEvent } from "@/lib/posthog/clientFunnelAnalyticsClient";
import { captureAnonymousEvent } from "@/lib/posthog/track";

import { isV2EveningLocal } from "./v2Dump";
import { patchV2Settings, readV2Settings } from "./v2Settings";
import { todayYmd } from "./v2Tasks";
import type { V2Energy } from "./V2Context";

const SESSION_FIRED_KEY = "app_analytics_session_fired";
const HOME_SESSION_FIRED_KEY = "home_session_fired";
const DAY2_FIRED_PREFIX = "day2_return_fired_";

/**
 * P0 retentie/activatie: altijd cookieless (geen settings-opt-in).
 * Server-backup via client-funnel API.
 */
function trackAppActivation(
  event:
    | "app_session_start"
    | "home_session_start"
    | "day2_return"
    | "daily_dagstart_complete"
    | "shutdown_completed"
    | "frisse_start_accepted"
    | "pwa_install_shown"
    | "pwa_install_prompt_available"
    | "pwa_install_prompt_clicked"
    | "pwa_install_prompt_result"
    | "pwa_install_skipped",
  properties?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  trackClientFunnelEvent(event, { ...properties, surface: "app" });
}

/**
 * Fine-grained UI prompts: alleen bij expliciete analytics-toestemming in settings.
 */
function trackOptIn(event: string, properties?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  if (!readV2Settings().analyticsConsent) return;
  captureAnonymousEvent(event, { ...properties, surface: "app" });
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

/** Eén keer per browsersessie bij openen van de app. */
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

  trackAppActivation("app_session_start", {
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
    trackAppActivation("day2_return", {
      date: today,
      days_since_first_open: daysSinceFirst,
      days_since_last_visit:
        visitGap === null ? null : Math.round(visitGap * 10) / 10,
    });
  }
}

/** Eén keer per browsersessie wanneer de ingelogde home (/) laadt. */
export function trackV2HomeSessionStart(): void {
  if (typeof window === "undefined") return;
  try {
    if (window.sessionStorage.getItem(HOME_SESSION_FIRED_KEY) === "1") return;
    window.sessionStorage.setItem(HOME_SESSION_FIRED_KEY, "1");
  } catch {
    // sessionStorage geblokkeerd: toch proberen te tracken.
  }
  trackAppActivation("home_session_start", { surface: "home" });
}

export function trackV2DagstartComplete(props: {
  energy: V2Energy | null;
  thingCount: number;
  hasWhy: boolean;
}): void {
  trackAppActivation("daily_dagstart_complete", {
    energy_level: props.energy,
    thing_count: props.thingCount,
    has_why: props.hasWhy,
  });
}

export function trackV2ShutdownCompleted(props: {
  winCount: number;
  dumpAdded: boolean;
}): void {
  trackAppActivation("shutdown_completed", {
    win_count: props.winCount,
    dump_added: props.dumpAdded,
    is_evening: isV2EveningLocal(),
  });
}

export function trackV2FrisseStartAccepted(props: {
  daysSinceLastVisit: number | null;
}): void {
  trackAppActivation("frisse_start_accepted", {
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
  trackOptIn("evening_dump_added", {
    source: props.source,
    content_length: props.contentLength,
    hour_local: new Date().getHours(),
  });
}

export function trackV2WhySuggestionShown(props: {
  source: "task" | "journey";
}): void {
  trackOptIn("why_suggestion_shown", { source: props.source });
}

export function trackV2WhySuggestionAccepted(props: {
  source: "task" | "journey";
}): void {
  trackOptIn("why_suggestion_accepted", { source: props.source });
}

export function trackV2EnergyShortcutShown(props: { energy: V2Energy }): void {
  trackOptIn("energy_shortcut_shown", { energy_level: props.energy });
}

export function trackV2EnergyShortcutAccepted(props: { energy: V2Energy }): void {
  trackOptIn("energy_shortcut_accepted", { energy_level: props.energy });
}

export function trackV2EnergyShortcutSkipped(): void {
  trackOptIn("energy_shortcut_skipped", {});
}

export function trackV2CycleHintShown(props: { kind: "active_only" | "phase" }): void {
  trackOptIn("cycle_hint_shown", { hint_kind: props.kind });
}

export function trackV2ReturnReminderOptIn(props: {
  variant: "notification" | "widget_hint";
}): void {
  trackOptIn("return_reminder_opt_in", { variant: props.variant });
}

export function trackV2ReturnReminderShown(props: {
  channel: "notification" | "widget_hint";
}): void {
  trackOptIn("return_reminder_shown", { channel: props.channel });
}

export function trackV2ReturnReminderDismissed(props: {
  channel: "notification" | "widget_hint";
}): void {
  trackOptIn("return_reminder_dismissed", { channel: props.channel });
}

export function trackV2SkipDay1HookShown(): void {
  trackOptIn("skip_day1_hook_shown", {});
}

export function trackV2ShutdownNudgeShown(): void {
  trackOptIn("shutdown_nudge_shown", {});
}

export function trackV2ReturnPermissionShown(_props: Record<string, never>): void {
  trackOptIn("return_permission_prompt_shown", {});
}

export function trackV2ReturnPermissionAccepted(props: {
  variant: "notification" | "widget_hint";
}): void {
  trackOptIn("return_permission_prompt_accepted", { variant: props.variant });
}

export function trackV2ReturnPermissionDismissed(_props: Record<string, never>): void {
  trackOptIn("return_permission_prompt_dismissed", {});
}

export function trackV2HomePromptPriority(props: { prompt_kind: string }): void {
  trackOptIn("home_prompt_priority", { prompt_kind: props.prompt_kind });
}

export function trackV2ShutdownSentiment(props: {
  sentiment: "calm_yes" | "calm_no" | "skipped";
}): void {
  trackOptIn("shutdown_sentiment", { sentiment: props.sentiment });
}

export function trackV2ReminderCadenceChanged(props: {
  cadence: "none" | "morning" | "evening" | "both";
}): void {
  trackOptIn("reminder_cadence_changed", { cadence: props.cadence });
}

export function trackV2OpenTaskReminderOptIn(_props: Record<string, never>): void {
  trackOptIn("open_task_reminder_opt_in", {});
}

export function trackV2OpenTaskReminderShown(props: { channel: "home" | "notification" }): void {
  trackOptIn("open_task_reminder_shown", { channel: props.channel });
}

export function trackV2OpenTaskReminderDismissed(props: { channel: "home" | "notification" }): void {
  trackOptIn("open_task_reminder_dismissed", { channel: props.channel });
}

export function trackV2QuoteOptIn(_props: Record<string, never>): void {
  trackOptIn("quote_opt_in", {});
}

export function trackV2QuoteShown(props: { surface: "home" | "notification" }): void {
  trackOptIn("quote_shown", { surface: props.surface });
}

export function trackV2QuoteDismissed(_props: Record<string, never>): void {
  trackOptIn("quote_dismissed", {});
}

export function trackV2NotificationFired(props: {
  kind: "morning" | "evening" | "open_task" | "shutdown";
}): void {
  trackOptIn("notification_fired", { kind: props.kind });
}

export function trackV2NotificationMutedToday(_props: Record<string, never>): void {
  trackOptIn("notification_muted_today", {});
}

export function trackV2PwaInstallShown(platformHint: string): void {
  trackAppActivation("pwa_install_shown", { platform_hint: platformHint });
}

export function trackV2PwaInstallPromptAvailable(): void {
  trackAppActivation("pwa_install_prompt_available", { platform_hint: "android" });
}

export function trackV2PwaInstallPromptClicked(): void {
  trackAppActivation("pwa_install_prompt_clicked", { platform_hint: "android" });
}

export function trackV2PwaInstallPromptResult(
  outcome: "accepted" | "dismissed" | "unavailable",
): void {
  trackAppActivation("pwa_install_prompt_result", {
    platform_hint: "android",
    outcome,
  });
}

export function trackV2PwaInstallSkipped(): void {
  trackAppActivation("pwa_install_skipped", {});
}
