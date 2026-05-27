"use client";

import { useEffect, useState } from "react";

type LoginSuccessSplashProps = {
  /** Wordt aangeroepen wanneer de animatie klaar is (na fade-out). */
  onDone: () => void;
};

const ENTER_MS = 720;
const HOLD_MS = 2000;
const EXIT_MS = 720;

/**
 * Intro-animatie na succesvol inloggen.
 *
 * Timing (totaal ~3440ms, korter bij prefers-reduced-motion):
 *   0ms        phase=enter  → start fade-in
 *   ~720ms     volledig zichtbaar, blijft 2s staan
 *   ~2720ms    phase=exit   → fade-out (~720ms)
 *   ~3440ms    onDone()
 */
export default function LoginSuccessSplash({ onDone }: LoginSuccessSplashProps) {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion) {
      setPhase("hold");
      const t = window.setTimeout(onDone, HOLD_MS);
      return () => window.clearTimeout(t);
    }

    const raf = window.requestAnimationFrame(() => setPhase("hold"));
    const tExit = window.setTimeout(() => setPhase("exit"), ENTER_MS + HOLD_MS);
    const tDone = window.setTimeout(onDone, ENTER_MS + HOLD_MS + EXIT_MS);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(tExit);
      window.clearTimeout(tDone);
    };
  }, [onDone]);

  const transformByPhase =
    phase === "enter"
      ? "scale(0.72)"
      : phase === "exit"
        ? "scale(1.04)"
        : "scale(1)";
  const opacityByPhase = phase === "enter" || phase === "exit" ? 0 : 1;
  const motionMs = phase === "exit" ? EXIT_MS : ENTER_MS;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Welkom bij Structuro"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--st-bg)]"
    >
      <div
        className="flex items-center justify-center"
        style={{
          transform: transformByPhase,
          opacity: opacityByPhase,
          transition: `opacity ${motionMs}ms cubic-bezier(0.22, 1, 0.36, 1), transform ${motionMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
          willChange: "transform, opacity",
        }}
      >
        {logoError ? (
          <div className="flex h-52 w-52 items-center justify-center rounded-[2.25rem] bg-[var(--st-blue)] shadow-lg sm:h-64 sm:w-64">
            <span className="text-7xl font-bold text-white sm:text-8xl">S</span>
          </div>
        ) : (
          <img
            src="/logo-structuro.png"
            alt=""
            width={256}
            height={256}
            className="h-52 w-52 object-contain drop-shadow-[0_16px_40px_rgba(59,107,247,0.3)] sm:h-64 sm:w-64"
            onError={() => setLogoError(true)}
          />
        )}
      </div>
    </div>
  );
}
