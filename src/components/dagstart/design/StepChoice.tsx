"use client";

import {
  DAGSTART_ENERGIES,
  type DagstartEnergyId,
} from "./types";

type StepChoiceProps = {
  energy: DagstartEnergyId | null;
  onPick: (choice: "structuro" | "self") => void;
};

export default function StepChoice({ energy, onPick }: StepChoiceProps) {
  const meta = DAGSTART_ENERGIES.find((e) => e.id === energy);

  return (
    <div style={{ width: "100%" }}>
      <div className="ds-eyebrow">Vandaag</div>
      <h2 className="ds-title">Wie kiest je taken?</h2>
      <p className="ds-sub">
        Structuro voor je laten denken, of liever zelf swipen?
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginTop: 28,
        }}
      >
        <button
          type="button"
          onClick={() => onPick("structuro")}
          style={{
            all: "unset",
            cursor: "pointer",
            boxSizing: "border-box",
            padding: 20,
            borderRadius: 20,
            background: "var(--st-blue-haze)",
            border: "1px solid rgba(59,107,247,0.30)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            transition: "all 220ms",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px -4px rgba(59,107,247,0.30)",
            }}
            aria-hidden
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
                fill="#3B6BF7"
              />
            </svg>
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "#1E47D6",
                marginBottom: 4,
              }}
            >
              Structuro kiest
            </div>
            <div style={{ fontSize: 12, color: "var(--st-muted)" }}>
              {meta ? `Past bij ${meta.label.toLowerCase()}` : "Suggesties op maat"}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onPick("self")}
          style={{
            all: "unset",
            cursor: "pointer",
            boxSizing: "border-box",
            padding: 20,
            borderRadius: 20,
            background: "var(--st-surface-2)",
            border: "1px solid var(--st-line)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            transition: "all 220ms",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid var(--st-line)",
            }}
            aria-hidden
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect
                x="3"
                y="6"
                width="14"
                height="14"
                rx="2"
                stroke="#2C3753"
                strokeWidth="1.6"
                transform="rotate(-6 10 13)"
              />
              <rect
                x="6"
                y="4"
                width="14"
                height="14"
                rx="2"
                stroke="#2C3753"
                strokeWidth="1.6"
                fill="white"
                transform="rotate(6 13 11)"
              />
            </svg>
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--st-ink)",
                marginBottom: 4,
              }}
            >
              Ik kies zelf
            </div>
            <div style={{ fontSize: 12, color: "var(--st-muted)" }}>
              Swipe per taak
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
