"use client";

import { useEffect, useRef, useState } from "react";

import { useI18n } from "@/lib/i18n";

import { v2Styles } from "./theme";
import V2TaskBattery from "./V2TaskBattery";
import { v2EnrichThingProposals, v2IsAnxietyTitle } from "./v2Things";

/**
 * Escape-pad: eenvoudige keuze tot max drie. Geen swipe als hoofdsysteem.
 * Zware onderwerpen krijgen een zachte meta ("Mag later"), geen shame-label.
 * Energie-batterij per rij (zelfde lookup als propose/home).
 */
export default function V2AdjustStep({
  options,
  selected,
  maxSlots,
  onToggle,
  onAddCustom,
  onConfirm,
  onSkip,
  autoFocusCustom = false,
}: {
  options: string[];
  selected: string[];
  maxSlots: number;
  onToggle: (title: string) => void;
  onAddCustom?: (title: string) => void;
  onConfirm: () => void;
  onSkip: () => void;
  autoFocusCustom?: boolean;
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState("");
  const atMax = selected.length >= maxSlots;
  const rows = v2EnrichThingProposals(options);
  const canAddCustom = Boolean(onAddCustom) && draft.trim().length >= 2 && !atMax;

  useEffect(() => {
    if (!autoFocusCustom) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, [autoFocusCustom]);

  const submitCustom = () => {
    if (!onAddCustom || !canAddCustom) return;
    onAddCustom(draft);
    setDraft("");
  };

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
        {rows.map((row) => {
          const on = selected.includes(row.title);
          const lockedOut = !on && atMax;
          const softLater = v2IsAnxietyTitle(row.title);
          return (
            <button
              key={row.title}
              type="button"
              className="v2-adjust-task"
              aria-pressed={on}
              disabled={lockedOut}
              onClick={() => onToggle(row.title)}
            >
              <span className={`v2-adjust-task__chk${on ? " on" : ""}`} aria-hidden>
                {on ? "✓" : ""}
              </span>
              <V2TaskBattery energy={row.energy} size={18} />
              <span className="v2-adjust-task__body">
                <span className="v2-adjust-task__lbl">{row.title}</span>
                {softLater ? (
                  <span className="v2-adjust-task__meta">{t("v2.adjustLater")}</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      {onAddCustom ? (
        <form
          className="v2-adjust-custom"
          onSubmit={(e) => {
            e.preventDefault();
            submitCustom();
          }}
        >
          <label htmlFor="v2-adjust-custom-title" className="v2-adjust-custom__label">
            {t("v2.adjustTypeOwnLabel")}
          </label>
          <div
            className={`v2-own-task__custom${draft.trim() ? " v2-own-task__custom--filled" : ""}`}
          >
            <input
              id="v2-adjust-custom-title"
              ref={inputRef}
              type="text"
              className="v2-own-task__input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t("v2.ownTaskPlaceholder")}
              autoComplete="off"
              maxLength={280}
              disabled={atMax}
            />
            <button
              type="submit"
              className={`v2-own-task__add${canAddCustom ? " v2-own-task__add--on" : ""}`}
              aria-label={t("v2.adjustTypeOwnAddAria")}
              disabled={!canAddCustom}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 5v14M5 12h14"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </form>
      ) : null}
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
