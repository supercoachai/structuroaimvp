"use client";

import { hasV2FirstValue } from "./v2CycleOptInPrompt";
import { isV2MutedToday, patchV2Settings, readV2Settings } from "./v2Settings";
import { todayYmd } from "./v2Tasks";
import type { V2State } from "./V2Context";

const EVENING_HOUR = 20;

/**
 * Avond-nudge naar shutdown. Pas ná eerste focus/shutdown-win, zodat de
 * first-session primary (Start focus → account-brug) niet wordt overschaduwd.
 */
export function shouldShowShutdownNudge(state: V2State, now = new Date()): boolean {
  if (typeof window === "undefined") return false;
  if (now.getHours() < EVENING_HOUR) return false;
  if (state.todayDone) return false;
  if (isV2MutedToday()) return false;
  if (!hasV2FirstValue()) return false;

  const settings = readV2Settings();
  if (settings.shutdownNudgeDismissedOn === todayYmd()) return false;

  return true;
}

export function dismissShutdownNudge(): void {
  patchV2Settings({ shutdownNudgeDismissedOn: todayYmd() });
}

export const SHUTDOWN_NUDGE_LINE =
  "Je dag is nog open. Als je wilt, kun je hem rustig afsluiten.";
