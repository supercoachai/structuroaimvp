"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { useI18n } from "@/lib/i18n";
import InfoButton from "@/components/info/InfoButton";
import {
  calculateDayInCycle,
} from "@/lib/cycle/calculatePhase";
import {
  buildCycleContextView,
  getActivePhaseStyle,
  type CyclePhaseKey,
} from "@/lib/cycle/cycleContextModel";
import { getCycleEnergyContext } from "@/lib/cycle/cycleDisplayContext";
import {
  getEnergyPhaseMatch,
  type EnergyLevel,
} from "@/lib/cycle/getEnergyPhaseMatch";
import type { CycleProfile } from "@/lib/cycle/types";

export type CycleEnergyContextProps = {
  consentOn: boolean;
  profile: CycleProfile;
  /** Onboarding: geen uitklapbare fase-legend, statische footnote. */
  onboardingCompact?: boolean;
  /** Gekozen energie voor observatie-tag (geen sturing). */
  chosenEnergy?: EnergyLevel | null;
  /** Onboarding: ring draait één keer rond bij verschijnen. */
  ringIntroSpin?: boolean;
  /** Onboarding: footnote pas na ring-animatie tonen. */
  onboardingFootnoteVisible?: boolean;
  onboardingFootnoteFadeIn?: boolean;
  /** Onboarding: 1=ring, 2=header, 3=fase, 4=bio (undefined = alles tonen). */
  onboardingRevealPart?: number;
};

function phaseRangeLabel(
  start: number,
  end: number,
  t: (key: string, vars?: Record<string, string>) => string
): string {
  if (start === end) {
    return t("cycle.contextRangeSingle", { day: String(start) });
  }
  return t("cycle.contextRange", { start: String(start), end: String(end) });
}

function CycleContextRing({
  day,
  view,
  introSpin = false,
}: {
  day: number;
  view: ReturnType<typeof buildCycleContextView>;
  introSpin?: boolean;
}) {
  const { indicator, ringSegments } = view;
  const active = getActivePhaseStyle(view.phases, view.activePhase);

  return (
    <svg
      width="66"
      height="66"
      viewBox="0 0 66 66"
      className={`block overflow-visible ${introSpin ? "ob-cycle-ring-spin-once" : ""}`}
      aria-hidden
    >
      <circle
        cx="33"
        cy="33"
        r="28.5"
        fill="none"
        stroke="rgba(26,35,64,0.05)"
        strokeWidth="9"
      />
      <g transform="rotate(-90 33 33)">
        {ringSegments.map((seg, i) => (
          <circle
            key={i}
            cx="33"
            cy="33"
            r="28.5"
            fill="none"
            stroke={seg.color}
            strokeWidth="9"
            strokeDasharray={seg.dasharray}
            strokeDashoffset={seg.dashoffset}
          />
        ))}
      </g>
      <circle
        cx={indicator.cx}
        cy={indicator.cy}
        r="6.5"
        fill="white"
        stroke="rgba(14,23,48,0.12)"
        strokeWidth="1"
      />
      <circle cx={indicator.cx} cy={indicator.cy} r="3.2" fill={active.color} />
      <text
        x="33"
        y="34"
        textAnchor="middle"
        dominantBaseline="middle"
        className="st-mono fill-[var(--st-ink)] text-[14px] font-semibold tracking-tight"
      >
        {day}
      </text>
    </svg>
  );
}

