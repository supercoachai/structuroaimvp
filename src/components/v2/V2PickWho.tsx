"use client";

import type { CSSProperties } from "react";

import { v2Styles } from "./theme";

type V2PickWhoProps = {
  energyLabel?: string;
  onStructuro: () => void;
  onSelf: () => void;
};

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  marginTop: 4,
};

const cardBase: CSSProperties = {
  minHeight: 140,
  padding: "18px 14px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  textAlign: "center",
};

function SparkIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
        fill="var(--accent)"
      />
    </svg>
  );
}

function SwipeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3"
        y="6"
        width="14"
        height="14"
        rx="2"
        stroke="var(--text)"
        strokeWidth="1.6"
        transform="rotate(-6 10 13)"
      />
      <rect
        x="6"
        y="4"
        width="14"
        height="14"
        rx="2"
        stroke="var(--text)"
        strokeWidth="1.6"
        fill="#FFFFFF"
        transform="rotate(6 13 11)"
      />
    </svg>
  );
}

/**
 * Wie kiest vandaag: Structuro of zelf swipen (zoals v1 dagstart StepChoice).
 */
export default function V2PickWho({
  energyLabel,
  onStructuro,
  onSelf,
}: V2PickWhoProps) {
  return (
    <>
      <h1 style={v2Styles.title}>Wie kiest je dingen?</h1>
      <p style={v2Styles.body}>
        Structuro voor je laten denken, of liever zelf swipen?
      </p>

      <div style={grid}>
        <button
          type="button"
          className="v2-choice"
          style={{
            ...cardBase,
            border: "1.5px solid var(--accent)",
            backgroundColor: "rgba(45, 90, 86, 0.06)",
          }}
          onClick={onStructuro}
        >
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              backgroundColor: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid var(--border)",
            }}
          >
            <SparkIcon />
          </span>
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
            Structuro kiest
          </span>
          <span style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.35 }}>
            {energyLabel
              ? `Past bij ${energyLabel.toLowerCase()}`
              : "Suggesties op maat"}
          </span>
        </button>

        <button
          type="button"
          className="v2-choice"
          style={cardBase}
          onClick={onSelf}
        >
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              backgroundColor: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid var(--border)",
            }}
          >
            <SwipeIcon />
          </span>
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
            Zelf swipen
          </span>
          <span style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.35 }}>
            Jij kiest per ding
          </span>
        </button>
      </div>
    </>
  );
}
