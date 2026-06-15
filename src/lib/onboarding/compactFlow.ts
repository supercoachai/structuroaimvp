/**
 * Marsroute: onboarding inkorten tot naam → echte eerste dagstart.
 * Slaat welkom-tour, demo-slides, cyclus en dagafsluiting over.
 */

export const ONBOARDING_COMPACT_MODE = true;

/** Zichtbare voortgangspunten in compacte modus (naam + fases eerste dag). */
export const COMPACT_PROGRESS_STEPS = 5;

export const COMPACT_NAME_SLIDE = 0;
export const COMPACT_FIRST_DAY_SLIDE = 7;

export function compactNextSlide(current: number): number | "finish" | null {
  if (!ONBOARDING_COMPACT_MODE) return null;
  if (current === COMPACT_NAME_SLIDE) return COMPACT_FIRST_DAY_SLIDE;
  if (current === COMPACT_FIRST_DAY_SLIDE) return "finish";
  return null;
}

export function compactPrevSlide(current: number): number | null {
  if (!ONBOARDING_COMPACT_MODE) return null;
  if (current === COMPACT_FIRST_DAY_SLIDE) return COMPACT_NAME_SLIDE;
  return null;
}

/** 0–4 voor voortgangsbalk in compacte modus. */
export function compactProgressIndex(input: {
  step: number;
  firstDayEnergy: "low" | "medium" | "high" | null;
  firstDayTaskPhaseVisible: boolean;
  firstTaskTitle: string;
  firstDayReady: boolean;
}): number {
  if (input.step === COMPACT_NAME_SLIDE) return 0;
  if (input.step !== COMPACT_FIRST_DAY_SLIDE) return 0;
  if (!input.firstDayEnergy) return 1;
  if (!input.firstDayTaskPhaseVisible || !input.firstTaskTitle.trim()) return 2;
  if (!input.firstDayReady) return 3;
  return 4;
}

/** Snellere slides voor ADHD-publiek in compacte modus. */
export const COMPACT_SLIDE_MS = 800;
