/** Duur van hold-to-confirm in focus (ms). Kort genoeg om flow te houden, lang genoeg tegen mis-taps. */
export const V2_HOLD_TO_CONFIRM_MS = 850;

const HINT_STORAGE_KEY = "v2_focus_hold_hint_seen";

export function holdProgress(
  elapsedMs: number,
  durationMs: number = V2_HOLD_TO_CONFIRM_MS,
): number {
  if (durationMs <= 0) return 1;
  return Math.min(1, Math.max(0, elapsedMs / durationMs));
}

export function holdSucceeded(
  elapsedMs: number,
  durationMs: number = V2_HOLD_TO_CONFIRM_MS,
): boolean {
  return elapsedMs >= durationMs;
}

/** Korte tap (geen bewuste hold): toon hint i.p.v. bevestigen. */
export function wasBriefTap(
  elapsedMs: number,
  minHoldMs = 180,
): boolean {
  return elapsedMs < minHoldMs;
}

export function hasSeenFocusHoldHint(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(HINT_STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markFocusHoldHintSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HINT_STORAGE_KEY, "1");
  } catch {
    /* negeren */
  }
}
