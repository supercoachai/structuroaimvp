"use client";

import { useState } from "react";
import { BatteryFull, BatteryLow, BatteryMedium } from "lucide-react";
import { ST_ENERGY_DOT, type StEnergyId } from "@/lib/structuro/energyTokens";

export type DagstartEnergyValue = "low" | "medium" | "high";

type EnergyCardConfig = {
  value: DagstartEnergyValue;
  labelKey: "low" | "medium" | "high";
  stId: StEnergyId;
  Icon: typeof BatteryLow;
};

const CARDS: EnergyCardConfig[] = [
  {
    value: "low",
    labelKey: "low",
    stId: "laag",
    Icon: BatteryLow,
  },
  {
    value: "medium",
    labelKey: "medium",
    stId: "gem",
    Icon: BatteryMedium,
  },
  {
    value: "high",
    labelKey: "high",
    stId: "hoog",
    Icon: BatteryFull,
  },
];

type DagstartEnergyCardsProps = {
  value: DagstartEnergyValue | null;
  onChange: (value: DagstartEnergyValue) => void;
  labels: Record<"low" | "medium" | "high", string>;
  sublabels: Record<"low" | "medium" | "high", string>;
};

export default function DagstartEnergyCards({
  value,
  onChange,
  labels,
  sublabels,
}: DagstartEnergyCardsProps) {
  const [hovered, setHovered] = useState<DagstartEnergyValue | null>(null);

  return (
    <div className="grid grid-cols-3 gap-2">
      {CARDS.map((card) => {
        const selected = value === card.value;
        const highlighted = selected || hovered === card.value;
        const tone = ST_ENERGY_DOT[card.stId];
        const Icon = card.Icon;
        return (
          <button
            key={card.value}
            type="button"
            onClick={() => onChange(card.value)}
            onMouseEnter={() => setHovered(card.value)}
            onMouseLeave={() => setHovered(null)}
            className="flex flex-col items-center rounded-xl border p-3 transition-all duration-150 ease-out"
            style={{
              borderColor: selected
                ? tone.color
                : highlighted
                  ? `${tone.color}66`
                  : "var(--st-line-strong)",
              background: selected ? tone.bg : highlighted ? "white" : "white",
              boxShadow: selected
                ? `0 0 0 2px ${tone.color}33`
                : highlighted
                  ? "0 2px 8px -4px rgba(14,23,48,0.08)"
                  : undefined,
            }}
          >
            <Icon
              className="h-8 w-8"
              style={{ color: highlighted ? tone.color : "var(--st-muted)" }}
              strokeWidth={selected ? 2 : 1.75}
              aria-hidden
            />
            <span
              className="mt-2 text-sm font-semibold"
              style={{ color: highlighted ? "var(--st-ink)" : "var(--st-ink)" }}
            >
              {labels[card.labelKey]}
            </span>
            <span className="mt-0.5 text-xs text-[var(--st-muted-2)]">{sublabels[card.labelKey]}</span>
          </button>
        );
      })}
    </div>
  );
}

export function energyBannerStyle(level: DagstartEnergyValue): {
  background: string;
  color: string;
} {
  const stId = level === "low" ? "laag" : level === "high" ? "hoog" : "gem";
  const tone = ST_ENERGY_DOT[stId];
  return { background: tone.bg, color: tone.color };
}

export function energyBannerCopy(
  level: DagstartEnergyValue,
  tr: (key: string) => string
): { title: string; sub: string } {
  if (level === "low") {
    return { title: tr("dayStart.bannerLowTitle"), sub: tr("dayStart.bannerLowSub") };
  }
  if (level === "high") {
    return { title: tr("dayStart.bannerHighTitle"), sub: tr("dayStart.bannerHighSub") };
  }
  return { title: tr("dayStart.bannerMedTitle"), sub: tr("dayStart.bannerMedSub") };
}
