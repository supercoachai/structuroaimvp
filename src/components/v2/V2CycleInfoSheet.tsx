"use client";

import { useMemo } from "react";

import { resolveCurrentPhaseKey } from "@/components/dagstart/design/CyclusButton";
import { getCyclePhaseColor } from "@/components/dagstart/design/CycleRing";
import type { CyclePhaseKey } from "@/lib/cycle/cyclePhaseRanges";
import { useI18n } from "@/lib/i18n";

import type { V2CycleChipInfo } from "./V2CycleChip";
import V2InfoHint from "./V2InfoHint";
import V2InfoSheet, { type V2InfoSheetRow } from "./V2InfoSheet";

const PHASE_ORDER: CyclePhaseKey[] = [
  "menstrual",
  "follicular",
  "ovulation",
  "luteal",
];

const PHASE_BAR_SHORT: Record<CyclePhaseKey, string> = {
  menstrual: "MENS.",
  follicular: "FOLLICULAIR",
  ovulation: "OVUL.",
  luteal: "LUTEAAL",
};

/** Mock Optie 2: sage / gold / lavender; menstruatie warm terracotta. */
const V2_PHASE_BAR_COLORS: Record<CyclePhaseKey, string> = {
  menstrual: "#C4785A",
  follicular: "#8FAE8B",
  ovulation: "#D4A04A",
  luteal: "#A89BC8",
};

type V2CycleInfoSheetProps = {
  info: V2CycleChipInfo;
  open: boolean;
  onClose: () => void;
};

/**
 * Bottom sheet bij (i) op de propose-energiestap (Optie 2).
 * Tip-copy zit hier, niet permanent boven de orb.
 */
export default function V2CycleInfoSheet({
  info,
  open,
  onClose,
}: V2CycleInfoSheetProps) {
  const { t } = useI18n();
  const phaseKey = resolveCurrentPhaseKey(
    info.day,
    info.cycleLength,
    info.menstruationDuration,
  );

  const tipKey =
    phaseKey === "luteal"
      ? "cycle.energyContextTip_luteal_late"
      : (`cycle.energyContextTip_${phaseKey}` as const);

  const phaseTitle = t(`cycle.infoSheetPhaseTitle_${phaseKey}`);
  const meaningBody = `${t(`cycle.infoSheetMeaning_${phaseKey}`)} ${t(tipKey)}`;

  const rows = useMemo<V2InfoSheetRow[]>(
    () => [
      {
        key: "meaning",
        icon: "meaning",
        title: t("cycle.infoSheetMeaningTitle"),
        body: meaningBody,
      },
      {
        key: "plan",
        icon: "plan",
        title: t("cycle.infoSheetPlanTitle"),
        body: t("cycle.infoSheetPlanBody"),
      },
      {
        key: "private",
        icon: "private",
        title: t("cycle.infoSheetPrivateTitle"),
        body: t("cycle.infoSheetPrivateBody"),
      },
    ],
    [meaningBody, t],
  );

  return (
    <V2InfoSheet
      open={open}
      onClose={onClose}
      eyebrow={t("cycle.infoSheetEyebrow", {
        day: String(info.day),
        length: String(info.cycleLength),
      })}
      title={phaseTitle}
      rows={rows}
      tone="warm"
      panelId="v2-cycle-info-sheet"
      gotItLabel={t("cycle.infoSheetGotIt")}
      closeAria={t("cycle.infoSheetCloseAria")}
    >
      <div
        className="v2-cycle-sheet__phases"
        role="list"
        aria-label={t("cycle.infoSheetPhasesAria")}
      >
        {PHASE_ORDER.map((key) => {
          const active = key === phaseKey;
          const color = V2_PHASE_BAR_COLORS[key] ?? getCyclePhaseColor(key);
          return (
            <div
              key={key}
              role="listitem"
              className={`v2-cycle-sheet__phase${active ? " is-active" : ""}`}
              style={{ ["--v2-phase" as string]: color }}
            >
              <span className="v2-cycle-sheet__phase-bar" aria-hidden />
              <span className="v2-cycle-sheet__phase-lbl">
                {PHASE_BAR_SHORT[key]}
              </span>
            </div>
          );
        })}
      </div>
    </V2InfoSheet>
  );
}

/** Compacte (i) naast DAG X · FASE; opent de sheet. */
export function V2CyclePhaseInfoButton({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  const { t } = useI18n();
  return (
    <V2InfoHint
      infoId="v2-propose-cycle-phase"
      expanded={open}
      onToggle={onToggle}
      expandLabel={t("cycle.infoSheetOpenAria")}
      collapseLabel={t("cycle.infoSheetCloseAria")}
      controlsId="v2-cycle-info-sheet"
    />
  );
}
