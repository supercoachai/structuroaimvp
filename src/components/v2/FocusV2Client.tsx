"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { captureProductEvent } from "@/lib/posthog/track";

import { v2ScopedCss } from "./theme";
import V2InfoHint from "./V2InfoHint";
import V2InfoSheet from "./V2InfoSheet";
import { V2_INFO_SHEETS } from "./v2InfoSheets";
import { useV2, type V2Energy } from "./V2Context";
import { useV2Go } from "./v2nav";
import {
  completeV2TaskByTitle,
  emptyDraft,
  findV2TaskByTitle,
  loadV2Tasks,
  removeV2ThingFromList,
  saveV2Tasks,
  v2Id,
  type V2DurationBucket,
  type V2MicroStep,
  type V2Task,
} from "./v2Tasks";
import { v2NormalizeThings, v2PrimaryThing } from "./v2Things";
import { markV2FirstValue } from "./v2CycleOptInPrompt";
import { recordV2FocusCompleted, recordV2FocusStart } from "./v2OpenTaskReminder";
import {
  clearV2FocusTimer,
  loadV2FocusTimer,
  saveV2FocusTimer,
} from "./v2FocusTimer";
import { v2ActiveMicroStepIndex, v2EnergyToMicro } from "./v2FocusMicro";
import {
  addV2DumpItem,
  loadV2Dump,
  saveV2Dump,
  v2DumpAtMax,
} from "./v2Dump";

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

