"use client";

import { useEffect, useState } from "react";

import { hasInfoSeenLocally, markInfoSeenLocally } from "@/lib/infoSeenLocal";

/**
 * Subtiele (i) voor v2-onboarding. Soft pulse bij eerste keer tot openen.
 * Respecteert prefers-reduced-motion via CSS.
 */
export default function V2InfoHint({
  infoId,
  expanded,
  onToggle,
  expandLabel,
  collapseLabel,
  controlsId,
}: {
  infoId: string;
  expanded: boolean;
  onToggle: () => void;
  expandLabel: string;
  collapseLabel: string;
  controlsId?: string;
}) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (hasInfoSeenLocally(infoId)) return;
    setPulse(true);
  }, [infoId]);

  const handleClick = () => {
    if (pulse) {
      setPulse(false);
      markInfoSeenLocally(infoId);
    }
    onToggle();
  };

  return (
    <button
      type="button"
      className={`v2-info-hint${pulse ? " is-pulse" : ""}`}
      aria-expanded={expanded}
      aria-controls={controlsId}
      aria-label={expanded ? collapseLabel : expandLabel}
      onClick={handleClick}
    >
      i
    </button>
  );
}
