"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { v2ScopedCss } from "./theme";
import { V2LearnHintOnce } from "./V2LearnHintOnce";
import { useV2 } from "./V2Context";
import { useV2Go } from "./v2nav";
import { loadV2Tasks, type V2DurationBucket } from "./v2Tasks";
import { v2NormalizeThings, v2PrimaryThing } from "./v2Things";
import { recordV2FocusCompleted, recordV2FocusStart } from "./v2OpenTaskReminder";
import {
  clearV2FocusTimer,
  loadV2FocusTimer,
  saveV2FocusTimer,
} from "./v2FocusTimer";

type Bucket = { key: string; label: string; minutes: number; durationBucket: V2DurationBucket };

/** Grove bakken in plaats van een minuten-input (tijdblindheid). */
const BUCKETS: Bucket[] = [
  { key: "kort", label: "Kort", minutes: 5, durationBucket: "short" },
  { key: "middel", label: "Middel", minutes: 15, durationBucket: "medium" },
  { key: "lang", label: "Lang", minutes: 25, durationBucket: "long" },
];

const RING_R = 92;
const RING_C = 2 * Math.PI * RING_R;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function suggestedBucketForThing(
  thingLabel: string,
  tasks: ReturnType<typeof loadV2Tasks>,
): Bucket | null {
  const match = tasks.find((t) => t.title.trim() === thingLabel.trim() && t.durationBucket);
  if (!match?.durationBucket) return null;
  return BUCKETS.find((b) => b.durationBucket === match.durationBucket) ?? null;
}

