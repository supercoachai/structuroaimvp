import type { CyclePhaseKey } from "./cycleContextModel";

export type EnergyLevel = "low" | "medium" | "high";

export type EnergyPhaseMatch = "match" | "soft-mismatch" | "strong-mismatch";

export type EnergyPhaseMatchDirection = "higher" | "lower" | "none";

function energyRank(level: EnergyLevel): number {
  if (level === "low") return 0;
  if (level === "medium") return 1;
  return 2;
}

/** Fase → wat de cyclus doorgaans suggereert (informatief, geen app-beslissing). */
export function getSuggestedEnergyForPhase(phase: CyclePhaseKey): EnergyLevel {
  switch (phase) {
    case "menstrual":
      return "low";
    case "follicular":
      return "medium";
    case "ovulation":
      return "high";
    case "luteal":
      return "low";
  }
}

export function getEnergyPhaseMatch(
  phase: CyclePhaseKey,
  chosen: EnergyLevel
): { match: EnergyPhaseMatch; direction: EnergyPhaseMatchDirection } {
  const suggested = getSuggestedEnergyForPhase(phase);
  const diff = energyRank(chosen) - energyRank(suggested);
  if (diff === 0) {
    return { match: "match", direction: "none" };
  }
  if (Math.abs(diff) === 1) {
    return {
      match: "soft-mismatch",
      direction: diff > 0 ? "higher" : "lower",
    };
  }
  return {
    match: "strong-mismatch",
    direction: diff > 0 ? "higher" : "lower",
  };
}
