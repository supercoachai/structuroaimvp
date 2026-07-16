"use client";

import {
  isV2MutedToday,
  patchV2Settings,
  readV2Settings,
  type V2ReminderCadence,
} from "./v2Settings";
import { todayYmd } from "./v2Tasks";

import { assignV2ReturnVariant, type V2ReturnVariant } from "./v2Adaptive";
import { canFireV2Notification, markV2NotificationFired } from "./v2NotificationCap";
import { getV2MorningNotificationBody } from "./v2Quotes";

const MORNING_HOUR = 8;
const EVENING_HOUR = 20;
const LAST_MORNING_FIRED_KEY = "v2_return_reminder_morning_fired";
const LAST_EVENING_FIRED_KEY = "v2_return_reminder_evening_fired";

export function getReminderCadence(): V2ReminderCadence {
  return readV2Settings().reminderCadence;
}

export function setReminderCadence(cadence: V2ReminderCadence): void {
  patchV2Settings({
    reminderCadence: cadence,
    notificationsEnabled: cadence !== "none",
  });
}

export function isMorningCadenceEnabled(): boolean {
  const cadence = getReminderCadence();
  return cadence === "morning" || cadence === "both";
}

export function isEveningCadenceEnabled(): boolean {
  const cadence = getReminderCadence();
  return cadence === "evening" || cadence === "both";
}

export function isV2ReturnReminderEnabled(): boolean {
  return getReminderCadence() !== "none";
}

export function getV2ReturnVariant(): V2ReturnVariant | null {
  const { returnVariant } = readV2Settings();
  if (returnVariant === "notification" || returnVariant === "widget_hint") {
    return returnVariant;
  }
  return null;
}

export function enableV2ReturnReminder(): V2ReturnVariant {
  assignV2ReturnVariant();
  setReminderCadence("morning");
  return getV2ReturnVariant() ?? assignV2ReturnVariant();
}

export function disableV2ReturnReminder(): void {
  setReminderCadence("none");
}

export function muteV2ReturnReminderToday(): void {
  patchV2Settings({
    muteTodayPaused: true,
    muteTodayPausedOn: todayYmd(),
  });
}

export function isMorningWindow(now = new Date()): boolean {
  const h = now.getHours();
  return h >= 6 && h < 12;
}

export function isEveningWindow(now = new Date()): boolean {
  const h = now.getHours();
  return h >= 18 && h < 22;
}

export function shouldShowReturnWidgetHint(now = new Date()): boolean {
  if (!isMorningCadenceEnabled()) return false;
  if (isV2MutedToday()) return false;
  if (getV2ReturnVariant() !== "widget_hint") return false;
  return isMorningWindow(now);
}

function msUntilNextHour(hour: number, now = new Date()): number {
  const next = new Date(now);
  next.setHours(hour, 0, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
}

function alreadyFiredSlotToday(storageKey: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(storageKey) === todayYmd();
  } catch {
    return false;
  }
}

function markFiredSlotToday(storageKey: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, todayYmd());
  } catch {
    // negeren
  }
}

export function supportsBrowserNotification(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestV2NotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!supportsBrowserNotification()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

export type V2NotificationKind = "morning" | "evening" | "open_task";

function fireLocalNotification(
  kind: V2NotificationKind,
  body: string,
  tag: string,
  firedKey: string,
): boolean {
  if (!supportsBrowserNotification()) return false;
  if (Notification.permission !== "granted") return false;
  if (isV2MutedToday()) return false;
  if (!canFireV2Notification()) return false;
  if (alreadyFiredSlotToday(firedKey)) return false;

  try {
    new Notification("Structuro", {
      body,
      tag,
      silent: true,
    });
    markFiredSlotToday(firedKey);
    markV2NotificationFired();
    return true;
  } catch {
    return false;
  }
}

export function fireV2MorningNotification(now = new Date()): boolean {
  if (!isMorningCadenceEnabled()) return false;
  if (getV2ReturnVariant() !== "notification") return false;
  if (!isMorningWindow(now)) return false;
  return fireLocalNotification(
    "morning",
    getV2MorningNotificationBody(now),
    "v2-dagstart-reminder",
    LAST_MORNING_FIRED_KEY,
  );
}

export function fireV2EveningNotification(now = new Date()): boolean {
  if (!isEveningCadenceEnabled()) return false;
  if (getV2ReturnVariant() !== "notification") return false;
  if (!isEveningWindow(now)) return false;
  return fireLocalNotification(
    "evening",
    "Als je wilt: je dag kun je rustig afsluiten. Geen haast.",
    "v2-shutdown-reminder",
    LAST_EVENING_FIRED_KEY,
  );
}

export function fireV2OpenTaskNotification(body: string): boolean {
  return fireLocalNotification(
    "open_task",
    body,
    "v2-open-task-reminder",
    "v2_open_task_notification_fired",
  );
}

let morningTimer: ReturnType<typeof setTimeout> | null = null;
let eveningTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Plan lokale herinneringen (v2 prototype).
 * Werkt alleen terwijl een tab open blijft of bij bezoek in het venster.
 * Geen service worker of push backend in deze batch.
 */
export function scheduleV2ReturnNotification(): void {
  if (typeof window === "undefined") return;

  if (morningTimer) {
    clearTimeout(morningTimer);
    morningTimer = null;
  }
  if (eveningTimer) {
    clearTimeout(eveningTimer);
    eveningTimer = null;
  }

  if (!isV2ReturnReminderEnabled()) return;
  if (getV2ReturnVariant() !== "notification") return;
  if (!supportsBrowserNotification() || Notification.permission !== "granted") return;

  if (isMorningCadenceEnabled()) {
    const morningDelay = msUntilNextHour(MORNING_HOUR);
    morningTimer = setTimeout(() => {
      fireV2MorningNotification();
      scheduleV2ReturnNotification();
    }, morningDelay);
  }

  if (isEveningCadenceEnabled()) {
    const eveningDelay = msUntilNextHour(EVENING_HOUR);
    eveningTimer = setTimeout(() => {
      fireV2EveningNotification();
      scheduleV2ReturnNotification();
    }, eveningDelay);
  }
}

export function clearV2ReturnNotificationSchedule(): void {
  if (morningTimer) {
    clearTimeout(morningTimer);
    morningTimer = null;
  }
  if (eveningTimer) {
    clearTimeout(eveningTimer);
    eveningTimer = null;
  }
}

/** Bij bezoek in venster: directe notificatie als permission al granted. */
export function maybeFireReturnNotificationOnVisit(now = new Date()): {
  morning: boolean;
  evening: boolean;
} {
  const result = { morning: false, evening: false };
  if (isV2MutedToday()) return result;
  if (getV2ReturnVariant() !== "notification") return result;

  if (isMorningWindow(now)) {
    result.morning = fireV2MorningNotification(now);
  }
  if (isEveningWindow(now)) {
    result.evening = fireV2EveningNotification(now);
  }
  return result;
}
