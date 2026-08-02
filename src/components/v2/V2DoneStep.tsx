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
  primaryTitle,
  microSteps,
  companionsLead,
  companionsNote,
}: {
  things: string[];
  onContinue: () => void;
  continueLabel?: string;
  secondary?: ReactNode;
  /** Eigen taak bovenaan met optionele microstappen. */
  primaryTitle?: string | null;
  microSteps?: string[];
  /** Label boven companion-taken (genoeg/hoog). */
  companionsLead?: string | null;
  /** Hint onder companion-taken (onboarding). */
  companionsNote?: string | null;
}) {
  const { t } = useI18n();
  const has = v2HasThings(things);
  const cta = continueLabel ?? t("v2.flowToDay");
  const primary = primaryTitle?.trim() || null;
  const micros = (microSteps ?? []).map((s) => s.trim()).filter(Boolean);
  const companions = primary
    ? things.filter((item) => item.trim().toLowerCase() !== primary.toLowerCase())
    : things;

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
        {has
          ? primary
            ? t("v2.doneEnoughWithOwn")
            : t("v2.doneEnough")
          : t("v2.doneNothing")}
      </p>
      {has ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginBottom: 8,
          }}
        >
          {primary ? (
            <div>
              <div className="v2-propose-task v2-propose-task--idle">
                <span className="v2-propose-task__chk" aria-hidden>
                  ✓
                </span>
                <span className="v2-propose-task__lbl">{primary}</span>
              </div>
              {micros.length > 0 ? (
                <ol className="v2-done-micro">
                  {micros.map((step) => (
                    <li key={step} className="v2-done-micro__item">
                      <span className="v2-done-micro__rail" aria-hidden>
                        <span className="v2-done-micro__dot" />
                      </span>
                      <span className="v2-done-micro__lbl">{step}</span>
                    </li>
                  ))}
                </ol>
              ) : null}
            </div>
          ) : null}

          {companions.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {primary && companionsLead ? (
                <p
                  style={{
                    ...v2Styles.body,
                    fontSize: 13,
                    margin: 0,
                    opacity: 0.85,
                  }}
                >
                  {companionsLead}
                </p>
              ) : null}
              {companions.map((item) => (
                <div key={item} className="v2-propose-task v2-propose-task--idle">
                  <span className="v2-propose-task__chk" aria-hidden>
                    ✓
                  </span>
                  <span className="v2-propose-task__lbl">{item}</span>
                </div>
              ))}
              {companionsNote ? (
                <p
                  style={{
                    ...v2Styles.body,
                    fontSize: 12,
                    margin: "2px 0 0",
                    opacity: 0.75,
                    textAlign: "center",
                  }}
                >
                  {companionsNote}
                </p>
              ) : null}
            </div>
          ) : null}
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
