"use client";

import { useState } from "react";
import CycleRing, { getCyclePhaseColor } from "./CycleRing";
import {
  computeCyclePhaseBounds,
  resolvePhaseKeyForDay,
  type CyclePhaseKey,
} from "@/lib/cycle/cyclePhaseRanges";

const HINT_KEY = "structuro.dagstartDesignCyclusHintSeen";

type CyclusButtonProps = {
  day: number;
  cycleLength: number;
  menstruationDuration: number;
  open: boolean;
  onToggle: () => void;
};

function readHintSeen(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(HINT_KEY) === "true";
  } catch {
    return true;
  }
}

export function resolveCurrentPhaseKey(
  day: number,
  cycleLength: number,
  menstruationDuration: number
): CyclePhaseKey {
  const bounds = computeCyclePhaseBounds(cycleLength, menstruationDuration);
  return resolvePhaseKeyForDay(day, bounds);
}

export default function CyclusButton({
  day,
  cycleLength,
  menstruationDuration,
  open,
  onToggle,
}: CyclusButtonProps) {
  const [hintSeen, setHintSeen] = useState<boolean>(() => readHintSeen());
  const phaseKey = resolveCurrentPhaseKey(day, cycleLength, menstruationDuration);
  const color = getCyclePhaseColor(phaseKey);

  const handleClick = () => {
    if (!hintSeen) {
      try {
        window.localStorage.setItem(HINT_KEY, "true");
      } catch {
        /* ignore */
      }
      setHintSeen(true);
    }
    onToggle();
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={handleClick}
        style={{
          all: "unset",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 12px 6px 7px",
          borderRadius: 999,
          background: open ? `${color}14` : "transparent",
          border: `1px solid ${open ? `${color}40` : "var(--st-line)"}`,
          transition: "all 200ms",
          position: "relative",
        }}
        aria-expanded={open}
        aria-label={`Cyclus dag ${day}`}
      >
        <CycleRing
          day={day}
          cycleLength={cycleLength}
          menstruationDuration={menstruationDuration}
          size={26}
          stroke={4}
        />
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: open ? color : "var(--st-muted)",
            whiteSpace: "nowrap",
          }}
        >
          Dag {day}
        </span>
        {!hintSeen && (
          <span
            style={{
              position: "absolute",
              top: -3,
              right: -3,
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: "var(--st-blue)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9.5,
              fontWeight: 700,
              color: "white",
              fontStyle: "italic",
              animation: "ds-pulse 1.8s ease-in-out infinite",
              boxShadow: "0 0 0 2px white",
            }}
            aria-hidden
          >
            i
          </span>
        )}
      </button>

      {!hintSeen && !open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            padding: "8px 12px",
            borderRadius: 10,
            background: "var(--st-ink)",
            color: "white",
            fontSize: 12,
            fontWeight: 500,
            whiteSpace: "nowrap",
            boxShadow: "0 8px 22px -8px rgba(14,23,48,0.40)",
            pointerEvents: "none",
            zIndex: 10,
          }}
          role="tooltip"
        >
          Cyclus-info en advies
          <span
            style={{
              position: "absolute",
              top: -4,
              right: 12,
              width: 8,
              height: 8,
              background: "var(--st-ink)",
              transform: "rotate(45deg)",
            }}
            aria-hidden
          />
        </div>
      )}
    </div>
  );
}
