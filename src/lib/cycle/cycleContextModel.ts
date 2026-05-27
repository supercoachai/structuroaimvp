import {
  boundsToPhaseList,
  computeCyclePhaseBounds,
  resolvePhaseKeyForDay,
  type CyclePhaseKey,
} from "./cyclePhaseRanges";
import {
  clampCycleLength,
  clampMenstruationDuration,
  MENSTRUATION_DURATION_DEFAULT,
} from "./types";

export type { CyclePhaseKey };

export type CyclePhaseRange = {
  key: CyclePhaseKey;
  start: number;
  end: number;
  color: string;
  tint: string;
};

export type CycleRingSegment = {
  color: string;
  dasharray: string;
  dashoffset: number;
};

export type CycleContextView = {
  day: number;
  length: number;
  phases: CyclePhaseRange[];
  activePhase: CyclePhaseKey;
  ringSegments: CycleRingSegment[];
  indicator: { cx: number; cy: number };
};

export const CYCLE_RING = {
  cx: 33,
  cy: 33,
  r: 28.5,
} as const;

const PHASE_COLORS: Record<CyclePhaseKey, { color: string; tint: string }> = {
  menstrual: { color: "#E5484D", tint: "#FEF1F1" },
  follicular: { color: "#16A34A", tint: "#F0FAF4" },
  ovulation: { color: "#F59E0B", tint: "#FEF7E6" },
  luteal: { color: "#8B5CF6", tint: "#F4F0FE" },
};

export function computeCyclePhaseRanges(
  length: number,
  menstruationDuration: number = MENSTRUATION_DURATION_DEFAULT
): CyclePhaseRange[] {
  const bounds = computeCyclePhaseBounds(length, menstruationDuration);
  return boundsToPhaseList(bounds).map((phase) => ({
    ...phase,
    ...PHASE_COLORS[phase.key],
  }));
}

export function resolvePhaseForDay(
  day: number,
  phases: CyclePhaseRange[]
): CyclePhaseKey {
  const d = Math.max(1, Math.round(day));
  for (const phase of phases) {
    if (d >= phase.start && d <= phase.end) return phase.key;
  }
  return phases[phases.length - 1]?.key ?? "luteal";
}

function ringCircumference(): number {
  return 2 * Math.PI * CYCLE_RING.r;
}

export function computeRingIndicatorPosition(day: number, length: number): {
  cx: number;
  cy: number;
} {
  const L = clampCycleLength(length);
  const d = Math.min(L, Math.max(1, Math.round(day)));
  const angleDeg = (d - 0.5) * (360 / L) - 90;
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    cx: CYCLE_RING.cx + CYCLE_RING.r * Math.cos(angleRad),
    cy: CYCLE_RING.cy + CYCLE_RING.r * Math.sin(angleRad),
  };
}

export function buildCycleRingSegments(
  phases: CyclePhaseRange[],
  length: number
): CycleRingSegment[] {
  const L = clampCycleLength(length);
  const circumference = ringCircumference();
  let offset = 0;

  return phases.map((phase) => {
    const days = phase.end - phase.start + 1;
    const arc = (days / L) * circumference;
    const segment: CycleRingSegment = {
      color: phase.color,
      dasharray: `${arc.toFixed(2)} ${circumference.toFixed(2)}`,
      dashoffset: -offset,
    };
    offset += arc;
    return segment;
  });
}

export function buildCycleContextView(
  day: number,
  length: number,
  menstruationDuration: number = MENSTRUATION_DURATION_DEFAULT
): CycleContextView {
  const L = clampCycleLength(length);
  const safeMenstruation = clampMenstruationDuration(L, menstruationDuration);
  const safeDay = Math.min(L, Math.max(1, Math.round(day)));
  const phases = computeCyclePhaseRanges(L, safeMenstruation);
  const bounds = computeCyclePhaseBounds(L, safeMenstruation);
  const activePhase = resolvePhaseKeyForDay(safeDay, bounds);

  return {
    day: safeDay,
    length: L,
    phases,
    activePhase,
    ringSegments: buildCycleRingSegments(phases, L),
    indicator: computeRingIndicatorPosition(safeDay, L),
  };
}

export function getActivePhaseStyle(phases: CyclePhaseRange[], activePhase: CyclePhaseKey) {
  return phases.find((p) => p.key === activePhase) ?? phases[0];
}
