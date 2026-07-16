"use client";

import { useCallback, useEffect, useState } from "react";

import { useV2 } from "./V2Context";
import { v2Styles } from "./theme";
import { recordV2FrisseStartAccepted } from "./v2Adaptive";
import { trackV2FrisseStartAccepted, trackV2SessionStart } from "./v2Analytics";
import { readV2Settings } from "./v2Settings";
import {
  daysSinceLastVisit,
  frisseStartRestDump,
  frisseStartSoftResetToday,
  markFrisseStartHandled,
  recordV2Visit,
  shouldShowFrisseStart,
} from "./v2Visit";

export function V2VisitTracker() {
  useEffect(() => {
    trackV2SessionStart();
    if (!shouldShowFrisseStart()) {
      recordV2Visit();
    }
  }, []);
  return null;
}

export function FrisseStartOverlay() {
  const { update } = useV2();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (shouldShowFrisseStart()) {
      setVisible(true);
    }
  }, []);

  const dismiss = useCallback(() => {
    recordV2Visit();
    markFrisseStartHandled();
    setVisible(false);
  }, []);

  const confirm = useCallback(() => {
    recordV2FrisseStartAccepted();
    trackV2FrisseStartAccepted({
      daysSinceLastVisit: daysSinceLastVisit(readV2Settings().lastVisitAt),
    });
    frisseStartRestDump();
    update(frisseStartSoftResetToday());
    dismiss();
  }, [dismiss, update]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="v2-frisse-start-title"
      className="v2-fade"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        backgroundColor: "rgba(245, 243, 238, 0.96)",
      }}
    >
      <div
        style={{
          ...v2Styles.card,
          maxWidth: 400,
          width: "100%",
          textAlign: "center",
        }}
      >
        <p style={v2Styles.kicker}>Welkom terug</p>
        <h1 id="v2-frisse-start-title" style={v2Styles.title}>
          Fijn dat je er weer bent.
        </h1>
        <p style={v2Styles.body}>
          Je mag opnieuw beginnen zonder in te halen. Open gedachten mogen rusten.
          Vandaag telt opnieuw, op jouw tempo.
        </p>
        <div style={v2Styles.actions}>
          <button type="button" className="v2-cta" style={v2Styles.cta} onClick={confirm}>
            Ja, frisse start
          </button>
          <button type="button" className="v2-textlink" style={v2Styles.skipLink} onClick={dismiss}>
            Nee, gewoon verder
          </button>
        </div>
      </div>
    </div>
  );
}
