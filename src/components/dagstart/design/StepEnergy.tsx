"use client";

import { useMemo, useState } from "react";
import Battery from "./Battery";
import CyclusButton, { resolveCurrentPhaseKey } from "./CyclusButton";
import { getCyclePhaseColor } from "./CycleRing";
import { useSupportsHover } from "@/hooks/useSupportsHover";
import { DAGSTART_ENERGIES, type DagstartEnergyId } from "./types";

type CyclusInfo = {
  day: number;
  cycleLength: number;
  menstruationDuration: number;
} | null;

type StepEnergyProps = {
  userName: string | null;
  greeting: string;
  energy: DagstartEnergyId | null;
  cyclus: CyclusInfo;
  onPick: (id: DagstartEnergyId) => void;
};

const PHASE_LABEL: Record<string, string> = {
  menstrual: "Menstruatie",
  follicular: "Folliculair",
  ovulation: "Ovulatie",
  luteal: "Luteaal",
};

const PHASE_BIO: Record<string, string> = {
  menstrual: "Lage dopamine, lage energie",
  follicular: "Stijgende oestrogeen, herstellende focus",
  ovulation: "Piek dopamine, hoogste helderheid",
  luteal: "Dalende oestrogeen, brain fog mogelijk",
};

const PHASE_ADVICE: Record<string, string> = {
  menstrual: "Wees lief voor jezelf. Pak één kleine taak op, niet meer.",
  follicular: "Goede dag voor gewone capaciteit. Bouw rustig op.",
  ovulation: "Ruimte voor iets zwaars. Pak die taak die je al uitstelt.",
  luteal: "Minder forceren. Kies kleine, concrete stappen.",
};

export default function StepEnergy({
  userName,
  greeting,
  energy,
  cyclus,
  onPick,
}: StepEnergyProps) {
  const meta = DAGSTART_ENERGIES.find((e) => e.id === energy);
  const color = meta ? meta.color : "#F59E0B";
  const [cyclusOpen, setCyclusOpen] = useState(false);
  const [hoveredEnergy, setHoveredEnergy] = useState<DagstartEnergyId | null>(null);
  const supportsHover = useSupportsHover();

  const phaseInfo = useMemo(() => {
    if (!cyclus) return null;
    const key = resolveCurrentPhaseKey(
      cyclus.day,
      cyclus.cycleLength,
      cyclus.menstruationDuration
    );
    return {
      key,
      color: getCyclePhaseColor(key),
      label: PHASE_LABEL[key],
      bio: PHASE_BIO[key],
      advice: PHASE_ADVICE[key],
    };
  }, [cyclus]);

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
      }}
    >
      {cyclus ? (
        <div
          style={{ position: "absolute", top: -4, right: 0, zIndex: 5 }}
        >
          <CyclusButton
            day={cyclus.day}
            cycleLength={cyclus.cycleLength}
            menstruationDuration={cyclus.menstruationDuration}
            open={cyclusOpen}
            onToggle={() => setCyclusOpen((o) => !o)}
          />
        </div>
      ) : null}

      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--st-muted-2)",
          marginBottom: 6,
        }}
      >
        {greeting}
      </div>
      {userName ? (
        <div
          style={{
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: "-0.02em",
            marginBottom: 24,
          }}
        >
          {userName}
        </div>
      ) : (
        <div style={{ marginBottom: 24 }} />
      )}

      <div
        style={{
          width: 200,
          height: 200,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 28,
        }}
        aria-hidden
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: `1px solid ${color}28`,
            animation: "ds-breathe-out 6s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 26,
            borderRadius: "50%",
            border: `1px solid ${color}40`,
            animation: "ds-breathe-out 6s ease-in-out infinite",
            animationDelay: "0.4s",
          }}
        />
        <div
          style={{
            width: 110,
            height: 110,
            borderRadius: "50%",
            background: `radial-gradient(circle at 35% 30%, ${color}60, ${color}20 55%, transparent 75%)`,
            animation: "ds-breathe-core 6s ease-in-out infinite",
            transition: "background 600ms ease",
          }}
        />
      </div>

      <h2 className="ds-title" style={{ marginBottom: 24 }}>
        Hoe is je energie?
      </h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        {DAGSTART_ENERGIES.map((e) => {
          const active = energy === e.id;
          const hovered = supportsHover && hoveredEnergy === e.id;
          const highlighted = active || hovered;
          const filledBars = supportsHover ? (highlighted ? e.level : 0) : e.level;
          return (
            <button
              key={e.id}
              type="button"
              className="ds-energy-pill"
              data-energy={e.id}
              onClick={() => onPick(e.id)}
              onMouseEnter={supportsHover ? () => setHoveredEnergy(e.id) : undefined}
              onMouseLeave={supportsHover ? () => setHoveredEnergy(null) : undefined}
              onFocus={supportsHover ? () => setHoveredEnergy(e.id) : undefined}
              onBlur={supportsHover ? () => setHoveredEnergy(null) : undefined}
              aria-pressed={active}
            >
              <span className="ds-energy-pill-battery">
                <Battery
                  level={e.level}
                  filledBars={filledBars}
                  color={highlighted ? e.color : "#ABB3C5"}
                  mutedColor="#ABB3C5"
                  size={20}
                  animated={hovered && !active}
                />
              </span>
              <span className="ds-energy-pill-label">{e.label}</span>
            </button>
          );
        })}
      </div>

      {cyclusOpen && phaseInfo && cyclus ? (
        <div
          style={{
            marginTop: 24,
            width: "100%",
            padding: 16,
            borderRadius: 16,
            background: `${phaseInfo.color}14`,
            border: `1px solid ${phaseInfo.color}30`,
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
                color: "var(--st-ink)",
              }}
            >
              {phaseInfo.label}
            </strong>
            <span
              style={{
                fontFamily: "var(--st-mono)",
                fontSize: 11,
                color: "var(--st-muted-2)",
              }}
            >
              Dag {cyclus.day}/{cyclus.cycleLength}
            </span>
            <span style={{ fontSize: 11, color: "var(--st-muted-2)" }}>
              {"\u00b7 "}
              {phaseInfo.bio}
            </span>
          </div>
          <div
            style={{
              fontSize: 13,
              color: "var(--st-ink-soft)",
              lineHeight: 1.5,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: phaseInfo.color,
                marginRight: 8,
              }}
            >
              Structuro
            </span>
            {phaseInfo.advice}
          </div>
        </div>
      ) : null}
    </div>
  );
}
