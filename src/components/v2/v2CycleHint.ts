"use client";

import { getCycleEnergyContext } from "@/lib/cycle/cycleDisplayContext";
import type { CycleProfile } from "@/lib/cycle/types";

import { readV2Settings } from "./v2Settings";
import type { V2State } from "./V2Context";

export type V2CycleEnergyHint = {
  kind: "active_only" | "phase";
  tipKey: string;
};

/** Zachte cyclus-hint bij energiestap; nooit auto-select. */
export function getV2CycleEnergyHint(state: V2State): V2CycleEnergyHint | null {
  if (!state.cyclusOptIn) return null;

  const settings = readV2Settings();
  const profile: CycleProfile = {
    consentAt: state.cyclusOptIn ? new Date().toISOString() : null,
    averageLength: settings.cycleLength,
    menstruationDuration: settings.menstruationDuration,
    lastPeriodStart: settings.lastPeriodStart,
  };

  const ctx = getCycleEnergyContext(true, profile);
  if (ctx.kind === "none") return null;
  if (ctx.kind === "active_only") {
    return { kind: "active_only", tipKey: "cycle.energyContextTip_active_only" };
  }
  return {
    kind: "phase",
    tipKey: `cycle.energyContextTip_${ctx.displayPhase}`,
  };
}
