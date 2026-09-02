"use client";

import { useState, type CSSProperties } from "react";

import CycleRing, {
  V2_ORB_PHASE_COLORS,
} from "@/components/dagstart/design/CycleRing";
import { resolveCurrentPhaseKey } from "@/components/dagstart/design/CyclusButton";
import { useI18n } from "@/lib/i18n";

import { useV2, V2_ENERGY_OPTIONS, type V2Energy } from "./V2Context";
import {
  ensureV2CyclePeriodStart,
  useV2CycleChip,
  type V2CycleChipInfo,
} from "./V2CycleChip";
import V2CycleDiscoverSheet, {
  V2CycleDiscoverHint,
} from "./V2CycleDiscoverSheet";
import V2CycleInfoSheet, {
  V2CyclePhaseInfoButton,
} from "./V2CycleInfoSheet";
import type { V2CycleSetupValues } from "./V2CycleSetupFields";
import { trackV2OnboardingCycle } from "./v2OnboardingFunnel";
import { patchV2Settings } from "./v2Settings";
import { V2SheetPortal } from "./v2SheetPortal";
import { v2Styles } from "./theme";
import { v2EnergyOrbColor } from "./v2EnergyMeta";
import { v2EnrichThingProposals } from "./v2Things";
import V2TaskBattery from "./V2TaskBattery";

/**
 * Happy-path stap: energie-pills updaten voorstellen live, daarna één primary.
 * Met cyclus: flat orb + dunne fase-ring, DAG X · FASE + (i) sheet (Optie 2).
 * Guest-onboarding: soft “Eenmalig instellen” onderaan i.p.v. Zonder/Cyclus-toggle.
 */
