import type { CyclePhase } from "./types";
import {
  clampMenstruationDuration,
  MENSTRUATION_DURATION_DEFAULT,
} from "./types";
import {
  computeCyclePhaseBounds,
  resolvePhaseKeyForDay,
} from "./cyclePhaseRanges";
import { CYCLE_STALE_AFTER_CYCLES } from "./types";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Trim tijdcomponenten zodat we vergelijken op lokale kalenderdag. */
function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function computeCycleDayState(
  lastPeriodStart: Date,
  averageLength: number,
  today: Date = new Date()
): { dayInCycle: number } | null {
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
  today: Date = new Date(),
  menstruationDuration: number = MENSTRUATION_DURATION_DEFAULT
): CyclePhase {
  const state = computeCycleDayState(lastPeriodStart, averageLength, today);
  if (!state) return "unknown";

  const bounds = computeCyclePhaseBounds(
    averageLength,
    clampMenstruationDuration(averageLength, menstruationDuration)
  );
  return resolvePhaseKeyForDay(state.dayInCycle, bounds);
}
