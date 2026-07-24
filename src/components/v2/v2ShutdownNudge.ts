"use client";

import { hasV2FirstValue } from "./v2CycleOptInPrompt";
import { canFireV2Notification, markV2NotificationFired } from "./v2NotificationCap";
import { isV2MutedToday, patchV2Settings, readV2Settings } from "./v2Settings";
import { todayYmd } from "./v2Tasks";
import type { V2State } from "./V2Context";

function supportsBrowserNotification(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/** Lokale herinnering rond 21:30 (geen home-kaart). */
const SHUTDOWN_HOUR = 21;
const SHUTDOWN_MINUTE = 30;
const LAST_SHUTDOWN_FIRED_KEY = "v2_shutdown_notification_fired";

export const SHUTDOWN_NUDGE_LINE =
  "Je dag is nog open. Als je wilt, kun je hem rustig afsluiten.";

/**
 * Eligibility voor shutdown-notificatie: open dag, na firstValue, niet gemute.
 * Geen home-kaart meer; alleen Notification API als permission al granted is.
 */
export function canOfferShutdownNotification(state: V2State): boolean {
  if (typeof window === "undefined") return false;
  if (state.todayDone) return false;
  if (isV2MutedToday()) return false;
  if (!hasV2FirstValue()) return false;
  return true;
}

/** @deprecated Home-kaart is verwijderd; altijd false. */
export function shouldShowShutdownNudge(_state: V2State, _now = new Date()): boolean {
  return false;
}

export function dismissShutdownNudge(): void {
  patchV2Settings({ shutdownNudgeDismissedOn: todayYmd() });
}

function alreadyFiredShutdownToday(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(LAST_SHUTDOWN_FIRED_KEY) === todayYmd();
  } catch {
    return false;
  }
}

function markFiredShutdownToday(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_SHUTDOWN_FIRED_KEY, todayYmd());
  } catch {
    // negeren
  }
}

function msUntilNextShutdown(now = new Date()): number {
  const next = new Date(now);
  next.setHours(SHUTDOWN_HOUR, SHUTDOWN_MINUTE, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
}

/** True vanaf 21:30 lokale tijd tot middernacht. */
export function isShutdownNotificationWindow(now = new Date()): boolean {
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes >= SHUTDOWN_HOUR * 60 + SHUTDOWN_MINUTE;
}

/**
 * Fire lokale browsernotificatie voor open dag.
 * Fallback zonder permission: niets (Dag afsluiten blijft via home-loop / nav).
 * Werkt alleen met open tab of bij bezoek in het venster (geen SW/push in v2).
 */
export function fireV2ShutdownNotification(state: V2State, now = new Date()): boolean {
  if (!canOfferShutdownNotification(state)) return false;
  if (!isShutdownNotificationWindow(now)) return false;
  if (!supportsBrowserNotification()) return false;
  if (Notification.permission !== "granted") return false;
  if (!canFireV2Notification(now)) return false;
  if (alreadyFiredShutdownToday()) return false;

  const settings = readV2Settings();
  if (settings.shutdownNudgeDismissedOn === todayYmd(now)) return false;

  try {
    new Notification("Structuro", {
      body: SHUTDOWN_NUDGE_LINE,
      tag: "v2-shutdown-reminder",
      silent: true,
    });
    markFiredShutdownToday();
    markV2NotificationFired(now);
    return true;
  } catch {
    return false;
  }
}

let shutdownTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Plan 21:30-herinnering. Alleen als Notification.permission === "granted".
 * Geen nieuwe permission-prompt hier (geen spam).
 */
export function scheduleV2ShutdownNotification(state: V2State): void {
  if (typeof window === "undefined") return;

  if (shutdownTimer) {
    clearTimeout(shutdownTimer);
    shutdownTimer = null;
  }

  if (!canOfferShutdownNotification(state)) return;
  if (!supportsBrowserNotification() || Notification.permission !== "granted") return;
  if (alreadyFiredShutdownToday()) return;

  const delay = msUntilNextShutdown();
  shutdownTimer = setTimeout(() => {
    fireV2ShutdownNotification(state);
    scheduleV2ShutdownNotification(state);
  }, delay);
}

export function clearV2ShutdownNotificationSchedule(): void {
  if (shutdownTimer) {
    clearTimeout(shutdownTimer);
    shutdownTimer = null;
  }
}
