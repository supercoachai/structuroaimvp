"use client";

import { hasV2FirstValue } from "./v2CycleOptInPrompt";
import { isV2MutedToday } from "./v2Settings";
import {
  isV2TaskCompletedToday,
  isV2TaskVisible,
  loadV2Tasks,
  todayYmd,
  type V2Task,
} from "./v2Tasks";
import { isShutdownNotificationWindow } from "./v2ShutdownNudge";
import type { V2State } from "./V2Context";

export type V2ShutdownInviteReason = "all_done" | "evening";

const INVITE_KEY = "v2_shutdown_invite";

type InviteState = {
  date: string;
  dismissed: V2ShutdownInviteReason[];
};

function readInviteState(today: string): InviteState {
  if (typeof window === "undefined") return { date: today, dismissed: [] };
  try {
    const raw = window.localStorage.getItem(INVITE_KEY);
    if (!raw) return { date: today, dismissed: [] };
    const parsed = JSON.parse(raw) as Partial<InviteState>;
    if (parsed.date !== today) return { date: today, dismissed: [] };
    const dismissed = Array.isArray(parsed.dismissed)
      ? parsed.dismissed.filter(
          (r): r is V2ShutdownInviteReason => r === "all_done" || r === "evening",
        )
      : [];
    return { date: today, dismissed };
  } catch {
    return { date: today, dismissed: [] };
  }
}

function writeInviteState(state: InviteState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(INVITE_KEY, JSON.stringify(state));
  } catch {
    /* privémodus */
  }
}

export function visibleOpenTaskCount(
  tasks: V2Task[] = loadV2Tasks(),
  now = Date.now(),
): number {
  return tasks.filter((t) => !t.done && isV2TaskVisible(t, now)).length;
}

export function completedTodayCount(
  tasks: V2Task[] = loadV2Tasks(),
  today: string = todayYmd(),
): number {
  return tasks.filter((t) => isV2TaskCompletedToday(t, today)).length;
}

/**
 * Zachte in-app uitnodiging: na de laatste zichtbare taak, of vanaf 21:30.
 * Geen vink/kruis: dat voelt als een toets. Twee tekstknoppen, één keer per reden per dag.
 */
export function resolveV2ShutdownInvite(
  state: V2State,
  now = new Date(),
  tasks: V2Task[] = loadV2Tasks(),
): V2ShutdownInviteReason | null {
  if (typeof window === "undefined") return null;
  if (state.todayDone) return null;
  if (isV2MutedToday()) return null;

  const today = todayYmd(now);
  const invite = readInviteState(today);
  const open = visibleOpenTaskCount(tasks, now.getTime());
  const done = completedTodayCount(tasks, today);

  if (
    open === 0 &&
    done > 0 &&
    !invite.dismissed.includes("all_done")
  ) {
    return "all_done";
  }

  if (
    isShutdownNotificationWindow(now) &&
    hasV2FirstValue() &&
    !invite.dismissed.includes("evening")
  ) {
    return "evening";
  }

  return null;
}

export function dismissV2ShutdownInvite(
  reason: V2ShutdownInviteReason,
  now = new Date(),
): void {
  const today = todayYmd(now);
  const invite = readInviteState(today);
  if (invite.dismissed.includes(reason)) return;
  writeInviteState({
    date: today,
    dismissed: [...invite.dismissed, reason],
  });
}

/** Geen uitnodiging tijdens ritueel, dagstart, focus of flow-chrome. */
export function v2ShutdownInviteAllowedOnPath(pathname: string | null): boolean {
  if (!pathname) return false;
  const path = pathname.replace(/^\/v2(?=\/|$)/, "") || "/";
  const blocked = ["/shutdown", "/dagstart", "/focus", "/login", "/onboarding"];
  return !blocked.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/** Milliseconden tot 21:30 lokaal, of null als het venster al open is. */
export function msUntilV2ShutdownEvening(now = new Date()): number | null {
  const start = new Date(now);
  start.setHours(21, 30, 0, 0);
  const delta = start.getTime() - now.getTime();
  return delta > 0 ? delta : null;
}
