/**
 * Proprioceptieve feedback via Vibration API. Safari PWA kan dit negeren; visuele routes blijven leidend.
 */

const hasVibrationAPI =
  typeof navigator !== "undefined" && "vibrate" in navigator;

export function triggerHaptic(pattern: number | number[] = 20) {
  if (!hasVibrationAPI) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* stil falen */
  }
}

export const HAPTIC_PATTERNS = {
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
