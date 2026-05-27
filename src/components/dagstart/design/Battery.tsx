"use client";

import type { CSSProperties } from "react";

type BatteryProps = {
  /** Maximaal aantal balkjes voor dit energieniveau (1, 2 of 3). */
  level?: 1 | 2 | 3;
  /** Hoeveel balkjes nu gevuld getoond worden (0–level). */
  filledBars?: number;
  color?: string;
  mutedColor?: string;
  size?: number;
  /** Sequentieel invullen bij hover. */
  animated?: boolean;
};

export default function Battery({
  level = 1,
  color = "#3B6BF7",
  mutedColor = "#ABB3C5",
  size = 28,
  filledBars,
  animated = false,
}: BatteryProps) {
  const height = size * (16 / 28);
  const filled = Math.max(0, Math.min(level, filledBars ?? level));
  const frameColor = filled > 0 ? color : mutedColor;

  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 28 16"
      fill="none"
      aria-hidden
      className={animated ? "ds-battery ds-battery--animated" : "ds-battery"}
      style={{ "--battery-accent": color, "--battery-muted": mutedColor } as CSSProperties}
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
        className="ds-battery-frame"
      />
      <rect x="24" y="6" width="3" height="4" rx="1.2" fill={frameColor} className="ds-battery-cap" />
      {[0, 1, 2].map((i) => {
        const isFilled = i < filled;
        return (
          <rect
            key={i}
            x={3.5 + i * 6.2}
            y="4.5"
            width="4.6"
            height="7"
            rx="1.2"
            fill={isFilled ? color : mutedColor}
            className={`ds-battery-bar${isFilled ? " ds-battery-bar--filled" : ""}`}
            data-bar={i}
          />
        );
      })}
    </svg>
  );
}
