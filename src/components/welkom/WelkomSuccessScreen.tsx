"use client";

import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";

type WelkomSuccessScreenProps = {
  title: string;
  tagline: string;
  closingLine?: string | null;
  cta: string;
  busyLabel: string;
  paidBadge: string;
  welcomeTaskReady: boolean;
  ctaHref?: string;
  recoveryHint?: string | null;
};

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

function fireWelcomeConfetti() {
  confetti({
    particleCount: 56,
    spread: 62,
    startVelocity: 28,
    origin: { y: 0.58 },
    colors: ["#22c55e", "#3B6BF7", "#a855f7", "#f59e0b"],
    disableForReducedMotion: true,
  });
  window.setTimeout(() => {
    confetti({
      particleCount: 28,
      spread: 100,
      startVelocity: 18,
      origin: { y: 0.65, x: 0.35 },
      colors: ["#3B6BF7", "#22c55e"],
      disableForReducedMotion: true,
    });
  }, 180);
}

export default function WelkomSuccessScreen({
  title,
  tagline,
  closingLine,
  cta,
  busyLabel,
  paidBadge,
  welcomeTaskReady,
  ctaHref = "/onboarding",
  recoveryHint = null,
}: WelkomSuccessScreenProps) {
  const [logoError, setLogoError] = useState(false);
  const [showLogo, setShowLogo] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const [showTitle, setShowTitle] = useState(false);
  const [showTagline, setShowTagline] = useState(false);
  const [showClosing, setShowClosing] = useState(false);
  const [animReady, setAnimReady] = useState(false);
  const confettiFired = useRef(false);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      setShowLogo(true);
      setShowBadge(true);
      setShowTitle(true);
      setShowTagline(true);
      setShowClosing(true);
      setAnimReady(true);
      return;
    }

    const timers = [
      window.setTimeout(() => setShowLogo(true), 60),
      window.setTimeout(() => {
        if (!confettiFired.current) {
          confettiFired.current = true;
          fireWelcomeConfetti();
        }
      }, 420),
      window.setTimeout(() => setShowBadge(true), 520),
      window.setTimeout(() => setShowTitle(true), 720),
      window.setTimeout(() => setShowTagline(true), 980),
      window.setTimeout(() => setShowClosing(true), 1240),
      window.setTimeout(() => setAnimReady(true), 1480),
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  const showCta = welcomeTaskReady && animReady;
  const motionStyle = { transitionTimingFunction: EASE } as const;
  const reveal = (visible: boolean) =>
    visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0";

  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-[var(--st-bg)] px-4 py-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <style>{`
        @keyframes welkom-success-ring {
          from { stroke-dashoffset: 226; opacity: 0; transform: scale(0.88); }
          to { stroke-dashoffset: 0; opacity: 1; transform: scale(1); }
        }
        @keyframes welkom-success-check {
          from { stroke-dashoffset: 48; opacity: 0; }
          to { stroke-dashoffset: 0; opacity: 1; }
        }
        @keyframes welkom-success-glow {
          0%, 100% { opacity: 0.45; transform: scale(1); }
          50% { opacity: 0.75; transform: scale(1.06); }
        }
        .welkom-success-ring {
          animation: welkom-success-ring 0.72s ${EASE} both;
        }
        .welkom-success-check {
          animation: welkom-success-check 0.52s ${EASE} 0.34s both;
        }
        .welkom-success-glow {
          animation: welkom-success-glow 2.8s ease-in-out 0.5s infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .welkom-success-ring,
          .welkom-success-check,
          .welkom-success-glow {
            animation: none !important;
          }
        }
      `}</style>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-20 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[var(--st-blue)]/10 blur-3xl" />
        <div className="absolute bottom-8 right-[-4rem] h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute bottom-24 left-[-3rem] h-52 w-52 rounded-full bg-violet-400/10 blur-3xl" />
      </div>

      <div
        role="status"
        aria-live="polite"
        className="relative z-10 mx-auto flex w-full max-w-md flex-col items-center text-center"
      >
        <div className="relative mb-6">
          <div
            className={`welkom-success-glow pointer-events-none absolute inset-0 m-auto h-28 w-28 rounded-full bg-emerald-400/25 blur-2xl transition-opacity duration-[900ms] ${showLogo ? "opacity-100" : "opacity-0"}`}
            aria-hidden
          />
          <div
            className={`relative transition-all duration-[900ms] ${
              showLogo ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-95 opacity-0"
            }`}
            style={motionStyle}
          >
            {logoError ? (
              <div className="flex h-24 w-24 items-center justify-center rounded-[1.75rem] bg-[var(--st-blue)] shadow-lg sm:h-28 sm:w-28">
                <span className="text-4xl font-bold text-white sm:text-5xl">S</span>
              </div>
            ) : (
              <img
                src="/logo-structuro.png"
                alt=""
                width={112}
                height={112}
                className="h-24 w-24 object-contain drop-shadow-[0_16px_40px_rgba(59,107,247,0.28)] sm:h-28 sm:w-28"
                onError={() => setLogoError(true)}
              />
            )}
          </div>

          <div
            className={`absolute -bottom-1 -right-1 flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-md ring-4 ring-[var(--st-bg)] transition-all duration-[720ms] ${
              showBadge ? "scale-100 opacity-100" : "scale-75 opacity-0"
            }`}
            style={motionStyle}
            aria-hidden
          >
            <svg viewBox="0 0 72 72" className="h-11 w-11" aria-hidden>
              <circle
                cx="36"
                cy="36"
                r="30"
                fill="none"
                stroke="#dcfce7"
                strokeWidth="6"
              />
              <circle
                className={showBadge ? "welkom-success-ring" : ""}
                cx="36"
                cy="36"
                r="30"
                fill="none"
                stroke="#22c55e"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray="226"
                transform="rotate(-90 36 36)"
              />
              <path
                className={showBadge ? "welkom-success-check" : ""}
                d="M24 37 L32 45 L49 28"
                fill="none"
                stroke="#16a34a"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="48"
              />
            </svg>
          </div>
        </div>

        <span
          className={`mb-3 inline-flex items-center rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-xs font-semibold tracking-wide text-emerald-700 transition-all duration-[680ms] ${reveal(showBadge)}`}
          style={motionStyle}
        >
          {paidBadge}
        </span>

        <h1
          className={`text-2xl font-bold tracking-tight text-slate-900 transition-all duration-[780ms] sm:text-3xl ${reveal(showTitle)}`}
          style={motionStyle}
        >
          {title}
        </h1>

        <p
          className={`mt-3 max-w-sm text-balance text-base leading-relaxed text-slate-700 transition-all duration-[780ms] sm:text-[1.05rem] ${reveal(showTagline)}`}
          style={motionStyle}
        >
          {tagline}
        </p>

        {closingLine ? (
          <p
            className={`mt-4 max-w-xs text-xs leading-relaxed text-slate-400 transition-all duration-[680ms] ${reveal(showClosing)}`}
            style={motionStyle}
          >
            {closingLine}
          </p>
        ) : null}

        {recoveryHint ? (
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-600">
            {recoveryHint}
          </p>
        ) : null}

        <button
          type="button"
          disabled={!showCta}
          onClick={() => {
            if (!showCta) return;
            window.location.assign(ctaHref);
          }}
          className={`mt-8 inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-base font-semibold text-white shadow-md transition-all duration-[780ms] hover:bg-blue-700 active:scale-[0.98] disabled:pointer-events-none ${
            showCta
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none translate-y-2 opacity-0"
          }`}
          style={motionStyle}
        >
          {!welcomeTaskReady ? (
            <>
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                aria-hidden
              />
              {busyLabel}
            </>
          ) : (
            cta
          )}
        </button>
      </div>
    </div>
  );
}
