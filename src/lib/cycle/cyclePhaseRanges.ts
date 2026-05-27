import type { CyclePhase } from "./types";
import {
  clampCycleLength,
  clampMenstruationDuration,
  MENSTRUATION_DURATION_DEFAULT,
} from "./types";

export type CyclePhaseKey = "menstrual" | "follicular" | "ovulation" | "luteal";

export type CyclePhaseBounds = Record<
  CyclePhaseKey,
  { start: number; end: number }
>;

export type CyclePhaseSpan = {
  key: CyclePhaseKey;
  start: number;
  end: number;
};

/**
 * Dynamische fase-bereiken op basis van door de gebruiker ingevoerde duur.
 *
 * menstruatie: 1 t/m menstruatieDuur
 * folliculair: menstruatieDuur + 1 t/m cyclusDuur - 16
 * ovulatie:    cyclusDuur - 15 t/m cyclusDuur - 13
 * luteaal:     cyclusDuur - 12 t/m cyclusDuur
 */
export function computeCyclePhaseBounds(
  cycleLength: number,
  menstruationDuration: number = MENSTRUATION_DURATION_DEFAULT
): CyclePhaseBounds {
  const cyclusDuur = clampCycleLength(cycleLength);
  const menstruatieDuur = clampMenstruationDuration(cyclusDuur, menstruationDuration);

  return {
    menstrual: { start: 1, end: menstruatieDuur },
    follicular: { start: menstruatieDuur + 1, end: cyclusDuur - 16 },
    ovulation: { start: cyclusDuur - 15, end: cyclusDuur - 13 },
    luteal: { start: cyclusDuur - 12, end: cyclusDuur },
  };
}

const PHASE_ORDER: CyclePhaseKey[] = [
  "menstrual",
  "follicular",
  "ovulation",
  "luteal",
];

export function boundsToPhaseList(bounds: CyclePhaseBounds): CyclePhaseSpan[] {
  return PHASE_ORDER.map((key) => ({
    key,
    start: bounds[key].start,
    end: bounds[key].end,
  }));
}

export function resolvePhaseKeyForDay(
  day: number,
  bounds: CyclePhaseBounds
): CyclePhaseKey {
  const d = Math.max(1, Math.round(day));
  for (const key of PHASE_ORDER) {
    const { start, end } = bounds[key];
    if (d >= start && d <= end) return key;
  }
  return "luteal";
}

export function resolveCyclePhaseForDay(
  day: number,
  cycleLength: number,
  menstruationDuration: number = MENSTRUATION_DURATION_DEFAULT
): CyclePhase {
  const bounds = computeCyclePhaseBounds(cycleLength, menstruationDuration);
  return resolvePhaseKeyForDay(day, bounds);
}
