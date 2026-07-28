"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { HAPTIC_PATTERNS, triggerHaptic } from "@/lib/haptics";

import {
  hasSeenFocusHoldHint,
  holdProgress,
  holdSucceeded,
  markFocusHoldHintSeen,
  wasBriefTap,
  V2_HOLD_TO_CONFIRM_MS,
} from "./v2HoldToConfirm";

type Props = {
  label: string;
  /** Altijd zichtbaar tot eerste succesvolle hold, daarna optioneel. */
  holdHint: string;
  /** Korte tip na een te korte tip/tap. */
  tapHint: string;
  onConfirm: () => void;
  className?: string;
  holdMs?: number;
};

/**
 * Hold-to-confirm: progress-fill + lichte haptic tijdens vasthouden.
 * Toetsenbord (Enter/Space) bevestigt direct voor toegankelijkheid.
 */
export default function V2HoldToConfirmButton({
  label,
  holdHint,
  tapHint,
  onConfirm,
  className = "btn-primary w-full",
  holdMs = V2_HOLD_TO_CONFIRM_MS,
}: Props) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const [flashOk, setFlashOk] = useState(false);
  const [showTapHint, setShowTapHint] = useState(false);
  const [showHoldHint, setShowHoldHint] = useState(false);

  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const confirmedRef = useRef(false);
  const midTickRef = useRef(false);
  const tapHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setShowHoldHint(!hasSeenFocusHoldHint());
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (tapHintTimerRef.current) clearTimeout(tapHintTimerRef.current);
    };
  }, []);

  const clearRaf = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const finishConfirm = () => {
    if (confirmedRef.current) return;
    confirmedRef.current = true;
    markFocusHoldHintSeen();
    setShowHoldHint(false);
    setFlashOk(true);
    triggerHaptic(HAPTIC_PATTERNS.TASK_DONE, { respectReducedMotion: true });
    window.setTimeout(() => {
      onConfirm();
    }, 120);
  };

  const stopHold = (elapsedMs: number, cancelled: boolean) => {
    clearRaf();
    startRef.current = null;
    pointerIdRef.current = null;
    midTickRef.current = false;
    setHolding(false);

    if (confirmedRef.current) return;

    if (cancelled) {
      setProgress(0);
      return;
    }

    if (holdSucceeded(elapsedMs, holdMs)) {
      setProgress(1);
      finishConfirm();
      return;
    }

    setProgress(0);
    if (wasBriefTap(elapsedMs)) {
      setShowTapHint(true);
      if (tapHintTimerRef.current) clearTimeout(tapHintTimerRef.current);
      tapHintTimerRef.current = setTimeout(() => setShowTapHint(false), 2200);
      triggerHaptic(HAPTIC_PATTERNS.HOLD_TICK, { respectReducedMotion: true });
    }
  };

  const tick = () => {
    const start = startRef.current;
    if (start == null) return;
    const elapsed = performance.now() - start;
    const next = holdProgress(elapsed, holdMs);
    setProgress(next);

    if (!midTickRef.current && next >= 0.45) {
      midTickRef.current = true;
      triggerHaptic(HAPTIC_PATTERNS.HOLD_TICK, { respectReducedMotion: true });
    }

    if (holdSucceeded(elapsed, holdMs)) {
      stopHold(elapsed, false);
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    if (confirmedRef.current || flashOk) return;
    e.preventDefault();
    confirmedRef.current = false;
    midTickRef.current = false;
    startRef.current = performance.now();
    pointerIdRef.current = e.pointerId;
    setHolding(true);
    setShowTapHint(false);
    setProgress(0);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    triggerHaptic(HAPTIC_PATTERNS.HOLD_TICK, { respectReducedMotion: true });
    clearRaf();
    rafRef.current = requestAnimationFrame(tick);
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current) {
      return;
    }
    const start = startRef.current;
    const elapsed = start == null ? 0 : performance.now() - start;
    stopHold(elapsed, false);
  };

  const onPointerCancel = () => {
    const start = startRef.current;
    const elapsed = start == null ? 0 : performance.now() - start;
    stopHold(elapsed, true);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    if (confirmedRef.current || flashOk) return;
    finishConfirm();
  };

  const hintText = showTapHint ? tapHint : showHoldHint ? holdHint : null;
  const fillPct = Math.round(progress * 100);

  return (
    <div className="v2-hold-wrap">
      <button
        type="button"
        className={`v2-hold-btn ${className}${holding ? " v2-hold-btn--holding" : ""}${flashOk ? " v2-hold-btn--ok" : ""}`}
        aria-label={label}
        aria-describedby={hintText ? "v2-hold-hint" : undefined}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={holding ? fillPct : undefined}
        aria-busy={holding || flashOk}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onLostPointerCapture={onPointerCancel}
        onKeyDown={onKeyDown}
        onContextMenu={(e) => e.preventDefault()}
        style={
          {
            "--v2-hold-progress": String(progress),
          } as CSSProperties
        }
      >
        <span
          className="v2-hold-btn__fill"
          aria-hidden
          style={{ transform: `scaleX(${progress})` }}
        />
        <span className="v2-hold-btn__label">
          {flashOk ? "✓" : label}
        </span>
      </button>
      {hintText ? (
        <p id="v2-hold-hint" className="v2-hold-hint" role="status">
          {hintText}
        </p>
      ) : null}
    </div>
  );
}
