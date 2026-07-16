"use client";

import { patchV2Settings, readV2Settings } from "./v2Settings";

const CAP_MS = 24 * 60 * 60 * 1000;

/** Hard cap: maximaal één browsernotificatie per 24 uur (rollend venster). */
export function canFireV2Notification(now = new Date()): boolean {
  const { lastNotificationAt } = readV2Settings();
  if (!lastNotificationAt) return true;
  const prev = new Date(lastNotificationAt).getTime();
  if (Number.isNaN(prev)) return true;
  return now.getTime() - prev >= CAP_MS;
}

export function markV2NotificationFired(now = new Date()): void {
  patchV2Settings({ lastNotificationAt: now.toISOString() });
}
