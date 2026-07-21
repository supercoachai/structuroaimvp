"use client";

import { useState, type ReactNode } from "react";

import { useSupportsHover } from "@/hooks/useSupportsHover";

import { V2_ENERGY_OPTIONS, type V2Energy } from "./V2Context";
import {
  V2_ENERGY_DEFAULT_ORB,
  V2_ENERGY_META,
} from "./v2EnergyMeta";

function V2Battery({
  level,
  filledBars,
  color,
  mutedColor = "rgba(92, 100, 120, 0.45)",
  size = 20,
}: {
  level: 1 | 2 | 3;
  filledBars: number;
  color: string;
  mutedColor?: string;
  size?: number;
}) {
  const height = size * (16 / 28);
  const filled = Math.max(0, Math.min(level, filledBars));
  const frameColor = filled > 0 ? color : mutedColor;

  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 28 16"
      fill="none"
      aria-hidden
    >
      <rect
        x="1"
        y="2"
        width="22"
        height="12"
        rx="3"
        stroke={frameColor}
        strokeWidth="1.5"
        fill="none"
      />
      <rect x="24" y="6" width="3" height="4" rx="1.2" fill={frameColor} />
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={3.5 + i * 6.2}
          y="4.5"
          width="4.6"
          height="7"
          rx="1.2"
          fill={i < filled ? color : mutedColor}
        />
      ))}
    </svg>
  );
}

export default function V2EnergyStep({
  greeting,
  userName,
  energy,
  title = "Hoe is je energie?",
  subtitle,
  onPick,
  onSkip,
  abovePills,
  headerSlot,
}: {
  greeting?: string;
  userName?: string;
  energy: V2Energy | null;
  title?: string;
  subtitle?: string;
  onPick: (energy: V2Energy) => void;
  onSkip: () => void;
  abovePills?: ReactNode;
  /**
   * Optioneel slot in de energiestap (bijv. cyclus-chip).
   * Prefer variant="absolute" (rustig rechtsboven); niet gecentreerd boven de begroeting.
   */
  headerSlot?: ReactNode;
}) {
  const supportsHover = useSupportsHover();
  const [hovered, setHovered] = useState<V2Energy | null>(null);

  const activeMeta =
    V2_ENERGY_META.find((m) => m.value === (hovered ?? energy)) ?? null;
  const orbColor = activeMeta?.color ?? V2_ENERGY_DEFAULT_ORB;
  const hint =
    V2_ENERGY_OPTIONS.find((o) => o.value === (hovered ?? energy))?.hint ??
    null;

  return (
    <div className="v2-energy-step">
      {/* Geen layout-wrapper: absolute chip positioneert t.o.v. .v2-energy-step */}
      {headerSlot}

      <div className="v2-energy-step__intro">
        {greeting ? (
          <p className="v2-energy-step__greeting">{greeting}</p>
        ) : null}
        {userName ? <p className="v2-energy-step__name">{userName}</p> : null}
      </div>

      <div
        className="v2-energy-step__orb"
        style={{ ["--v2-orb" as string]: orbColor }}
        aria-hidden
      >
        <span className="v2-energy-step__ring v2-energy-step__ring--outer" />
        <span className="v2-energy-step__ring v2-energy-step__ring--inner" />
        <span className="v2-energy-step__core" />
      </div>

      <h1 className="v2-energy-step__title">{title}</h1>
      {subtitle ? <p className="v2-energy-step__subtitle">{subtitle}</p> : null}

      {abovePills ? <div className="v2-energy-step__above">{abovePills}</div> : null}

      <div className="v2-energy-step__pills" role="group" aria-label="Energieniveau">
        {V2_ENERGY_META.map((opt) => {
          const active = energy === opt.value;
          const isHovered = supportsHover && hovered === opt.value;
          const highlighted = active || isHovered;
          const filledBars = supportsHover ? (highlighted ? opt.level : 0) : opt.level;
          return (
            <button
              key={opt.value}
              type="button"
              className="v2-energy-pill"
              data-energy={opt.value}
              aria-pressed={active}
              onClick={() => onPick(opt.value)}
              onMouseEnter={supportsHover ? () => setHovered(opt.value) : undefined}
              onMouseLeave={supportsHover ? () => setHovered(null) : undefined}
              onFocus={supportsHover ? () => setHovered(opt.value) : undefined}
              onBlur={supportsHover ? () => setHovered(null) : undefined}
            >
              <span className="v2-energy-pill__battery">
                <V2Battery
                  level={opt.level}
                  filledBars={filledBars}
                  color={highlighted ? opt.color : "rgba(92, 100, 120, 0.45)"}
                />
              </span>
              <span className="v2-energy-pill__label">{opt.label}</span>
            </button>
          );
        })}
      </div>

      {hint ? <p className="v2-energy-step__hint">{hint}</p> : null}

      <button type="button" className="v2-link v2-energy-step__skip" onClick={onSkip}>
        Sla over
      </button>
    </div>
  );
}

export function v2GreetingWord(now = new Date()): string {
  const h = now.getHours();
  if (h < 6) return "Goedenacht";
  if (h < 12) return "Goedemorgen";
  if (h < 18) return "Goedemiddag";
  return "Goedenavond";
}
