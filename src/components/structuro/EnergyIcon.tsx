"use client";

/** Brandstof/batterij: geen maan (slaap) of zon (dag/nacht). */
export type EnergyIconKind = "low" | "medium" | "high";

type EnergyIconProps = {
  kind: EnergyIconKind;
  size?: number;
  color?: string;
};

const BODY = { x: 5, y: 6, w: 14, h: 15, rx: 2.5 };
const PAD = 2;
const SEG_H = (BODY.h - PAD * 2) / 3;
const SEG_GAP = 1.2;

function segmentY(index: 0 | 1 | 2) {
  return BODY.y + PAD + index * (SEG_H + SEG_GAP);
}

/** Segmentbatterij: 1 / 2 / 3 cellen gevuld = laag / normaal / hoog. */
function BatteryFuelIcon({
  filledSegments,
  size,
  color,
}: {
  filledSegments: 1 | 2 | 3;
  size: number;
  color: string;
}) {
  const capW = 6;
  const capH = 2.5;
  const capX = 12 - capW / 2;

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x={capX}
        y={3}
        width={capW}
        height={capH}
        rx={1}
        fill={color}
        opacity={0.45}
      />
      <rect
        x={BODY.x}
        y={BODY.y}
        width={BODY.w}
        height={BODY.h}
        rx={BODY.rx}
        stroke={color}
        strokeWidth={1.6}
      />
      {([0, 1, 2] as const).map((i) => {
        const filled = i < filledSegments;
        const y = segmentY(i);
        return (
          <rect
            key={i}
            x={BODY.x + PAD}
            y={y}
            width={BODY.w - PAD * 2}
            height={SEG_H}
            rx={1.2}
            fill={filled ? color : "none"}
            stroke={filled ? "none" : color}
            strokeWidth={filled ? 0 : 1}
            opacity={filled ? (i === 0 ? 0.55 : i === 1 ? 0.78 : 1) : 0.22}
          />
        );
      })}
      {filledSegments === 3 ? (
        <>
          <path
            d="M12 2.5v1.2"
            stroke={color}
            strokeWidth={1.4}
            strokeLinecap="round"
            opacity={0.5}
          />
          <circle cx={17.5} cy={8} r={1} fill={color} opacity={0.35} />
          <circle cx={6.5} cy={10} r={0.85} fill={color} opacity={0.28} />
        </>
      ) : null}
    </svg>
  );
}

export default function EnergyIcon({ kind, size = 14, color = "currentColor" }: EnergyIconProps) {
  const filled = kind === "low" ? 1 : kind === "medium" ? 2 : 3;
  return <BatteryFuelIcon filledSegments={filled} size={size} color={color} />;
}

/** Map legacy icon keys naar brandstof-metafoor. */
export function energyIconKindFromLegacy(
  legacy: "moon" | "half" | "sun" | EnergyIconKind
): EnergyIconKind {
  if (legacy === "moon") return "low";
  if (legacy === "sun") return "high";
  if (legacy === "half") return "medium";
  return legacy;
}
