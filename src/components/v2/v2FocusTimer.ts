"use client";

/**
 * Persistente focus-timer voor ADHD UX: na distractie/refresh hervatten.
 * Los van v2_focus_session (open-task reminder), die alleen start/complete bijhoudt.
 */

const TIMER_KEY = "v2_focus_timer";

export type V2FocusTimerSnapshot = {
  thing: string;
  bucketKey: string;
  remaining: number;
  totalSecs: number;
  running: boolean;
  paused: boolean;
  finished: boolean;
  extended: boolean;
  updatedAt: number;
};

function readRaw(): V2FocusTimerSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(TIMER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<V2FocusTimerSnapshot>;
    if (
      typeof parsed.thing !== "string" ||
      typeof parsed.bucketKey !== "string" ||
      typeof parsed.remaining !== "number" ||
      typeof parsed.totalSecs !== "number"
    ) {
      return null;
    }
    return {
      thing: parsed.thing,
      bucketKey: parsed.bucketKey,
      remaining: Math.max(0, Math.floor(parsed.remaining)),
      totalSecs: Math.max(0, Math.floor(parsed.totalSecs)),
      running: parsed.running === true,
      paused: parsed.paused === true,
      finished: parsed.finished === true,
      extended: parsed.extended === true,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

/** Lees snapshot en tel resterende tijd bij als de timer liep tijdens afwezigheid. */
export function loadV2FocusTimer(thing: string): V2FocusTimerSnapshot | null {
  const snap = readRaw();
  if (!snap || snap.thing !== thing) return null;

  if (snap.finished || snap.extended) return snap;
  if (!snap.running || snap.paused) return snap;

  const elapsed = Math.floor((Date.now() - snap.updatedAt) / 1000);
  const remaining = Math.max(0, snap.remaining - elapsed);
  if (remaining <= 0) {
    return {
      ...snap,
      remaining: 0,
      running: false,
      paused: false,
      finished: true,
      updatedAt: Date.now(),
    };
  }
  return { ...snap, remaining, updatedAt: Date.now() };
}

export function saveV2FocusTimer(snap: V2FocusTimerSnapshot | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!snap) {
      window.localStorage.removeItem(TIMER_KEY);
      return;
    }
    window.localStorage.setItem(
      TIMER_KEY,
      JSON.stringify({ ...snap, updatedAt: Date.now() }),
    );
  } catch {
    // negeren
  }
}

export function clearV2FocusTimer(): void {
  saveV2FocusTimer(null);
}
