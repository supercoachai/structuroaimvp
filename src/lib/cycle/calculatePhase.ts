import type { CyclePhase } from "./types";
import { CYCLE_STALE_AFTER_CYCLES } from "./types";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Bereken de huidige cyclusfase op basis van laatste menstruatiestart en cycluslengte.
 *
 * Aanname-model (algemene benadering, niet medisch advies):
 * - Dag 1 t/m 5: menstruatie
 * - Dag 6 t/m (cyclus - 16): folliculair
 * - Dag (cyclus - 14) ± 1: ovulatie
 * - Dag (cyclus - 13) t/m einde: luteaal
 *
 * Als de laatste menstruatiestart meer dan {@link CYCLE_STALE_AFTER_CYCLES} cycli geleden is
 * zonder update, geven we 'unknown' terug zodat we geen onbetrouwbare suggesties tonen.
 *
 * Disclaimer: dit is een algemene benadering. De gebruiker kan altijd zelf overrulen.
 */
/** Trim tijdcomponenten zodat we vergelijken op lokale kalenderdag. */
function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

type CycleDayState = {
  dayInCycle: number;
  ovulationDay: number;
};

function computeCycleDayState(
  lastPeriodStart: Date,
  averageLength: number,
  today: Date = new Date()
): CycleDayState | null {
  if (!(lastPeriodStart instanceof Date) || Number.isNaN(lastPeriodStart.getTime())) {
    return null;
  }
  if (!Number.isFinite(averageLength) || averageLength < 14) {
    return null;
  }

  const startMidnight = startOfLocalDay(lastPeriodStart);
  const todayMidnight = startOfLocalDay(today);
  const daysSinceStart = Math.floor(
    (todayMidnight.getTime() - startMidnight.getTime()) / MS_PER_DAY
  );

  if (daysSinceStart < 0) return null;
  if (daysSinceStart > averageLength * CYCLE_STALE_AFTER_CYCLES) return null;

  return {
    dayInCycle: (daysSinceStart % averageLength) + 1,
    ovulationDay: averageLength - 14,
  };
}

/** Cyclusdag 1-based, of null bij ongeldige/stale input. */
export function calculateDayInCycle(
  lastPeriodStart: Date,
  averageLength: number,
  today: Date = new Date()
): number | null {
  return computeCycleDayState(lastPeriodStart, averageLength, today)?.dayInCycle ?? null;
}

export function calculateCyclePhase(
  lastPeriodStart: Date,
  averageLength: number,
  today: Date = new Date()
): CyclePhase {
  const state = computeCycleDayState(lastPeriodStart, averageLength, today);
  if (!state) return "unknown";

  const { dayInCycle, ovulationDay } = state;

  if (dayInCycle <= 5) return "menstrual";
  if (
    dayInCycle === ovulationDay ||
    dayInCycle === ovulationDay - 1 ||
    dayInCycle === ovulationDay + 1
  ) {
    return "ovulation";
  }
  if (dayInCycle < ovulationDay) return "follicular";
  return "luteal";
}
