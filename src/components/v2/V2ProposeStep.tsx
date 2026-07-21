"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

import CycleRing, {
  V2_ORB_PHASE_COLORS,
} from "@/components/dagstart/design/CycleRing";
import { resolveCurrentPhaseKey } from "@/components/dagstart/design/CyclusButton";
import { useI18n } from "@/lib/i18n";

import { V2_ENERGY_OPTIONS, type V2Energy } from "./V2Context";
import { useV2CycleChip, type V2CycleChipInfo } from "./V2CycleChip";
import V2CycleInfoSheet, {
  V2CyclePhaseInfoButton,
} from "./V2CycleInfoSheet";
import { v2Styles } from "./theme";
import { v2EnergyOrbColor } from "./v2EnergyMeta";

/**
 * Happy-path stap: energie-pills updaten voorstellen live, daarna één primary.
 * Met cyclus: flat orb + dunne fase-ring, DAG X · FASE + (i) sheet (Optie 2).
 */
export default function V2ProposeStep({
  energy,
  proposals,
  title,
  onPickEnergy,
  onConfirm,
  onAdjust,
  headerSlot,
  cycleInfo,
  confirmLabel = "Dit is goed",
  adjustLabel = "Zelf aanpassen",
}: {
  energy: V2Energy | null;
  proposals: string[];
  /** Optioneel. Default volgt energie-keuze (één lus, geen dual instructie). */
  title?: string;
  onPickEnergy: (energy: V2Energy) => void;
  onConfirm: () => void;
  onAdjust: () => void;
  headerSlot?: ReactNode;
  /** Bij opt-in + periodedata: orb-ring + fase-label + info-sheet. Geen chip. */
  cycleInfo?: V2CycleChipInfo | null;
  confirmLabel?: string;
  adjustLabel?: string;
}) {
  const { t } = useI18n();
  const [sheetOpen, setSheetOpen] = useState(false);
  /** Hook hier (lazy chunk) i.p.v. parent welcome-bundle: CycleRing blijft uit first paint. */
  const cycleFromContext = useV2CycleChip();
  const resolvedCycle = cycleInfo !== undefined ? cycleInfo : cycleFromContext;
  const canConfirm = energy != null && proposals.length > 0;
  const orbColor = v2EnergyOrbColor(energy);
  const hasCycle = resolvedCycle != null;
  const energyHint = energy
    ? V2_ENERGY_OPTIONS.find((o) => o.value === energy)?.hint
    : null;

  const resolvedTitle =
    title ??
    (energy ? "Dit stelt Structuro voor." : "Hoe zit je energie?");

  const phaseKey = hasCycle
    ? resolveCurrentPhaseKey(
        resolvedCycle.day,
        resolvedCycle.cycleLength,
        resolvedCycle.menstruationDuration,
      )
    : null;
  const phaseLabel = phaseKey
    ? t(`cycle.contextPhase_${phaseKey}`).toUpperCase()
    : null;
  const phaseAccent = phaseKey ? V2_ORB_PHASE_COLORS[phaseKey] : "#C4785A";

  return (
    <div className="v2-propose-step" style={wrapStyle}>
      {headerSlot ? (
        <div style={{ width: "100%", marginBottom: 8 }}>{headerSlot}</div>
      ) : null}

      <div
        className={`v2-energy-step__orb v2-energy-step__orb--flat${
          hasCycle ? " v2-energy-step__orb--cycle" : ""
        }`}
        style={
          {
            marginBottom: hasCycle ? 10 : 16,
            ["--v2-orb" as string]: orbColor,
          } as CSSProperties
        }
        aria-hidden
      >
        {hasCycle ? (
          <div className="v2-energy-step__cycle-ring">
            <CycleRing
              day={resolvedCycle.day}
              cycleLength={resolvedCycle.cycleLength}
              menstruationDuration={resolvedCycle.menstruationDuration}
              size={118}
              stroke={3.5}
              showIndicator={false}
              emphasizeActive
              colors={V2_ORB_PHASE_COLORS}
            />
          </div>
        ) : null}
        <span className="v2-energy-step__core" />
      </div>

      {hasCycle && phaseLabel ? (
        <div className="v2-propose-cycle-label">
          <span
            className="v2-propose-cycle-label__text"
            style={{ color: phaseAccent }}
          >
            {t("cycle.proposeDayPhase", {
              day: String(resolvedCycle.day),
              phase: phaseLabel,
            })}
          </span>
          <V2CyclePhaseInfoButton
            open={sheetOpen}
            onToggle={() => setSheetOpen((o) => !o)}
          />
        </div>
      ) : null}

      <h1 className="v2-propose-step__title">{resolvedTitle}</h1>

      {!energy ? (
        <p
          style={{
            ...v2Styles.body,
            fontSize: 13,
            marginTop: 6,
            marginBottom: 0,
            textAlign: "center",
            maxWidth: "28ch",
          }}
        >
          Tik wat klopt. Voorstellen volgen meteen.
        </p>
      ) : null}

      <div className="v2-propose-pills" role="group" aria-label="Energie">
        {V2_ENERGY_OPTIONS.map((opt) => {
          const active = energy === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              className="v2-propose-pill"
              aria-pressed={active}
              onClick={() => onPickEnergy(opt.value)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {energy && energyHint ? (
        <p
          style={{
            ...v2Styles.body,
            fontSize: 12,
            marginTop: 10,
            marginBottom: 0,
            textAlign: "center",
          }}
        >
          {energyHint}
        </p>
      ) : null}

      {energy ? (
        <>
          <div className="v2-propose-divider" aria-hidden />
          <div style={{ width: "100%" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {proposals.map((titleText, index) => (
                <div key={titleText} className="v2-propose-task" aria-label={titleText}>
                  <span className="v2-propose-task__mark" aria-hidden>
                    {index + 1}
                  </span>
                  <span className="v2-propose-task__lbl">{titleText}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...v2Styles.softActions, marginTop: 16, width: "100%" }}>
            <button
              type="button"
              className="btn-primary w-full"
              disabled={!canConfirm}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
            <button
              type="button"
              className="v2-link"
              onClick={onAdjust}
              disabled={!energy}
            >
              {adjustLabel}
            </button>
          </div>
        </>
      ) : null}

      {resolvedCycle ? (
        <V2CycleInfoSheet
          info={resolvedCycle}
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
        />
      ) : null}
    </div>
  );
}

const wrapStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  width: "100%",
  gap: 0,
};
