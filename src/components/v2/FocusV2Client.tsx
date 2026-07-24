"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { useI18n } from "@/lib/i18n";
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
import { estimateFocusDurationBucket } from "./v2FocusDurationEstimate";
import {
  addV2DumpItem,
  loadV2Dump,
  saveV2Dump,
  v2DumpAtMax,
} from "./v2Dump";

type Bucket = {
  key: string;
  minutes: number;
  durationBucket: Exclude<V2DurationBucket, null>;
};

/** Grove bakken in plaats van een minuten-input (tijdblindheid). */
const BUCKETS: Bucket[] = [
  { key: "kort", minutes: 5, durationBucket: "short" },
  { key: "middel", minutes: 15, durationBucket: "medium" },
  { key: "lang", minutes: 25, durationBucket: "long" },
];

const EXTEND_SECS = BUCKETS[0].minutes * 60;

const RING_R = 92;
const RING_C = 2 * Math.PI * RING_R;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function bucketByDuration(
  durationBucket: Exclude<V2DurationBucket, null>,
): Bucket {
  return BUCKETS.find((b) => b.durationBucket === durationBucket) ?? BUCKETS[0];
}

export default function FocusV2Client() {
  const go = useV2Go();
  const { t, locale } = useI18n();
  const { state } = useV2();
  const searchParams = useSearchParams();
  const focusParam = searchParams.get("thing");
  const [bucket, setBucket] = useState<Bucket | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [totalSecs, setTotalSecs] = useState(0);
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
  const [selfEstimateOpen, setSelfEstimateOpen] = useState(false);
  const [parkDraft, setParkDraft] = useState("");
  const [parkHint, setParkHint] = useState<string | null>(null);
  const suggestShownRef = useRef(false);
  const parkHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const things = v2NormalizeThings(state.things);
  const thingLabel =
    (focusParam && things.includes(focusParam) ? focusParam : null) ??
    v2PrimaryThing(things) ??
    t("v2.focusDefaultThing");

  const bucketLabel = (b: Bucket) => {
    if (b.durationBucket === "short") return t("v2.focusBucketShort");
    if (b.durationBucket === "medium") return t("v2.focusBucketMedium");
    return t("v2.focusBucketLong");
  };

  const ringMinutesLabel = (b: Bucket) => {
    if (b.durationBucket === "short") return t("v2.focusRingMinutesShort");
    if (b.durationBucket === "medium") return t("v2.focusRingMinutesMedium");
    return t("v2.focusRingMinutesLong");
  };

  useEffect(() => {
    setTasks(loadV2Tasks());
    setSuggestDismissed(false);
    setSuggestError(null);
    setSelfEstimateOpen(false);
    suggestShownRef.current = false;
  }, [thingLabel]);

  // Hervat na refresh / distractie.
  useEffect(() => {
    const snap = loadV2FocusTimer(thingLabel);
    if (snap) {
      const b = BUCKETS.find((x) => x.key === snap.bucketKey) ?? null;
      if (b) {
        setBucket(b);
        // Extended = open-ended: nooit restant-MM:SS hervatten.
        const openEnded = snap.extended === true;
        setRemaining(openEnded ? 0 : snap.remaining);
        setTotalSecs(openEnded ? 0 : snap.totalSecs > 0 ? snap.totalSecs : b.minutes * 60);
        setRunning(snap.running && !snap.finished && !snap.extended);
        setPaused(snap.paused);
        setFinished(snap.finished);
        setExtended(snap.extended);
        if (snap.finished || snap.extended) {
          saveV2FocusTimer({
            ...snap,
            remaining: openEnded ? 0 : snap.remaining,
            totalSecs: openEnded ? 0 : snap.totalSecs,
            running: false,
          });
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
      totalSecs: totalSecs > 0 ? totalSecs : bucket.minutes * 60,
      running,
      paused,
      finished,
      extended,
      updatedAt: Date.now(),
    });
  }, [
    hydrated,
    thingLabel,
    bucket,
    remaining,
    totalSecs,
    running,
    paused,
    finished,
    extended,
  ]);

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
    !extended &&
    !running &&
    !paused &&
    !bucket &&
    thingLabel.trim().length > 0 &&
    thingLabel !== t("v2.focusDefaultThing");

  useEffect(() => {
    if (!showMicroSuggest || suggestShownRef.current) return;
    suggestShownRef.current = true;
    captureProductEvent(ANALYTICS_EVENTS.microsteps_suggest_shown, {
      source: "focus_v2",
    });
  }, [showMicroSuggest]);

  const estimate = useMemo(() => {
    const energy =
      activeTask?.energy ??
      v2EnergyToMicro(state.energy as V2Energy | null);
    return estimateFocusDurationBucket({
      title: activeTask?.title || thingLabel,
      energy,
      taskDurationBucket: activeTask?.durationBucket ?? null,
    });
  }, [activeTask, thingLabel, state.energy]);

  const suggestedBucket = useMemo(
    () => bucketByDuration(estimate.durationBucket),
    [estimate.durationBucket],
  );

  const ringTotal = totalSecs > 0 ? totalSecs : bucket ? bucket.minutes * 60 : 0;
  const ratio =
    bucket && !extended && ringTotal > 0
      ? Math.max(0, Math.min(1, remaining / ringTotal))
      : 1;
  const ringDashOffset = RING_C * (1 - ratio);
  const timerActive = running || paused;
  /** Tijdblind: geen MM:SS tijdens sessie én tijdens open-ended "Nog even bezig". */
  const hideClock = (timerActive || extended) && !finished;
  const preStart = !bucket && !finished && !extended;
  const showSessionDock = (timerActive || extended) && !finished;
  const showFinishDock = finished;

  const persistTasks = (next: V2Task[]) => {
    setTasks(next);
    saveV2Tasks(next);
  };

  const toggleMicroStep = (stepId: string) => {
    if (!activeTask) return;
    persistTasks(
      tasks.map((tRow) => {
        if (tRow.id !== activeTask.id) return tRow;
        return {
          ...tRow,
          microSteps: tRow.microSteps.map((s) =>
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
        durationMin: suggestedBucket.minutes,
        locale: locale === "en" ? "en" : "nl",
      });
      const nextSteps: V2MicroStep[] = result.steps.map((title) => ({
        id: v2Id("ms"),
        title,
        done: false,
      }));
      if (activeTask) {
        persistTasks(
          tasks.map((tRow) =>
            tRow.id === activeTask.id
              ? { ...tRow, microSteps: nextSteps }
              : tRow,
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
      setSuggestError(t("v2.focusMicroSuggestError"));
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
      showParkHint(t("v2.focusParkFull"));
      return;
    }
    saveV2Dump(addV2DumpItem(trimmed, items));
    setParkDraft("");
    captureProductEvent("parked_thought_added", { source: "focus_v2" });
    showParkHint(t("v2.focusParkSaved"));
  };

  useEffect(() => {
    return () => {
      if (parkHintTimerRef.current) clearTimeout(parkHintTimerRef.current);
    };
  }, []);

  const start = (b: Bucket) => {
    const secs = b.minutes * 60;
    setBucket(b);
    setRemaining(secs);
    setTotalSecs(secs);
    setFinished(false);
    setExtended(false);
    setPaused(false);
    setRunning(true);
    setSelfEstimateOpen(false);
    recordV2FocusStart(thingLabel);
  };

  /** Zachte verlenging: +kort bakje, klok blijft verborgen. */
  const extendSoft = () => {
    setRemaining((prev) => prev + EXTEND_SECS);
    setTotalSecs((prev) =>
      (prev > 0 ? prev : bucket ? bucket.minutes * 60 : EXTEND_SECS) +
      EXTEND_SECS,
    );
    setFinished(false);
    setExtended(false);
    if (!running) {
      setPaused(false);
      setRunning(true);
    }
  };

  /**
   * Open-ended doorgaan zonder restant-countdown.
   * Root cause van "04:15": Afronden liet remaining staan; extended + running:false
   * zette hideClock uit, waardoor een bevroren MM:SS verscheen.
   */
  const handleStillBusy = () => {
    setFinished(false);
    setExtended(true);
    setRunning(false);
    setPaused(false);
    setRemaining(0);
    setTotalSecs(0);
  };

  const handleDone = () => {
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
    setTotalSecs(0);
    setSelfEstimateOpen(false);
    clearV2FocusTimer();
  };

  const parkForm = (
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
        placeholder={t("v2.focusParkPlaceholder")}
        className="v2-focus-park__input"
        autoComplete="off"
        aria-label={t("v2.focusParkAria")}
      />
      <button
        type="submit"
        className="v2-focus-park__save"
        disabled={parkDraft.trim().length === 0}
      >
        {t("v2.focusParkSave")}
      </button>
    </form>
  );

  return (
    <div
      data-mode="focus"
      className="v2-focus-shell flex min-h-[100dvh] w-full flex-col"
      style={{ background: "var(--surface)", color: "var(--text)" }}
    >
      <style>{v2ScopedCss}</style>
      <div className="v2-focus-topbar">
        <button type="button" onClick={() => go("/v2/home")} className="v2-link">
          {t("v2.focusClose")}
        </button>
        {paused ? (
          <span className="v2-focus-topbar__status">{t("v2.focusPaused")}</span>
        ) : (
          <span className="w-16" aria-hidden />
        )}
      </div>

      <div className="v2-focus-stage">
        <div className="v2-focus-stage__inner">
          <div className="v2-info-head v2-info-head--center">
            <p className="v2-focus-kicker">{t("v2.focusNow")}</p>
            {preStart ? (
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
          <h1 className="v2-serif v2-focus-title">{thingLabel}</h1>

          {finished ? (
            <div
              className="v2-focus-done"
              role="img"
              aria-label={t("v2.focusDone")}
            >
              <span className="v2-focus-done__mark" aria-hidden>
                ✓
              </span>
            </div>
          ) : (
            <div
              className={`v2-focus-ring ${extended ? "v2-focus-ring--soft" : ""}`}
            >
              <svg viewBox="0 0 210 210" aria-hidden className="h-full w-full">
                <circle
                  cx="105"
                  cy="105"
                  r={RING_R}
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth="10"
                />
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
                    fill="rgba(95, 184, 175, 0.08)"
                    stroke="var(--accent)"
                    strokeWidth="10"
                    strokeOpacity="0.35"
                  />
                ) : null}
              </svg>
              <div className="v2-focus-ring__center">
                {extended ? (
                  <>
                    <div className="v2-focus-ring__ellipsis" aria-hidden>
                      ···
                    </div>
                    <p className="v2-focus-ring__soft">
                      {t("v2.focusExtendedSoft")}
                    </p>
                  </>
                ) : hideClock ? (
                  <div className="v2-focus-ring__ellipsis" aria-hidden>
                    ···
                  </div>
                ) : preStart ? (
                  <>
                    <div className="v2-focus-ring__approx">
                      {t("v2.focusApprox")}
                    </div>
                    <div className="v2-focus-ring__bucket">
                      {ringMinutesLabel(suggestedBucket)}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="v2-focus-ring__time">
                      {bucket ? formatTime(remaining) : "--:--"}
                    </div>
                    <div className="v2-focus-ring__bucket-label">
                      {bucket
                        ? ringMinutesLabel(bucket)
                        : t("v2.focusPickDuration")}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {showMicroList ? (
            <ul
              className="v2-focus-micro-list"
              aria-label={t("v2.focusMicroListAria")}
            >
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
            <section className="v2-focus-micro-suggest" aria-live="polite">
              <p className="v2-focus-micro-suggest__title">
                {t("v2.focusMicroSuggestTitle")}
              </p>
              <p className="v2-focus-micro-suggest__lead">
                {t("v2.focusMicroSuggestLead")}
              </p>
              <button
                type="button"
                onClick={() => void applySuggestedSteps()}
                disabled={suggestBusy}
                className="btn-primary w-full"
              >
                {suggestBusy
                  ? t("v2.focusMicroSuggestBusy")
                  : t("v2.focusMicroSuggestCta")}
              </button>
              <button
                type="button"
                onClick={() => setSuggestDismissed(true)}
                className="v2-link mt-2 w-full text-center"
              >
                {t("v2.focusMicroSuggestSkip")}
              </button>
              {suggestError ? (
                <p className="v2-focus-micro-suggest__err">{suggestError}</p>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>

      <div className="v2-focus-dock">
        {preStart ? (
          <div className="v2-focus-dock__stack">
            <button
              type="button"
              onClick={() => start(suggestedBucket)}
              className="btn-primary w-full"
            >
              {t("v2.focusStart")}
            </button>
            {!selfEstimateOpen ? (
              <button
                type="button"
                onClick={() => setSelfEstimateOpen(true)}
                className="v2-link"
              >
                {t("v2.focusEstimateSelf")}
              </button>
            ) : (
              <div className="v2-focus-self-buckets">
                {BUCKETS.map((b) => (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => start(b)}
                    className="btn-ghost w-full"
                  >
                    {bucketLabel(b)}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {showSessionDock ? (
          <div className="v2-focus-dock__stack">
            {extended ? (
              <button
                type="button"
                onClick={handleDone}
                className="btn-primary w-full"
              >
                {t("v2.focusDone")}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                className="btn-primary w-full"
              >
                {paused ? t("v2.focusResume") : t("v2.focusPause")}
              </button>
            )}
            {!extended ? (
              <button type="button" onClick={extendSoft} className="v2-link">
                {t("v2.focusExtend")}
              </button>
            ) : null}
            {!extended ? (
              <button
                type="button"
                onClick={() => {
                  setRunning(false);
                  setPaused(false);
                  setFinished(true);
                }}
                className="v2-link"
              >
                {t("v2.focusFinish")}
              </button>
            ) : null}
            {parkForm}
            {parkHint ? (
              <p className="v2-focus-park__hint" aria-live="polite">
                {parkHint}
              </p>
            ) : null}
          </div>
        ) : null}

        {showFinishDock ? (
          <div className="v2-focus-dock__stack">
            <button
              type="button"
              onClick={handleDone}
              className="btn-primary w-full"
            >
              {t("v2.focusDone")}
            </button>
            <button type="button" onClick={handleStillBusy} className="v2-link">
              {t("v2.focusStillBusy")}
            </button>
            <button type="button" onClick={reset} className="v2-link">
              {t("v2.focusAnotherRound")}
            </button>
          </div>
        ) : null}
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
