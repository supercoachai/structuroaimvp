import {
  calculateCyclePhase,
  calculateDayInCycle,
} from "./calculatePhase";
import type { CyclePhase, CycleProfile } from "./types";

/** Fase-labels voor passieve dagstart-context (luteaal gesplitst). */
export type CycleDisplayPhase =
  | "menstrual"
  | "follicular"
  | "ovulation"
  | "luteal_early"
  | "luteal_late";

export type CycleEnergyContextData =
  | { kind: "none" }
  | { kind: "active_only" }
  | { kind: "full"; dayInCycle: number; displayPhase: CycleDisplayPhase };

export function resolveCycleDisplayPhase(
  phase: CyclePhase,
  dayInCycle: number,
  averageLength: number
): CycleDisplayPhase | null {
  if (phase === "unknown") return null;
  if (phase === "luteal") {
    const lateStart = Math.max(23, averageLength - 5);
    return dayInCycle >= lateStart ? "luteal_late" : "luteal_early";
  }
  return phase;
}

/** Passieve cyclus-context voor energie-keuze (geen suggestie, geen pre-select). */
export function getCycleEnergyContext(
  consentOn: boolean,
  profile: CycleProfile,
  today: Date = new Date()
): CycleEnergyContextData {
  if (!consentOn) return { kind: "none" };
  if (!profile.lastPeriodStart) return { kind: "active_only" };

  const startDate = new Date(`${profile.lastPeriodStart}T00:00:00`);
  if (Number.isNaN(startDate.getTime())) return { kind: "active_only" };

  const dayInCycle = calculateDayInCycle(
    startDate,
    profile.averageLength,
    today
  );
  const phase = calculateCyclePhase(
    startDate,
    profile.averageLength,
    today,
    profile.menstruationDuration
  );
  if (dayInCycle == null || phase === "unknown") {
    return { kind: "active_only" };
  }

  const displayPhase = resolveCycleDisplayPhase(
    phase,
    dayInCycle,
    profile.averageLength
  );
  if (!displayPhase) return { kind: "active_only" };

  return { kind: "full", dayInCycle, displayPhase };
}
