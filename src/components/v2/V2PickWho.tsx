"use client";

import { v2Styles } from "./theme";

type V2PickWhoProps = {
  energyLabel?: string;
  onStructuro: () => void;
  onSelf: () => void;
  /** Optioneel: overslaan = rust vandaag, geen dingen kiezen. */
  onSkip?: () => void;
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

/**
 * Wie kiest vandaag: Structuro als duidelijke default (één primaire kaart).
 * Zelf swipen is een stille textlink, geen tweede symmetrische kaart.
 */
export default function V2PickWho({
  energyLabel,
  onStructuro,
  onSelf,
  onSkip,
}: V2PickWhoProps) {
  return (
    <>
      <h1 style={v2Styles.title}>Wie kiest je dingen?</h1>
      <p style={v2Styles.body}>
        Structuro kan voorstellen. Zelf swipen kan altijd.
      </p>

      <button
        type="button"
        className="v2-choice v2-pick-who__primary"
        onClick={onStructuro}
        aria-pressed="true"
      >
        <span className="v2-pick-who__icon" aria-hidden>
          <SparkIcon />
        </span>
        <span className="v2-pick-who__copy">
          <span className="v2-pick-who__title">Structuro kiest</span>
          <span className="v2-pick-who__hint">
            {energyLabel
              ? `Past bij ${energyLabel.toLowerCase()}`
              : "Suggesties op maat"}
          </span>
        </span>
      </button>

      <button type="button" className="v2-link" style={{ marginTop: 8 }} onClick={onSelf}>
        Liever zelf swipen
      </button>

      {onSkip ? (
        <button type="button" className="v2-link" style={{ marginTop: 4 }} onClick={onSkip}>
          Overslaan. Vandaag hoeft er niks.
        </button>
      ) : null}
    </>
  );
}
