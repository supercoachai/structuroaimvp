/**
 * Marsroute (tijdelijk ingekort): onboarding beperkt tot welkom → cyclus → naam.
 * Na de naamvraag rondt de onboarding af; de eerste dagstart en alle demo-slides
 * staan tijdelijk uit. De tussenliggende oude onboarding-slides worden volledig
 * overgeslagen (geen horizontale "fly-through").
 */

export const ONBOARDING_COMPACT_MODE = true;

/** Zichtbare voortgangspunten in compacte modus (welkom + cyclus + naam). */
export const COMPACT_PROGRESS_STEPS = 3;

export const COMPACT_WELCOME_SLIDE = 0;
export const COMPACT_NAME_SLIDE = 1;
export const COMPACT_CYCLE_SLIDE = 6;
/** Behouden voor backwards-compat; niet langer onderdeel van de actieve flow. */
export const COMPACT_FIRST_DAY_SLIDE = 7;

export function compactNextSlide(current: number): number | "finish" | null {
  if (!ONBOARDING_COMPACT_MODE) return null;
  if (current === COMPACT_WELCOME_SLIDE) return COMPACT_CYCLE_SLIDE;
  if (current === COMPACT_CYCLE_SLIDE) return COMPACT_NAME_SLIDE;
  if (current === COMPACT_NAME_SLIDE) return "finish";
  return null;
}

export function compactPrevSlide(current: number): number | null {
  if (!ONBOARDING_COMPACT_MODE) return null;
  if (current === COMPACT_NAME_SLIDE) return COMPACT_CYCLE_SLIDE;
  if (current === COMPACT_CYCLE_SLIDE) return COMPACT_WELCOME_SLIDE;
  return null;
}

/** 0–2 voor voortgangsbalk in compacte modus (welkom, cyclus, naam). */
export function compactProgressIndex(input: {
  step: number;
  firstDayEnergy: "low" | "medium" | "high" | null;
  firstDayTaskPhaseVisible: boolean;
  firstTaskTitle: string;
  firstDayReady: boolean;
}): number {
  if (input.step === COMPACT_WELCOME_SLIDE) return 0;
  if (input.step === COMPACT_CYCLE_SLIDE) return 1;
  if (input.step === COMPACT_NAME_SLIDE) return 2;
  return 0;
}

/** Snellere slides voor ADHD-publiek in compacte modus. */
export const COMPACT_SLIDE_MS = 800;