export default function FocusV2Client() {
  const go = useV2Go();
  const { state } = useV2();
  const searchParams = useSearchParams();
  const focusParam = searchParams.get("thing");
  const [bucket, setBucket] = useState<Bucket | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const [extended, setExtended] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tasks = useMemo(() => loadV2Tasks(), []);

  const things = v2NormalizeThings(state.things);
  const thingLabel =
    (focusParam && things.includes(focusParam) ? focusParam : null) ??
    v2PrimaryThing(things) ??
    "dit ene ding";

  // Hervat na refresh / distractie.
  useEffect(() => {
    const snap = loadV2FocusTimer(thingLabel);
    if (snap) {
      const b = BUCKETS.find((x) => x.key === snap.bucketKey) ?? null;
      if (b) {
        setBucket(b);
        setRemaining(snap.remaining);
        setRunning(snap.running && !snap.finished && !snap.extended);
        setPaused(snap.paused);
        setFinished(snap.finished);
        setExtended(snap.extended);
        if (snap.finished || snap.extended) {
          saveV2FocusTimer({ ...snap, running: false });
        }
      }
    }
    setHydrated(true);
  }, [thingLabel]);

  // Persist timer-state.
  useEffect(() => {
    if (!hydrated) return;
    if (!bucket) {
      clearV2FocusTimer();
      return;
    }
    saveV2FocusTimer({
      thing: thingLabel,
      bucketKey: bucket.key,
      remaining,
      totalSecs: bucket.minutes * 60,
      running,
      paused,
      finished,
      extended,
      updatedAt: Date.now(),
    });
  }, [hydrated, thingLabel, bucket, remaining, running, paused, finished, extended]);

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

  const suggested = useMemo(
    () => suggestedBucketForThing(thingLabel, tasks),
    [thingLabel, tasks],
  );
  const totalSecs = bucket ? bucket.minutes * 60 : 0;
  const ratio = bucket && totalSecs > 0 ? Math.max(0, Math.min(1, remaining / totalSecs)) : 1;
  const ringDashOffset = RING_C * (1 - ratio);
  const timerActive = running || paused;
  const hideClock = timerActive && !finished;

  const start = (b: Bucket) => {
    setBucket(b);
    setRemaining(b.minutes * 60);
    setFinished(false);
    setExtended(false);
    setPaused(false);
    setRunning(true);
    recordV2FocusStart(thingLabel);
  };

  const handleStillBusy = () => {
    setFinished(false);
    setExtended(true);
    setRunning(false);
    setPaused(false);
  };

  const handleDone = () => {
    recordV2FocusCompleted(thingLabel);
    clearV2FocusTimer();
    go("/v2/home", { todayDone: false });
  };

  const reset = () => {
    setRunning(false);
    setPaused(false);
    setFinished(false);
    setExtended(false);
    setBucket(null);
    setRemaining(0);
    clearV2FocusTimer();
  };

  return (
    <div
      data-mode="focus"
      className="flex min-h-[100dvh] w-full flex-col"
      style={{ background: "var(--surface)", color: "var(--text)" }}
    >
      <style>{v2ScopedCss}</style>
      <div className="flex shrink-0 items-center justify-between px-5 pt-[max(12px,env(safe-area-inset-top))] pb-1">
        <button type="button" onClick={() => go("/v2/home")} className="v2-link">
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
            <div
              className={`relative mt-8 h-[210px] w-[210px] shrink-0 ${extended ? "v2-focus-bubble-extended rounded-full" : ""}`}
            >
              <svg viewBox="0 0 210 210" aria-hidden className="h-full w-full">
                <circle cx="105" cy="105" r={RING_R} fill="none" stroke="var(--border)" strokeWidth="10" />
                {bucket && !extended ? (
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
                ) : extended ? (
                  <circle
                    cx="105"
                    cy="105"
                    r={RING_R}
                    fill="rgba(45, 90, 86, 0.06)"
                    stroke="var(--accent)"
                    strokeWidth="10"
                    strokeOpacity="0.35"
                  />
                ) : null}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {hideClock ? (
                  <div
                    className="font-semibold leading-none tracking-tight"
                    style={{ fontSize: 22, color: "var(--text-muted)" }}
                    aria-hidden
                  >
                    ···
                  </div>
                ) : (
                  <>
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
                  </>
                )}
                {extended ? (
                  <p className="mt-2 px-6 text-center text-[13px]" style={{ color: "var(--accent)" }}>
                    Nog even bezig
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <div
              className="mt-8 flex h-[210px] w-[210px] shrink-0 flex-col items-center justify-center rounded-full text-center"
              style={{ border: "1px solid var(--border)", background: "var(--surface-raised)" }}
            >
              <p className="v2-serif px-6" style={{ fontSize: "var(--fs-title)", color: "var(--text)" }}>
                Tijd om te kiezen
              </p>
              <p className="mt-1 px-6 text-xs" style={{ color: "var(--text-muted)" }}>
                Ben je klaar, of nog even bezig?
              </p>
            </div>
          )}

          <div className="mt-10 w-full">
            {!bucket && !finished ? (
              <div className="flex flex-col gap-2">
                <V2LearnHintOnce feature="focus" className="text-center" />
                {suggested ? (
                  <p className="text-center text-[13px]" style={{ color: "var(--text-muted)" }}>
                    Past bij deze taak: {suggested.label.toLowerCase()}
                  </p>
                ) : null}
                <div className="flex items-center justify-center gap-2">
                  {BUCKETS.map((b) => (
                    <button
                      key={b.key}
                      type="button"
                      onClick={() => start(b)}
                      className={`btn-ghost ${suggested?.key === b.key ? "ring-1 ring-[var(--accent)]" : ""}`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {timerActive && !finished ? (
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRunning(false);
                    setPaused(false);
                    setFinished(true);
                  }}
                  className="btn-primary w-full"
                >
                  Stoppen
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

            {extended && !finished ? (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={handleDone} className="btn-primary w-full">
                  Ik ben klaar
                </button>
                <button type="button" onClick={() => setExtended(true)} className="btn-ghost w-full">
                  Nog even bezig
                </button>
              </div>
            ) : null}

            {finished ? (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={handleDone} className="btn-primary w-full">
                  Ik ben klaar
                </button>
                <button type="button" onClick={handleStillBusy} className="btn-ghost w-full">
                  Nog even bezig
                </button>
              </div>
            ) : null}

            {!finished && !timerActive && !extended ? (
              <Link href="/v2/dump?capture=1" className="v2-link mt-4 block text-center">
                Parkeer gedachte
              </Link>
            ) : null}

            {finished ? (
              <button type="button" onClick={reset} className="v2-link mx-auto mt-4 block">
                Nog een rondje
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
