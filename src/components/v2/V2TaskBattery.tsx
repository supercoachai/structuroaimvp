"use client";

import Battery from "@/components/dagstart/design/Battery";
import { useI18n } from "@/lib/i18n";

import type { V2Energy } from "./V2Context";
import { V2_BATTERY_MUTED, v2EnergyMeta } from "./v2EnergyMeta";

/**
 * Compacte energie-batterij per taak (v2 teal/sage, niet v1-blauw).
 * 1 / 2 / 3 segmenten = laag / genoeg / hoog.
 */
export default function V2TaskBattery({
  energy,
  size = 20,
  mutedColor = V2_BATTERY_MUTED,
}: {
  energy: V2Energy | null | undefined;
  size?: number;
  mutedColor?: string;
}) {
  const { t } = useI18n();
  const meta = v2EnergyMeta(energy);
  if (!meta) return null;

  const labelKey =
    meta.value === "low"
      ? "v2.energyLow"
      : meta.value === "high"
        ? "v2.energyHigh"
        : "v2.energyEnough";
  const label = t(labelKey);

  return (
    <span
      className="v2-task-battery"
      title={label}
      aria-label={t("v2.taskEnergyAria", { level: label })}
    >
      <Battery
        level={meta.level}
        color={meta.color}
        mutedColor={mutedColor}
        size={size}
      />
    </span>
  );
}
