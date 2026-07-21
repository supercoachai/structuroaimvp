"use client";

import type { ReactNode } from "react";

import { v2Styles } from "./theme";
import { v2HasThings } from "./v2Things";

/** Klaar-scherm: "Klaar voor focus" + takenlijst + primaire CTA. */
export default function V2DoneStep({
  things,
  onContinue,
  continueLabel = "Naar je dag",
  secondary,
}: {
  things: string[];
  onContinue: () => void;
  continueLabel?: string;
  secondary?: ReactNode;
}) {
  const has = v2HasThings(things);
  return (
    <>
      <h1 style={v2Styles.title}>
        {has ? (
          <>
            Klaar voor <em className="v2-it">focus.</em>
          </>
        ) : (
          "Helemaal goed."
        )}
      </h1>
      <p style={{ ...v2Styles.body, marginBottom: 16 }}>
        {has ? "Dit is genoeg." : "Vandaag hoeft er niks."}
      </p>
      {has ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 8 }}>
          {things.map((t) => (
            <div key={t} className="v2-propose-task v2-propose-task--idle">
              <span className="v2-propose-task__chk" aria-hidden>
                ✓
              </span>
              <span className="v2-propose-task__lbl">{t}</span>
            </div>
          ))}
        </div>
      ) : null}
      <div style={v2Styles.actions}>
        <button type="button" className="btn-primary w-full" onClick={onContinue}>
          {continueLabel}
        </button>
        {secondary}
      </div>
    </>
  );
}
