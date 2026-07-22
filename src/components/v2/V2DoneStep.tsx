"use client";

import type { ReactNode } from "react";

import { useI18n } from "@/lib/i18n";

import { v2Styles } from "./theme";
import { v2HasThings } from "./v2Things";

/** Klaar-scherm: "Klaar voor focus" + takenlijst + primaire CTA. */
export default function V2DoneStep({
  things,
  onContinue,
  continueLabel,
  secondary,
}: {
  things: string[];
  onContinue: () => void;
  continueLabel?: string;
  secondary?: ReactNode;
}) {
  const { t } = useI18n();
  const has = v2HasThings(things);
  const cta = continueLabel ?? t("v2.flowToDay");
  return (
    <>
      <h1 style={v2Styles.title}>
        {has ? (
          <>
            {t("v2.doneReadyBefore")}
            <em className="v2-it">{t("v2.doneReadyEm")}</em>
          </>
        ) : (
          t("v2.doneEmptyTitle")
        )}
      </h1>
      <p style={{ ...v2Styles.body, marginBottom: 16 }}>
        {has ? t("v2.doneEnough") : t("v2.doneNothing")}
      </p>
      {has ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 8 }}>
          {things.map((item) => (
            <div key={item} className="v2-propose-task v2-propose-task--idle">
              <span className="v2-propose-task__chk" aria-hidden>
                ✓
              </span>
              <span className="v2-propose-task__lbl">{item}</span>
            </div>
          ))}
        </div>
      ) : null}
      <div style={v2Styles.actions}>
        <button type="button" className="btn-primary w-full" onClick={onContinue}>
          {cta}
        </button>
        {secondary}
      </div>
    </>
  );
}
