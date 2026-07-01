"use client";

import { useEffect, useRef, useState } from "react";

import { useV2 } from "./V2Context";
import { useV2Go } from "./v2nav";

type Bucket = { key: string; label: string; minutes: number };

/** Grove bakken in plaats van een minuten-input (tijdblindheid). */
const BUCKETS: Bucket[] = [
  { key: "kort", label: "Kort", minutes: 5 },
  { key: "middel", label: "Middel", minutes: 15 },
  { key: "lang", label: "Lang", minutes: 25 },
];

const RING_R = 92;
const RING_C = 2 * Math.PI * RING_R;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function FocusV2Client() {
  const go = useV2Go();
  const { state } = useV2();
  const [bucket, setBucket] = useState<Bucket | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running || paused) return;
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setRunning(false);
          setFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, paused]);

  const thingLabel =
    state.thing && state.thing.trim().length > 0 ? state.thing.trim() : "dit ene ding";
  const totalSecs = bucket ? bucket.minutes * 60 : 0;
  const ratio = bucket && totalSecs > 0 ? Math.max(0, Math.min(1, remaining / totalSecs)) : 1;
  const ringDashOffset = RING_C * (1 - ratio);
  const timerActive = running || paused;

  const start = (b: Bucket) => {
    setBucket(b);
    setRemaining(b.minutes * 60);
    setFinished(false);
    setPaused(false);
    setRunning(true);
  };
  const stop = () => {
    setRunning(false);
    setPaused(false);
    setFinished(true);
  };
  const reset = () => {
    setRunning(false);
    setPaused(false);
    setFinished(false);
    setBucket(null);
    setRemaining(0);
  };

  return (
    <div
      data-mode="focus"
      className="flex min-h-[100dvh] w-full flex-col"
      style={{ background: "var(--surface)", color: "var(--text)" }}
    >
      <div className="flex shrink-0 items-center justify-between px-5 pt-[max(12px,env(safe-area-inset-top))] pb-1">
        <button
          type="button"
          onClick={() => go("/v2/home")}
          className="v2-link"
        >
          Sluiten
        </button>
        {paused ? (
          <span
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: "var(--accent)" }}
          >
            Gepauzeerd
          </span>
        ) : (
          <span className="w-16" aria-hidden />
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 pb-10">
        <div className="flex w-full max-w-[480px] flex-col items-center">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: "var(--accent)" }}
          >
            Nu aan zet
          </p>
          <h1
            className="v2-serif mt-2 line-clamp-2 text-center"
            style={{ fontSize: "var(--fs-title)", color: "var(--text)" }}
          >
            {thingLabel}
          </h1>

          {!finished ? (
            <div className="relative mt-8 h-[210px] w-[210px] shrink-0">
              <svg viewBox="0 0 210 210" aria-hidden className="h-full w-full">
                <circle cx="105" cy="105" r={RING_R} fill="none" stroke="var(--border)" strokeWidth="10" />
                <circle
                  cx="105"
                  cy="105"
                  r={RING_R}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={RING_C}
                  strokeDashoffset={ringDashOffset}
                  transform="rotate(-90 105 105)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div
                  className="font-bold leading-none tabular-nums tracking-tight"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 44, color: "var(--text)" }}
                >
                  {bucket ? formatTime(remaining) : "--:--"}
                </div>
                <div
                  className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
                  style={{ color: "var(--text-muted)" }}
                >
                  {bucket ? bucket.label : "Kies hoe lang"}
                </div>
              </div>
            </div>
          ) : (
            <div
              className="mt-8 flex h-[210px] w-[210px] shrink-0 flex-col items-center justify-center rounded-full text-center"
              style={{ border: "1px solid var(--border)", background: "var(--surface-raised)" }}
            >
              <div
                className="mb-3 flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: "var(--accent)" }}
                aria-hidden
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12l5 5 9-9" stroke="#1A2340" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="v2-serif" style={{ fontSize: "var(--fs-title)", color: "var(--text)" }}>
                Mooi gedaan.
              </p>
              <p className="mt-1 px-6 text-xs" style={{ color: "var(--text-muted)" }}>
                Dat telt. Meer hoeft niet.
              </p>
            </div>
          )}

          <div className="mt-10 w-full">
            {!bucket && !finished ? (
              <div className="flex items-center justify-center gap-2">
                {BUCKETS.map((b) => (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => start(b)}
                    className="btn-ghost"
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            ) : null}

            {timerActive ? (
              <div className="flex flex-col items-center gap-2">
                <button type="button" onClick={stop} className="btn-primary w-full">
                  Klaar
                </button>
                <button
                  type="button"
                  onClick={() => setPaused((p) => !p)}
                  className="v2-link"
                >
                  {paused ? "Verder" : "Pauze"}
                </button>
              </div>
            ) : null}

            {finished ? (
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => go("/v2/home", { todayDone: false })}
                  className="btn-primary w-full"
                >
                  Terug naar home
                </button>
                <button type="button" onClick={reset} className="v2-link">
                  Nog een rondje
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
