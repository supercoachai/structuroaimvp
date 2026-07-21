"use client";

import { useMemo, useState, type CSSProperties } from "react";

import CycleRing, {
  getCyclePhaseColor,
} from "@/components/dagstart/design/CycleRing";
import { resolveCurrentPhaseKey } from "@/components/dagstart/design/CyclusButton";
import { calculateDayInCycle } from "@/lib/cycle/calculatePhase";
import { useI18n } from "@/lib/i18n";

import { useV2 } from "./V2Context";
import { patchV2Settings, readV2Settings } from "./v2Settings";
import { todayYmd } from "./v2Tasks";
import { v2Styles } from "./theme";

export type V2CycleChipInfo = {
  day: number;
  cycleLength: number;
  menstruationDuration: number;
};

/** Bij opt-in zonder periodestart: vandaag als start, zodat het rondje meteen zichtbaar is. */
export function ensureV2CyclePeriodStart(): string {
  const settings = readV2Settings();
  if (settings.lastPeriodStart) return settings.lastPeriodStart;
  const today = todayYmd();
  patchV2Settings({ lastPeriodStart: today });
  return today;
}

/** Cyclus-chip tonen alleen bij opt-in én bekende periodestart. Nooit standaard. */
export function getV2CycleChipInfo(cyclusOptIn: boolean): V2CycleChipInfo | null {
  if (!cyclusOptIn) return null;
  const settings = readV2Settings();
  if (!settings.lastPeriodStart) return null;
  const startDate = new Date(`${settings.lastPeriodStart}T00:00:00`);
  if (Number.isNaN(startDate.getTime())) return null;
  const day = calculateDayInCycle(startDate, settings.cycleLength);
  if (day == null) return null;
  return {
    day,
    cycleLength: settings.cycleLength,
    menstruationDuration: settings.menstruationDuration,
  };
}

const HINT_KEY = "structuro.v2CyclusHintSeen";

function readHintSeen(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(HINT_KEY) === "true";
  } catch {
    return true;
  }
}

type V2CycleChipProps = {
  info: V2CycleChipInfo;
  /**
   * absolute = rustig rechtsboven in de energiestap (aanbevolen).
   * inline = in de flow, uitgelijnd rechts (boven pills / propose-header).
   */
  variant?: "inline" | "absolute";
};

/**
 * Compact cyclus-rondje. Op de energiestap: variant="absolute" (niet boven de begroeting).
 */
export default function V2CycleChip({
  info,
  variant = "absolute",
}: V2CycleChipProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [hintSeen, setHintSeen] = useState<boolean>(() => readHintSeen());

  const phaseKey = resolveCurrentPhaseKey(
    info.day,
    info.cycleLength,
    info.menstruationDuration,
  );
  const color = getCyclePhaseColor(phaseKey);

  /** Energy-context tip (zelfde copy als vroeger boven de orb), alleen in expand. */
  const energyTipKey =
    phaseKey === "luteal"
      ? "cycle.energyContextTip_luteal_late"
      : (`cycle.energyContextTip_${phaseKey}` as const);

  const phaseInfo = useMemo(
    () => ({
      color,
      label: t(`cycle.contextPhase_${phaseKey}`),
      bio: t(`cycle.contextBio_${phaseKey}`),
      tip: t(energyTipKey),
    }),
    [color, energyTipKey, phaseKey, t],
  );

  const handleToggle = () => {
    if (!hintSeen) {
      try {
        window.localStorage.setItem(HINT_KEY, "true");
      } catch {
        /* ignore */
      }
      setHintSeen(true);
    }
    setOpen((o) => !o);
  };

  const chipBtn: CSSProperties = {
    all: "unset",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 12px 6px 7px",
    borderRadius: 999,
    background: open ? `${color}14` : "rgba(255,255,255,0.92)",
    border: `1px solid ${open ? `${color}40` : "var(--border)"}`,
    transition: "background 200ms ease, border-color 200ms ease",
    position: "relative",
    boxShadow: "0 1px 2px rgba(26, 26, 27, 0.06)",
  };

  const rootStyle: CSSProperties =
    variant === "absolute"
      ? {
          position: "absolute",
          top: 4,
          right: 0,
          zIndex: 5,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 8,
          maxWidth: "min(280px, calc(100% - 8px))",
        }
      : {
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          width: "100%",
          margin: "0 0 4px",
          gap: 8,
        };

  return (
    <div style={rootStyle}>
      <button
        type="button"
        onClick={handleToggle}
        style={chipBtn}
        aria-expanded={open}
        aria-label={t("cycle.dagstartCyclusButtonAria", {
          day: String(info.day),
        })}
        title={!hintSeen ? t("cycle.dagstartCyclusHint") : undefined}
      >
        <CycleRing
          day={info.day}
          cycleLength={info.cycleLength}
          menstruationDuration={info.menstruationDuration}
          size={26}
          stroke={4}
        />
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: open ? color : "var(--text-muted)",
            whiteSpace: "nowrap",
          }}
        >
          Dag {info.day}
        </span>
        {!hintSeen ? (
          <span
            style={{
              position: "absolute",
              top: -3,
              right: -3,
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9.5,
              fontWeight: 700,
              color: "#fff",
              fontStyle: "italic",
              boxShadow: "0 0 0 2px #fff",
            }}
            aria-hidden
          >
            i
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          style={{
            width: variant === "absolute" ? "min(280px, 72vw)" : "100%",
            maxWidth: 320,
            textAlign: "left",
            padding: 14,
            borderRadius: 14,
            background: `${phaseInfo.color}14`,
            border: `1px solid ${phaseInfo.color}30`,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: phaseInfo.color,
              }}
              aria-hidden
            />
            <strong
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text)",
              }}
            >
              {phaseInfo.label}
            </strong>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {t("cycle.contextDayCounter", {
                day: String(info.day),
                length: String(info.cycleLength),
              })}
            </span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {"· "}
              {phaseInfo.bio}
            </span>
          </div>
          <p style={{ ...v2Styles.body, fontSize: 13, margin: 0 }}>
            {phaseInfo.tip}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** Chip-info als cyclus aan staat. Wacht tot localStorage hydrated is. */
export function useV2CycleChip(): V2CycleChipInfo | null {
  const { state, ready } = useV2();
  return useMemo(() => {
    if (!ready || !state.cyclusOptIn) return null;
    return getV2CycleChipInfo(true);
  }, [ready, state.cyclusOptIn]);
}
