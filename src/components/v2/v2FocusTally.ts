"use client";

import { todayYmd } from "./v2Tasks";
import {
  emptyV2DoneTally,
  rollTallyToWeek,
  type V2DoneTally,
  type V2DoneTallyTick,
} from "./v2DoneTally";

export const V2_FOCUS_TALLY_KEY = "v2_focus_tally";

function clampCount(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function normalizeTally(raw: unknown, today: string): V2DoneTally | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const total = clampCount(Number(row.total));
  const weekCount = clampCount(Number(row.weekCount));
  const weekStart =
    typeof row.weekStart === "string" && /^\d{4}-\d{2}-\d{2}$/.test(row.weekStart)
      ? row.weekStart
      : emptyV2DoneTally(today).weekStart;
  return { total, weekCount, weekStart };
}

function readStoredTally(today: string): V2DoneTally | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(V2_FOCUS_TALLY_KEY);
    if (!raw) return null;
    return normalizeTally(JSON.parse(raw), today);
  } catch {
    return null;
  }
}

export function saveV2FocusTally(tally: V2DoneTally): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(V2_FOCUS_TALLY_KEY, JSON.stringify(tally));
  } catch {
    /* privémodus */
  }
}

export function loadV2FocusTally(today: string = todayYmd()): V2DoneTally {
  if (typeof window === "undefined") return emptyV2DoneTally(today);
  const stored = readStoredTally(today);
  if (!stored) {
    const empty = emptyV2DoneTally(today);
    saveV2FocusTally(empty);
    return empty;
  }
  const rolled = rollTallyToWeek(stored, today);
  if (rolled.weekStart !== stored.weekStart || rolled.weekCount !== stored.weekCount) {
    saveV2FocusTally(rolled);
  }
  return rolled;
}

/** +1 na een voltooide focus-sessie (Ik ben klaar). */
export function recordV2FocusSession(today: string = todayYmd()): V2DoneTallyTick {
  const stored = readStoredTally(today);
  const before = stored ? rollTallyToWeek(stored, today) : emptyV2DoneTally(today);
  const after: V2DoneTally = {
    total: before.total + 1,
    weekCount: before.weekCount + 1,
    weekStart: before.weekStart,
  };
  saveV2FocusTally(after);
  return {
    weekFrom: before.weekCount,
    weekTo: after.weekCount,
    totalFrom: before.total,
    totalTo: after.total,
  };
}
