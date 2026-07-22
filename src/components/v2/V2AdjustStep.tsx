"use client";

import { useI18n } from "@/lib/i18n";

import { v2Styles } from "./theme";
import { v2IsAnxietyTitle } from "./v2Things";

/**
 * Escape-pad: eenvoudige keuze tot max drie. Geen swipe als hoofdsysteem.
 * Zware onderwerpen krijgen een zachte meta ("Mag later"), geen shame-label.
 */
export default function V2AdjustStep({
  options,
  selected,
  maxSlots,
  onToggle,
  onConfirm,
  onSkip,
}: {
  options: string[];
  selected: string[];
  maxSlots: number;
  onToggle: (title: string) => void;
  onConfirm: () => void;
  onSkip: () => void;
}) {
  const { t } = useI18n();
  const atMax = selected.length >= maxSlots;

  const title =
    maxSlots >= 3 ? (
      <>
        {t("v2.adjustPickThreeBefore")}
        <em className="v2-it">{t("v2.adjustPickThreeEm")}</em>
        {t("v2.adjustPickThreeAfter")}
      </>
    ) : maxSlots === 2 ? (
      t("v2.adjustPickTwo")
    ) : (
      t("v2.adjustPickOne")
    );

  return (
    <>
      <h1 style={v2Styles.title}>{title}</h1>
      <div style={{ ...v2Styles.optionList, marginTop: 8 }}>
        {options.map((optionTitle) => {
          const on = selected.includes(optionTitle);
          const lockedOut = !on && atMax;
          const softLater = v2IsAnxietyTitle(optionTitle);
          return (
            <button
              key={optionTitle}
              type="button"
              className="v2-adjust-task"
              aria-pressed={on}
              disabled={lockedOut}
              onClick={() => onToggle(optionTitle)}
            >
              <span className={`v2-adjust-task__chk${on ? " on" : ""}`} aria-hidden>
                {on ? "✓" : ""}
              </span>
              <span className="v2-adjust-task__body">
                <span className="v2-adjust-task__lbl">{optionTitle}</span>
                {softLater ? (
                  <span className="v2-adjust-task__meta">{t("v2.adjustLater")}</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      <div style={v2Styles.softActions}>
        <button
          type="button"
          className="btn-primary w-full"
          disabled={selected.length === 0}
          onClick={onConfirm}
        >
          {t("v2.adjustConfirm")}
        </button>
        <button type="button" className="v2-link" onClick={onSkip}>
          {t("v2.adjustSkip")}
        </button>
      </div>
    </>
  );
}
