"use client";

import { v2FrisseStartMinDays } from "./v2Adaptive";
import { loadV2Dump, saveV2Dump } from "./v2Dump";
import { patchV2Settings, readV2Settings } from "./v2Settings";
import type { V2State } from "./V2Context";

const SESSION_KEY = "v2_frisse_start_handled";

export function daysSinceLastVisit(lastVisitAt: string | null, now = Date.now()): number | null {
  if (!lastVisitAt) return null;
  const prev = new Date(lastVisitAt).getTime();
  if (Number.isNaN(prev)) return null;
  return (now - prev) / (1000 * 60 * 60 * 24);
}

export function shouldShowFrisseStart(now = Date.now()): boolean {
  if (typeof window !== "undefined") {
    try {
      if (window.sessionStorage.getItem(SESSION_KEY) === "1") return false;
    } catch {
      // negeren
    }
  }
  const settings = readV2Settings();
  const days = daysSinceLastVisit(settings.lastVisitAt, now);
  if (days === null) return false;
  return days >= v2FrisseStartMinDays();
}

export function markFrisseStartHandled(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // negeren
  }
}

export function recordV2Visit(now = new Date()): void {
  patchV2Settings({ lastVisitAt: now.toISOString() });
}

/** Zet open dump-items op rust; geen shame-counts. */
export function frisseStartRestDump(): void {
  const items = loadV2Dump();
  const next = items.map((item) =>
    item.disposition === null || item.disposition === undefined
      ? { ...item, disposition: "rest" as const }
      : item,
  );
  saveV2Dump(next);
}

/** Zachte reset van vandaag: dingen/energie, geen taken-wipe. */
export function frisseStartSoftResetToday(): Partial<V2State> {
  return {
    things: [],
    energy: null,
    todayDone: false,
  };
}
