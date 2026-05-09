/**
 * Cyclus-tracking types. Optionele feature, alleen actief na expliciete consent.
 * Database: profiles.cycle_tracking_consent_at, cycle_last_period_start, cycle_average_length
 *           daily_checkins.cycle_phase
 */

export type CyclePhase =
  | "follicular"
  | "ovulation"
  | "luteal"
  | "menstrual"
  | "unknown";

export type CycleProfile = {
  /** ISO timestamp van eerste opt-in. NULL = geen consent / uitgeschakeld. */
  consentAt: string | null;
  /** YYYY-MM-DD, datum van laatste menstruatiestart. */
  lastPeriodStart: string | null;
  /** Gemiddelde cycluslengte in dagen. Range 21-35, default 28. */
  averageLength: number;
};

export const CYCLE_LENGTH_MIN = 21;
export const CYCLE_LENGTH_MAX = 35;
export const CYCLE_LENGTH_DEFAULT = 28;

/** Voorbij hoeveel dagen zonder update we de fase als "unknown" beschouwen. */
export const CYCLE_STALE_AFTER_CYCLES = 2;

/** Maximale aantal dagen terug dat we een laatste menstruatiestart accepteren in setup-flow. */
export const CYCLE_SETUP_MAX_DAYS_BACK = 60;

export function clampCycleLength(value: number): number {
  if (!Number.isFinite(value)) return CYCLE_LENGTH_DEFAULT;
  return Math.min(CYCLE_LENGTH_MAX, Math.max(CYCLE_LENGTH_MIN, Math.round(value)));
}