/** Cyclus-context op dagstart (stap 1), alleen bij actieve cyclus-tracking. */
export default function CycleEnergyContext({
  consentOn,
  profile,
  onboardingCompact = false,
  chosenEnergy = null,
  ringIntroSpin = false,
  onboardingFootnoteVisible = true,
  onboardingFootnoteFadeIn = false,
  onboardingRevealPart,
}: CycleEnergyContextProps) {
  const { t } = useI18n();
  const [introPulse, setIntroPulse] = useState(!ringIntroSpin);
  const ctx = useMemo(
    () => getCycleEnergyContext(consentOn, profile),
    [consentOn, profile]
  );

  useEffect(() => {
    if (ringIntroSpin) {
      setIntroPulse(false);
      return;
    }
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIntroPulse(false);
      return;
    }
    const timer = window.setTimeout(() => setIntroPulse(false), 2400);
    return () => window.clearTimeout(timer);
  }, [ringIntroSpin]);

  if (ctx.kind === "none") return null;

  if (ctx.kind === "active_only") {
    return (
      <div
        className={`st-cycle-card st-cycle-card--setup ${introPulse ? "st-cycle-context-pulse" : ""}`}
      >
        <p className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--st-ink)]">
          {t("cycle.energyContextTrackingActive")}
          <InfoButton infoId="cyclus" />
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--st-muted)]">
          {t("cycle.energyContextTip_active_only")}
        </p>
      </div>
    );
  }

  const startDate = new Date(`${profile.lastPeriodStart}T00:00:00`);
  const dayInCycle =
    calculateDayInCycle(startDate, profile.averageLength) ?? ctx.dayInCycle;
  const view = buildCycleContextView(
    dayInCycle,
    profile.averageLength,
    profile.menstruationDuration
  );
  const active = getActivePhaseStyle(view.phases, view.activePhase);
  const phaseKey = view.activePhase as CyclePhaseKey;

  const energyMatch = chosenEnergy
    ? getEnergyPhaseMatch(phaseKey, chosenEnergy)
    : null;

  const matchTagStyle = energyMatch
    ? energyMatch.match === "match"
      ? {
          background: "rgba(16,185,129,0.12)",
          color: "#047857",
          border: "1px solid rgba(16,185,129,0.35)",
        }
      : energyMatch.match === "soft-mismatch"
        ? {
            background: "rgba(245,158,11,0.12)",
            color: "#B45309",
            border: "1px solid rgba(245,158,11,0.35)",
          }
        : {
            background: "rgba(244,63,94,0.1)",
            color: "#BE123C",
            border: "1px solid rgba(244,63,94,0.3)",
          }
    : null;

  const matchTagLabel = energyMatch
    ? energyMatch.match === "match"
      ? t("cycle.energyMatchTag_match")
      : energyMatch.match === "strong-mismatch"
        ? t("cycle.energyMatchTag_strong")
        : energyMatch.direction === "higher"
          ? t("cycle.energyMatchTag_softHigher")
          : t("cycle.energyMatchTag_softLower")
    : null;

  const cardStyle = {
    "--st-cycle-color": active.color,
    "--st-cycle-tint": active.tint,
  } as CSSProperties;

  const stagedOnboarding =
    onboardingCompact && typeof onboardingRevealPart === "number";
  const showRing = !stagedOnboarding || onboardingRevealPart >= 1;
  const showHeader = !stagedOnboarding || onboardingRevealPart >= 2;
  const showPhase = !stagedOnboarding || onboardingRevealPart >= 3;
  const showBio = !stagedOnboarding || onboardingRevealPart >= 4;

  return (
    <div
      className={`st-cycle-card ${introPulse ? "st-cycle-context-pulse" : ""}${
        onboardingCompact ? " st-cycle-card--onboarding" : ""
      }`}
      style={cardStyle}
    >
      <div className="st-cycle-head">
        {showRing ? (
          <div className={`st-cycle-ring${stagedOnboarding ? " ob-cycle-part-in" : ""}`}>
            <CycleContextRing day={view.day} view={view} introSpin={ringIntroSpin} />
          </div>
        ) : (
          <div className="st-cycle-ring w-[66px] shrink-0" aria-hidden />
        )}
        <div className="st-cycle-info">
          {showHeader ? (
            <div className={`st-cycle-row${stagedOnboarding ? " ob-cycle-part-in" : ""}`}>
              <span className="st-cycle-eyebrow inline-flex items-center gap-1">
                {t("cycle.contextEyebrow")}
                <InfoButton infoId="cyclus" />
              </span>
              <span className="st-cycle-day st-mono">
                {t("cycle.contextDayCounter", {
                  day: String(view.day),
                  length: String(view.length),
                })}
              </span>
            </div>
          ) : null}
          {showPhase ? (
            <div className={`st-cycle-phase${stagedOnboarding ? " ob-cycle-part-in" : ""}`}>
              <span className="st-cycle-phase-name">
                <span className="st-cycle-dot" aria-hidden />
                {t(`cycle.contextPhase_${phaseKey}`)}
              </span>
              <span className="st-cycle-range st-mono">
                {phaseRangeLabel(active.start, active.end, t)}
              </span>
            </div>
          ) : null}
          {showBio ? (
            <p className={`st-cycle-bio${stagedOnboarding ? " ob-cycle-part-in" : ""}`}>
              {t(`cycle.contextBio_${phaseKey}`)}
            </p>
          ) : null}
        </div>
      </div>

      {onboardingCompact ? (
        <>
          {energyMatch && matchTagLabel && matchTagStyle ? (
            <div className="st-cycle-onboarding-match">
              <span className="st-cycle-advice-chip" style={matchTagStyle}>
                {matchTagLabel}
              </span>
            </div>
          ) : null}
          {onboardingFootnoteVisible ? (
            <p
              className={`st-cycle-card--onboarding-footnote${
                onboardingFootnoteFadeIn ? " ob-cycle-footnote-fade-in" : ""
              }`}
            >
              {t("cycle.contextOnboardingLegendNote")}
            </p>
          ) : null}
        </>
      ) : (
        <>
          <div className="st-cycle-advice">
            <span className="st-cycle-advice-text">{t(`cycle.contextAdvice_${phaseKey}`)}</span>
            {energyMatch && matchTagLabel && matchTagStyle ? (
              <span className="st-cycle-advice-chip" style={matchTagStyle}>
                {matchTagLabel}
              </span>
            ) : (
              <span className="st-cycle-advice-chip">{t(`cycle.contextChip_${phaseKey}`)}</span>
            )}
          </div>

          <details className="st-cycle-disclosure">
        <summary>
          <span className="st-cycle-summary-shut">{t("cycle.contextLegendExpand")}</span>
          <span className="st-cycle-summary-open">{t("cycle.contextLegendCollapse")}</span>
          <svg className="st-cycle-chev" width="9" height="9" viewBox="0 0 10 10" aria-hidden>
            <path
              d="M1 3l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </summary>
        <div className="st-cycle-legend">
          {view.phases.map((phase) => {
            const isActive = phase.key === view.activePhase;
            return (
              <div
                key={phase.key}
                className={`st-cycle-legend-row${isActive ? " is-active" : ""}`}
                style={
                  {
                    "--row-color": phase.color,
                    "--row-tint": phase.tint,
                  } as React.CSSProperties
                }
              >
                <span className="st-cycle-dot" aria-hidden />
                <span className="st-cycle-legend-name">
                  {t(`cycle.contextPhase_${phase.key}`)}
                </span>
                <span className="st-cycle-legend-range st-mono">
                  {phaseRangeLabel(phase.start, phase.end, t)}
                </span>
                <span className="st-cycle-legend-advice">
                  {t(`cycle.contextAdvice_${phase.key}`)}
                </span>
              </div>
            );
          })}
          <p className="st-cycle-legend-note">{t("cycle.contextLegendNote")}</p>
        </div>
      </details>
        </>
      )}
    </div>
  );
}