export default function V2ProposeStep({
  energy,
  proposals,
  title,
  onPickEnergy,
  onConfirm,
  onAdjust,
  onTypeOwn,
  cycleInfo,
  showCycleDiscover = false,
  confirmLabel,
  adjustLabel,
  showProposals = true,
  showOwnTasksHint = true,
  showAdjust = true,
}: {
  energy: V2Energy | null;
  proposals: string[];
  /** Optioneel. Default volgt energie-keuze (één lus, geen dual instructie). */
  title?: string;
  onPickEnergy: (energy: V2Energy) => void;
  onConfirm: () => void;
  onAdjust: () => void;
  /** Dagstart met account: typ een eigen taak i.p.v. alleen later in de app. */
  onTypeOwn?: () => void;
  /** Bij opt-in + periodedata: orb-ring + fase-label + info-sheet. Geen chip. */
  cycleInfo?: V2CycleChipInfo | null;
  /** Guest-onboarding: soft cyclus-discovery onderaan. Niet op dagstart/landing. */
  showCycleDiscover?: boolean;
  confirmLabel?: string;
  adjustLabel?: string;
  /** false: alleen energie + CTA (onboarding eigen-taak pad). */
  showProposals?: boolean;
  showOwnTasksHint?: boolean;
  showAdjust?: boolean;
}) {
  const { t } = useI18n();
  const { state, update } = useV2();
  const [phaseSheetOpen, setPhaseSheetOpen] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [discoverHidden, setDiscoverHidden] = useState(false);
  const cycleFromContext = useV2CycleChip();
  const resolvedCycle = cycleInfo !== undefined ? cycleInfo : cycleFromContext;
  const canConfirm =
    energy != null && (showProposals ? proposals.length > 0 : true);
  const orbColor = v2EnergyOrbColor(energy);
  const hasCycle = resolvedCycle != null;
  const energyHint = energy ? t(`v2.energyHint${energy === "low" ? "Low" : energy === "high" ? "High" : "Enough"}`) : null;
  const proposalRows = v2EnrichThingProposals(proposals);
  // Hint blijft beschikbaar na Aan (om weer Uit te zetten); alleen Nee dismiss’t.
  const showDiscover = showCycleDiscover && !discoverHidden;

  const resolvedTitle =
    title ??
    (energy && showProposals
      ? t("v2.proposeSuggests")
      : t("v2.proposeHowEnergy"));
  const resolvedConfirm = confirmLabel ?? t("v2.proposeConfirm");
  const resolvedAdjust = adjustLabel ?? t("v2.proposeAdjust");

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

  const setCycleMode = (on: boolean) => {
    if (on === state.cyclusOptIn) return;
    if (!on) {
      setPhaseSheetOpen(false);
    } else {
      // Zelfde als settings: zonder periodestart geen ring/fase. Defaults tot Klaar.
      ensureV2CyclePeriodStart();
    }
    // Elke bewuste keuze (aan of uit) = niet later opnieuw op home vragen.
    // Setup-velden in de sheet overschrijven de tijdelijke start bij Klaar.
    patchV2Settings({ cycleOptInPromptDismissed: true });
    update({ cyclusOptIn: on });
    trackV2OnboardingCycle({ optedIn: on });
  };

  const enableCycleFromDiscover = () => {
    setCycleMode(true);
  };

  const disableCycleFromDiscover = () => {
    setCycleMode(false);
  };

  const confirmCycleSetupFromDiscover = (values: V2CycleSetupValues) => {
    patchV2Settings({
      lastPeriodStart: values.lastPeriodStart,
      cycleLength: values.cycleLength,
      menstruationDuration: values.menstruationDuration,
      cycleOptInPromptDismissed: true,
    });
    if (!state.cyclusOptIn) {
      update({ cyclusOptIn: true });
      trackV2OnboardingCycle({ optedIn: true });
    }
    // Zorg dat ring/fase meteen de bevestigde data tonen (event + opt-in).
    ensureV2CyclePeriodStart();
  };

  const dismissDiscover = () => {
    setDiscoverOpen(false);
    setDiscoverHidden(true);
    patchV2Settings({ cycleOptInPromptDismissed: true });
    trackV2OnboardingCycle({ optedIn: false });
  };

  const hasProposalList = showProposals && proposalRows.length > 0;

  return (
    <div
      className={`v2-propose-step${showDiscover ? " v2-propose-step--discover" : ""}${
        hasProposalList ? " v2-propose-step--proposals" : ""
      }`}
      style={wrapStyle}
    >
      <div className="v2-propose-step__body">
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
              open={phaseSheetOpen}
              onToggle={() => setPhaseSheetOpen((o) => !o)}
            />
          </div>
        ) : null}

        <h1 className="v2-propose-step__title">{resolvedTitle}</h1>

        {!energy ? (
          <p className="v2-propose-step__tap-hint">{t("v2.proposeTapHint")}</p>
        ) : null}

        <div
          className="v2-propose-pills"
          role="group"
          aria-label={t("v2.proposeEnergyAria")}
        >
          {V2_ENERGY_OPTIONS.map((opt) => {
            const active = energy === opt.value;
            const labelKey =
              opt.value === "low"
                ? "v2.energyLow"
                : opt.value === "high"
                  ? "v2.energyHigh"
                  : "v2.energyEnough";
            return (
              <button
                key={opt.value}
                type="button"
                className="v2-propose-pill"
                aria-pressed={active}
                onClick={() => onPickEnergy(opt.value)}
              >
                {t(labelKey)}
              </button>
            );
          })}
        </div>

        {energy && energyHint ? (
          <p className="v2-propose-step__hint">{energyHint}</p>
        ) : null}

        {hasProposalList ? (
          <>
            <div className="v2-propose-divider" aria-hidden />
            <div style={{ width: "100%" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {proposalRows.map((row, index) => (
                  <div
                    key={row.title}
                    className="v2-propose-task"
                    aria-label={row.title}
                  >
                    <span className="v2-propose-task__mark" aria-hidden>
                      {index + 1}
                    </span>
                    <V2TaskBattery energy={row.energy} size={18} />
                    <span className="v2-propose-task__lbl">{row.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {energy ? (
        <div className="v2-propose-step__footer">
          <button
            type="button"
            className="btn-primary w-full"
            disabled={!canConfirm}
            onClick={onConfirm}
          >
            {resolvedConfirm}
          </button>
          {showAdjust ? (
            <button
              type="button"
              className="v2-link"
              onClick={onAdjust}
              disabled={!energy}
            >
              {resolvedAdjust}
            </button>
          ) : null}
          {onTypeOwn ? (
            <button
              type="button"
              className="v2-link"
              onClick={onTypeOwn}
              disabled={!energy}
            >
              {t("v2.proposeTypeOwn")}
            </button>
          ) : showOwnTasksHint ? (
            <p className="v2-propose-step__own-hint">
              {t("v2.proposeOwnTasksHint")}
            </p>
          ) : null}
        </div>
      ) : null}

      {showDiscover ? (
        <V2SheetPortal>
          <div className="v2-propose-step__discover">
            <V2CycleDiscoverHint
              optedIn={state.cyclusOptIn}
              onOpen={() => setDiscoverOpen(true)}
            />
          </div>
        </V2SheetPortal>
      ) : null}

      {resolvedCycle ? (
        <V2CycleInfoSheet
          info={resolvedCycle}
          open={phaseSheetOpen}
          onClose={() => setPhaseSheetOpen(false)}
        />
      ) : null}

      {showDiscover ? (
        <V2CycleDiscoverSheet
          open={discoverOpen}
          enabled={state.cyclusOptIn}
          onClose={() => setDiscoverOpen(false)}
          onEnable={enableCycleFromDiscover}
          onDisable={disableCycleFromDiscover}
          onNotNow={dismissDiscover}
          onConfirmSetup={confirmCycleSetupFromDiscover}
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
  flex: 1,
  minHeight: 0,
  height: "100%",
  gap: 0,
};
