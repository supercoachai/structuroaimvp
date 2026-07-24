/**
 * Proprioceptieve feedback via Vibration API. Safari PWA kan dit negeren; visuele routes blijven leidend.
 * Graceful no-op zonder API of bij prefers-reduced-motion (opt-in via respectReducedMotion).
 */

const hasVibrationAPI =
  typeof navigator !== "undefined" && "vibrate" in navigator;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function triggerHaptic(
  pattern: number | number[] = 20,
  opts?: { respectReducedMotion?: boolean },
) {
  if (opts?.respectReducedMotion && prefersReducedMotion()) return;
  if (!hasVibrationAPI) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* stil falen */
  }
}

export const HAPTIC_PATTERNS = {
  /** Lichte tap voor bottom-nav / menu-wissel. */
  NAV_TAP: 12,
  MICROSTEP_DONE: 20,
  TASK_DONE: [100, 40, 100] as number[],
  DAY_DONE: [80, 50, 80] as number[],
  ERROR: [50, 100, 50] as number[],
  SUCCESS: 80,
  NOTIFICATION: [30, 20, 30, 20, 30] as number[],
};

export function useHaptics() {
  const triggerByName = (patternName: keyof typeof HAPTIC_PATTERNS) => {
    triggerHaptic(HAPTIC_PATTERNS[patternName]);
  };
  return { triggerHaptic, triggerByName };
}