function suggestedBucketForThing(thingLabel: string, tasks: V2Task[]): Bucket | null {
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
  const [infoOpen, setInfoOpen] = useState(false);
  const [tasks, setTasks] = useState<V2Task[]>([]);
  const [suggestBusy, setSuggestBusy] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggestDismissed, setSuggestDismissed] = useState(false);
  const [parkDraft, setParkDraft] = useState("");
  const [parkHint, setParkHint] = useState<string | null>(null);
  const suggestShownRef = useRef(false);
  const parkHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const things = v2NormalizeThings(state.things);
  const thingLabel =
    (focusParam && things.includes(focusParam) ? focusParam : null) ??
    v2PrimaryThing(things) ??
    "dit ene ding";

  useEffect(() => {
    setTasks(loadV2Tasks());
    setSuggestDismissed(false);
    setSuggestError(null);
    suggestShownRef.current = false;
  }, [thingLabel]);

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

  const activeTask = useMemo(
    () => findV2TaskByTitle(tasks, thingLabel),
    [tasks, thingLabel],
  );
  const microSteps: V2MicroStep[] = activeTask?.microSteps ?? [];
  const activeMicroIdx = v2ActiveMicroStepIndex(microSteps);
  const showMicroList = microSteps.length > 0 && !finished;
  const showMicroSuggest =
    microSteps.length === 0 &&
    !suggestDismissed &&
    !finished &&
    thingLabel.trim().length > 0 &&
    thingLabel !== "dit ene ding";

  useEffect(() => {
    if (!showMicroSuggest || suggestShownRef.current) return;
    suggestShownRef.current = true;
    captureProductEvent(ANALYTICS_EVENTS.microsteps_suggest_shown, {
      source: "focus_v2",
    });
  }, [showMicroSuggest]);

  const suggested = useMemo(
    () => suggestedBucketForThing(thingLabel, tasks),
    [thingLabel, tasks],
  );
  const totalSecs = bucket ? bucket.minutes * 60 : 0;
  const ratio = bucket && totalSecs > 0 ? Math.max(0, Math.min(1, remaining / totalSecs)) : 1;
  const ringDashOffset = RING_C * (1 - ratio);
  const timerActive = running || paused;
  const hideClock = timerActive && !finished;

  const persistTasks = (next: V2Task[]) => {
    setTasks(next);
    saveV2Tasks(next);
  };

  const toggleMicroStep = (stepId: string) => {
    if (!activeTask) return;
    persistTasks(
      tasks.map((t) => {
        if (t.id !== activeTask.id) return t;
        return {
          ...t,
          microSteps: t.microSteps.map((s) =>
            s.id === stepId ? { ...s, done: !s.done } : s,
          ),
        };
      }),
    );
  };

  const applySuggestedSteps = async () => {
    if (suggestBusy) return;
    setSuggestBusy(true);
    setSuggestError(null);
    try {
      const { fetchMicroStepSuggestions } = await import(
        "@/lib/ai/fetchMicroStepSuggestions"
      );
      const energy =
        activeTask?.energy ??
        v2EnergyToMicro(state.energy as V2Energy | null);
      const result = await fetchMicroStepSuggestions({
        title: activeTask?.title || thingLabel,
        energyLevel: energy,
        durationMin: bucket?.minutes ?? null,
        locale: "nl",
      });
      const nextSteps: V2MicroStep[] = result.steps.map((title) => ({
        id: v2Id("ms"),
        title,
        done: false,
      }));
      if (activeTask) {
        persistTasks(
          tasks.map((t) =>
            t.id === activeTask.id ? { ...t, microSteps: nextSteps } : t,
          ),
        );
      } else {
        const seed = emptyDraft();
        seed.title = thingLabel;
        seed.microSteps = nextSteps;
        persistTasks([...tasks, seed]);
      }
      captureProductEvent(ANALYTICS_EVENTS.microsteps_suggest_accepted, {
        source: "focus_v2",
        step_count: nextSteps.length,
      });
    } catch {
      setSuggestError("Voorstellen lukten niet. Probeer later opnieuw.");
    } finally {
      setSuggestBusy(false);
    }
  };

  const showParkHint = (text: string) => {
    setParkHint(text);
    if (parkHintTimerRef.current) clearTimeout(parkHintTimerRef.current);
    parkHintTimerRef.current = setTimeout(() => setParkHint(null), 2200);
  };

  const parkThought = () => {
    const trimmed = parkDraft.trim();
    if (!trimmed) return;
    const items = loadV2Dump();
    if (v2DumpAtMax(items)) {
      showParkHint("Dump is vol. Ruim eerst iets op.");
      return;
    }
    saveV2Dump(addV2DumpItem(trimmed, items));
    setParkDraft("");
    captureProductEvent("parked_thought_added", { source: "focus_v2" });
    showParkHint("Opgeslagen. Focus blijft intact.");
  };

  useEffect(() => {
    return () => {
      if (parkHintTimerRef.current) clearTimeout(parkHintTimerRef.current);
    };
  }, []);

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
    // Zelfde contract als v1 focus-complete: taak écht afvinken + persist.
    const nextTasks = completeV2TaskByTitle(tasks, thingLabel);
    persistTasks(nextTasks);
    const remainingThings = removeV2ThingFromList(things, thingLabel);
    recordV2FocusCompleted(thingLabel);
    markV2FirstValue();
    clearV2FocusTimer();
    go("/v2/home", {
      things: remainingThings,
      todayDone: remainingThings.length === 0,
    });
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

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-6 pb-10">
        <div className="flex w-full max-w-[480px] flex-col items-center">
          <div className="v2-info-head v2-info-head--center">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: "var(--accent)" }}
            >
              Nu aan zet
            </p>
            {!bucket && !finished ? (
              <V2InfoHint
                infoId="v2_focus_tijd"
                expanded={infoOpen}
                onToggle={() => setInfoOpen((v) => !v)}
                expandLabel={V2_INFO_SHEETS.focus.openAria}
                collapseLabel={V2_INFO_SHEETS.focus.closeAria}
                controlsId="v2-focus-info-sheet"
              />
            ) : null}
          </div>
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

          {showMicroList ? (
            <ul className="v2-focus-micro-list" aria-label="Microstappen">
              {microSteps.map((step, idx) => {
                const isActive = !step.done && idx === activeMicroIdx;
                return (
                  <li key={step.id}>
                    <button
                      type="button"
                      onClick={() => toggleMicroStep(step.id)}
                      className="v2-focus-micro"
                      aria-pressed={step.done}
                      data-active={isActive ? "1" : "0"}
                    >
                      <span
                        className="v2-focus-micro__chk"
                        aria-hidden
                        data-done={step.done ? "1" : "0"}
                        data-active={isActive ? "1" : "0"}
                      >
                        {step.done ? "✓" : ""}
                      </span>
                      <span
                        className="v2-focus-micro__lbl"
                        data-done={step.done ? "1" : "0"}
                        data-active={isActive ? "1" : "0"}
                      >
                        {step.title}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {showMicroSuggest ? (
            <section
              className="v2-focus-micro-suggest"
              aria-live="polite"
            >
              <p className="v2-focus-micro-suggest__title">
                Opsplitsen in kleine stappen?
              </p>
              <p className="v2-focus-micro-suggest__lead">
                Klein beginnen maakt starten makkelijker.
              </p>
              <button
                type="button"
                onClick={() => void applySuggestedSteps()}
                disabled={suggestBusy}
                className="btn-primary w-full"
              >
                {suggestBusy ? "Even denken..." : "Ja, voorstellen"}
              </button>
              <button
                type="button"
                onClick={() => setSuggestDismissed(true)}
                className="v2-link mt-2 w-full text-center"
              >
                Niet nu
              </button>
              {suggestError ? (
                <p className="v2-focus-micro-suggest__err">{suggestError}</p>
              ) : null}
            </section>
          ) : null}

          <div className={`w-full ${showMicroList || showMicroSuggest ? "mt-6" : "mt-10"}`}>
            {!bucket && !finished ? (
              <div className="flex flex-col gap-2">
                {suggested ? (
                  <p className="text-center text-[13px]" style={{ color: "var(--text-muted)" }}>
                    Past bij deze taak: {suggested.label.toLowerCase()}
                  </p>
                ) : (
                  <p className="text-center text-[13px]" style={{ color: "var(--text-muted)" }}>
                    Kies één duur. Geen perfecte keuze nodig.
                  </p>
                )}
                <div className="flex flex-col items-stretch gap-2">
                  {(suggested
                    ? [suggested, ...BUCKETS.filter((b) => b.key !== suggested.key)]
                    : BUCKETS
                  ).map((b) => {
                    const isSuggested = suggested?.key === b.key;
                    return (
                      <button
                        key={b.key}
                        type="button"
                        onClick={() => start(b)}
                        className={
                          isSuggested || (!suggested && b.key === "kort")
                            ? "btn-primary w-full"
                            : "btn-ghost w-full"
                        }
                      >
                        {isSuggested
                          ? `${b.label} (past bij deze taak)`
                          : !suggested && b.key === "kort"
                            ? `${b.label}, begin hier`
                            : b.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {timerActive && !finished ? (
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPaused((p) => !p)}
                  className="btn-primary w-full"
                >
                  {paused ? "Verder" : "Pauze"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRunning(false);
                    setPaused(false);
                    setFinished(true);
                  }}
                  className="v2-link"
                >
                  Afronden
                </button>
                <form
                  className="v2-focus-park"
                  onSubmit={(e) => {
                    e.preventDefault();
                    parkThought();
                  }}
                >
                  <input
                    type="text"
                    name="park-thought"
                    value={parkDraft}
                    onChange={(e) => setParkDraft(e.target.value)}
                    placeholder="Parkeer een gedachte…"
                    className="v2-focus-park__input"
                    autoComplete="off"
                    aria-label="Parkeer een gedachte"
                  />
                  <button
                    type="submit"
                    className="v2-focus-park__save"
                    disabled={parkDraft.trim().length === 0}
                  >
                    Bewaar
                  </button>
                </form>
                {parkHint ? (
                  <p className="v2-focus-park__hint" aria-live="polite">
                    {parkHint}
                  </p>
                ) : null}
              </div>
            ) : null}

            {extended && !finished ? (
              <button type="button" onClick={handleDone} className="btn-primary w-full">
                Ik ben klaar
              </button>
            ) : null}

            {finished ? (
              <div className="flex flex-col gap-2">
                <button type="button" onClick={handleDone} className="btn-primary w-full">
                  Ik ben klaar
                </button>
                <button type="button" onClick={handleStillBusy} className="v2-link">
                  Nog even bezig
                </button>
              </div>
            ) : null}

            {finished ? (
              <button type="button" onClick={reset} className="v2-link mx-auto mt-4 block">
                Nog een rondje
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <V2InfoSheet
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        eyebrow={V2_INFO_SHEETS.focus.eyebrow}
        title={V2_INFO_SHEETS.focus.title}
        rows={V2_INFO_SHEETS.focus.rows}
        gotItLabel={V2_INFO_SHEETS.focus.gotIt}
        closeAria={V2_INFO_SHEETS.focus.closeAria}
        panelId="v2-focus-info-sheet"
      />
    </div>
  );
}
