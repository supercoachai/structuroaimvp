"use client";

import Battery from "./Battery";
import { DAGSTART_ENERGIES, type DagstartTaskCard } from "./types";

type StepDoneProps = {
  picks: DagstartTaskCard[];
  onDashboard: () => void;
};

export default function StepDone({ picks, onDashboard }: StepDoneProps) {
  const total = picks.reduce((s, t) => s + t.minutes, 0);

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "var(--st-green)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 12px 28px -10px rgba(34,197,94,0.45)",
          marginBottom: 24,
        }}
        aria-hidden
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 12L10 17L19 7"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h1
        style={{
          fontSize: 26,
          fontWeight: 500,
          letterSpacing: "-0.022em",
          margin: "0 0 8px",
        }}
      >
        Dagstart afgerond.
      </h1>
      <p
        style={{
          fontSize: 14,
          color: "var(--st-muted)",
          margin: "0 0 28px",
          maxWidth: 280,
        }}
      >
        {picks.length === 0
          ? "Geen taken vandaag, ook een keuze."
          : `${picks.length} ${picks.length === 1 ? "taak" : "taken"} · ${total} min totaal.`}
      </p>

      {picks.length > 0 ? (
        <div
          style={{
            width: "100%",
            textAlign: "left",
            background: "var(--st-surface-2)",
            borderRadius: 16,
            border: "1px solid var(--st-line)",
            padding: 12,
            marginBottom: 28,
          }}
        >
          {picks.map((t, i) => {
            const e =
              DAGSTART_ENERGIES.find((x) => x.id === t.energy) ??
              DAGSTART_ENERGIES[1];
            return (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 8px",
                  borderBottom:
                    i < picks.length - 1
                      ? "1px solid var(--st-line)"
                      : "none",
                }}
              >
                <Battery level={e.level} color={e.color} size={18} />
                <span
                  style={{
                    flex: 1,
                    fontSize: 14,
                    color: "var(--st-ink)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.title}
                </span>
                <span
                  style={{
                    fontFamily: "var(--st-mono)",
                    fontSize: 11,
                    color: "var(--st-muted-2)",
                  }}
                >
                  {t.minutes}m
                </span>
              </div>
            );
          })}
        </div>
      ) : null}

      <button
        type="button"
        onClick={onDashboard}
        style={{
          all: "unset",
          cursor: "pointer",
          padding: "14px 32px",
          borderRadius: 999,
          background: "var(--st-blue)",
          color: "white",
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: "0.01em",
          boxShadow: "0 8px 22px -8px rgba(59,107,247,0.50)",
        }}
      >
        Naar dashboard →
      </button>
    </div>
  );
}
