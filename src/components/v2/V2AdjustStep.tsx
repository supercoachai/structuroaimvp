"use client";

import { v2Styles } from "./theme";
import { v2IsAnxietyTitle, v2ThingTitle } from "./v2Things";

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
  const atMax = selected.length >= maxSlots;

  return (
    <>
      <h1 style={v2Styles.title}>
        {maxSlots >= 3 ? (
          <>
            Kies tot <em className="v2-it">drie</em> dingen.
          </>
        ) : (
          v2ThingTitle(maxSlots)
        )}
      </h1>
      <div style={{ ...v2Styles.optionList, marginTop: 8 }}>
        {options.map((title) => {
          const on = selected.includes(title);
          const lockedOut = !on && atMax;
          const softLater = v2IsAnxietyTitle(title);
          return (
            <button
              key={title}
              type="button"
              className="v2-adjust-task"
              aria-pressed={on}
              disabled={lockedOut}
              onClick={() => onToggle(title)}
            >
              <span className={`v2-adjust-task__chk${on ? " on" : ""}`} aria-hidden>
                {on ? "✓" : ""}
              </span>
              <span className="v2-adjust-task__body">
                <span className="v2-adjust-task__lbl">{title}</span>
                {softLater ? (
                  <span className="v2-adjust-task__meta">Mag later</span>
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
          Dit kies ik
        </button>
        <button type="button" className="v2-link" onClick={onSkip}>
          Niks kiezen, ook goed
        </button>
      </div>
    </>
  );
}
