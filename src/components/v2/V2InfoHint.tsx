"use client";

import { useEffect, useRef, useState } from "react";

import { hasInfoSeenLocally, markInfoSeenLocally } from "@/lib/infoSeenLocal";

/** Duur ≈ 3× 1.2s CSS-pulse; timeout is fallback als animationend uitblijft. */
const PULSE_FALLBACK_MS = 4000;
const PULSE_REDUCED_MS = 1800;

/**
 * Subtiele (i) voor v2. Soft pulse alleen de allereerste keer per infoId
 * (eindige animatie), daarna nooit meer. Openen markeert meteen als gezien.
 * Respecteert prefers-reduced-motion via CSS + korte timeout.
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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPulseTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopPulseAndMarkSeen = () => {
    clearPulseTimer();
    setPulse(false);
    markInfoSeenLocally(infoId);
  };

  useEffect(() => {
    if (hasInfoSeenLocally(infoId)) return;

    setPulse(true);

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    timerRef.current = setTimeout(
      () => {
        timerRef.current = null;
        setPulse(false);
        markInfoSeenLocally(infoId);
      },
      reduced ? PULSE_REDUCED_MS : PULSE_FALLBACK_MS,
    );

    return () => clearPulseTimer();
  }, [infoId]);

  return (
    <button
      type="button"
      className={`v2-info-hint${pulse ? " is-pulse" : ""}`}
      aria-expanded={expanded}
      aria-controls={controlsId}
      aria-label={expanded ? collapseLabel : expandLabel}
      onClick={() => {
        stopPulseAndMarkSeen();
        onToggle();
      }}
      onAnimationEnd={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.animationName !== "v2-info-hint-pulse") return;
        stopPulseAndMarkSeen();
      }}
    >
      i
    </button>
  );
}
