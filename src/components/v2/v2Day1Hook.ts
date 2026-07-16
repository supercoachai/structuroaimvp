"use client";

import { readV2Adaptive } from "./v2Adaptive";
import { isV2MutedToday, patchV2Settings, readV2Settings } from "./v2Settings";
import { todayYmd } from "./v2Tasks";
import { v2HasThings, v2NormalizeThings } from "./v2Things";
import type { V2State } from "./V2Context";

function calendarDaysBetween(earlierYmd: string, laterYmd: string): number {
  const [y1, m1, d1] = earlierYmd.split("-").map(Number);
  const [y2, m2, d2] = laterYmd.split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function isMorningWindow(now = new Date()): boolean {
  const h = now.getHours();
  return h >= 6 && h < 12;
}

/** Day-1 ochtend na rustige day-0 (geen dingen gekozen). */
export function shouldShowDay1SkipHook(state: V2State, now = new Date()): boolean {
  if (typeof window === "undefined") return false;
  if (!isMorningWindow(now)) return false;
  if (isV2MutedToday()) return false;

  const settings = readV2Settings();
  const { firstOpenYmd, day1SkipHookDismissedOn } = settings;
  if (!firstOpenYmd) return false;

  const today = todayYmd();
  if (day1SkipHookDismissedOn === today) return false;
  if (calendarDaysBetween(firstOpenYmd, today) !== 1) return false;

  const things = v2NormalizeThings(state.things);
  if (v2HasThings(things)) return false;

  const { energyByYmd } = readV2Adaptive();
  if (energyByYmd[firstOpenYmd]) return false;

  return true;
}

export function dismissDay1SkipHook(): void {
  patchV2Settings({ day1SkipHookDismissedOn: todayYmd() });
}

export const DAY1_SKIP_HOOK_LINE =
  "Gisteren koos je rust. Nog steeds oké.";
