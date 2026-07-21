"use client";

import { useEffect, useId, useMemo } from "react";

import { resolveCurrentPhaseKey } from "@/components/dagstart/design/CyclusButton";
import {
  getCyclePhaseColor,
} from "@/components/dagstart/design/CycleRing";
import type { CyclePhaseKey } from "@/lib/cycle/cyclePhaseRanges";
import { useI18n } from "@/lib/i18n";

import type { V2CycleChipInfo } from "./V2CycleChip";
import V2InfoHint from "./V2InfoHint";

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

function SheetIcon({ kind }: { kind: "meaning" | "plan" | "private" }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 18 18",
    fill: "none",
    "aria-hidden": true as const,
  };
  if (kind === "meaning") {
    return (
      <svg {...common}>
        <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M6.2 9.2c.6-1.4 1.6-2.2 2.8-2.2s2.2.8 2.8 2.2"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (kind === "plan") {
    return (
      <svg {...common}>
        <rect
          x="3.5"
          y="4"
          width="11"
          height="10"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          d="M6 2.8v2.4M12 2.8v2.4M3.5 7.5h11"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect
        x="5"
        y="8"
        width="8"
        height="6.5"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M6.5 8V6.2a2.5 2.5 0 0 1 5 0V8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

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
  const titleId = useId();
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
  /** Concept + chip-tip (tip niet meer permanent boven de orb). */
  const meaningBody = `${t(`cycle.infoSheetMeaning_${phaseKey}`)} ${t(tipKey)}`;

  const rows = useMemo(
    () => [
      {
        key: "meaning" as const,
        title: t("cycle.infoSheetMeaningTitle"),
        body: meaningBody,
      },
      {
        key: "plan" as const,
        title: t("cycle.infoSheetPlanTitle"),
        body: t("cycle.infoSheetPlanBody"),
      },
      {
        key: "private" as const,
        title: t("cycle.infoSheetPrivateTitle"),
        body: t("cycle.infoSheetPrivateBody"),
      },
    ],
    [meaningBody, t],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="v2-cycle-sheet" role="presentation">
      <button
        type="button"
        className="v2-cycle-sheet__backdrop"
        aria-label={t("cycle.infoSheetCloseAria")}
        onClick={onClose}
      />
      <div
        id="v2-cycle-info-sheet"
        className="v2-cycle-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <p className="v2-cycle-sheet__eyebrow">
          {t("cycle.infoSheetEyebrow", {
            day: String(info.day),
            length: String(info.cycleLength),
          })}
        </p>
        <h2 id={titleId} className="v2-cycle-sheet__title">
          {phaseTitle}
        </h2>

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

        <ul className="v2-cycle-sheet__rows">
          {rows.map((row) => (
            <li key={row.key} className="v2-cycle-sheet__row">
              <span className="v2-cycle-sheet__row-icon" aria-hidden>
                <SheetIcon kind={row.key} />
              </span>
              <div className="v2-cycle-sheet__row-copy">
                <strong>{row.title}</strong>
                <p>{row.body}</p>
              </div>
            </li>
          ))}
        </ul>

        <button type="button" className="btn-primary w-full" onClick={onClose}>
          {t("cycle.infoSheetGotIt")}
        </button>
      </div>
    </div>
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
