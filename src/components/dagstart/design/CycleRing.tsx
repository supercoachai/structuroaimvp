"use client";

import { useMemo } from "react";
import {
  boundsToPhaseList,
  computeCyclePhaseBounds,
  type CyclePhaseKey,
} from "@/lib/cycle/cyclePhaseRanges";

type CycleRingProps = {
  day: number;
  cycleLength: number;
  menstruationDuration: number;
  size?: number;
  stroke?: number;
  /** Verberg dag-indicator (grote orb-ring rond energy-disc). */
  showIndicator?: boolean;
  /** Actieve fasesegment dikker + optioneel terracotta. */
  emphasizeActive?: boolean;
  /** Optionele override-kleuren (v2 mock: sage/gold/lavender/terracotta). */
  colors?: Partial<Record<CyclePhaseKey, string>>;
};

const PHASE_COLORS: Record<CyclePhaseKey, string> = {
  menstrual: "#E5484D",
  follicular: "#16A34A",
  ovulation: "#F59E0B",
  luteal: "#8B5CF6",
};

/** Optie 2 propose-orb: terracotta + sage/gold/lavender. */
export const V2_ORB_PHASE_COLORS: Record<CyclePhaseKey, string> = {
  menstrual: "#C4785A",
  follicular: "#8FAE8B",
  ovulation: "#D4A04A",
  luteal: "#A89BC8",
};

export function getCyclePhaseColor(key: CyclePhaseKey): string {
  return PHASE_COLORS[key];
}

export default function CycleRing({
  day,
  cycleLength,
  menstruationDuration,
  size = 32,
  stroke = 4,
  showIndicator = true,
  emphasizeActive = false,
  colors,
}: CycleRingProps) {
  const bounds = useMemo(
    () => computeCyclePhaseBounds(cycleLength, menstruationDuration),
    [cycleLength, menstruationDuration]
  );
  const segments = useMemo(() => boundsToPhaseList(bounds), [bounds]);
  const palette = useMemo(
    () => ({ ...PHASE_COLORS, ...colors }),
    [colors]
  );

  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const C = 2 * Math.PI * r;

  const clampedDay = Math.max(1, Math.min(cycleLength, Math.round(day)));
  const activePhase = segments.find(
    (s) => clampedDay >= s.start && clampedDay <= s.end
  );
  const activeKey = activePhase?.key;

  const arcs = useMemo(() => {
    let acc = 0;
    return segments.map((s) => {
      const days = Math.max(0, s.end - s.start + 1);
      const offset = (-acc / cycleLength) * C;
      const len = (days / cycleLength) * C;
      const gap = emphasizeActive ? 2.2 : 1.2;
      acc += days;
      const isActive = s.key === activeKey;
      return {
        key: s.key,
        color: palette[s.key],
        dasharray: `${Math.max(0, len - gap)} ${C}`,
        dashoffset: offset,
        strokeWidth:
          emphasizeActive && isActive ? stroke + 1.5 : stroke,
        opacity: emphasizeActive && !isActive ? 0.72 : 1,
      };
    });
  }, [segments, cycleLength, C, palette, activeKey, emphasizeActive, stroke]);

  const anglePerDay = 360 / cycleLength;
  const indAngle = (clampedDay - 0.5) * anglePerDay - 90;
  const ix = cx + r * Math.cos((indAngle * Math.PI) / 180);
  const iy = cy + r * Math.sin((indAngle * Math.PI) / 180);
  const indicatorColor = activeKey ? palette[activeKey] : "#3B6BF7";

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: "block", overflow: "visible", flexShrink: 0 }}
      aria-hidden
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(26,35,64,0.06)"
        strokeWidth={stroke}
      />
      <g transform={`rotate(-90 ${cx} ${cy})`}>
        {arcs.map((a) => (
          <circle
            key={a.key}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={a.color}
            strokeWidth={a.strokeWidth}
            strokeDasharray={a.dasharray}
            strokeDashoffset={a.dashoffset}
            strokeLinecap="butt"
            opacity={a.opacity}
          />
        ))}
      </g>
      {showIndicator ? (
        <>
          <circle
            cx={ix}
            cy={iy}
            r={Math.max(2.6, stroke / 2)}
            fill="white"
            stroke="rgba(14,23,48,0.18)"
            strokeWidth="1"
          />
          <circle
            cx={ix}
            cy={iy}
            r={Math.max(1.4, stroke / 3)}
            fill={indicatorColor}
          />
        </>
      ) : null}
    </svg>
  );
}
