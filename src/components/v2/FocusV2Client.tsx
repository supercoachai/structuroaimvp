"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { HAPTIC_PATTERNS, triggerHaptic } from "@/lib/haptics";
import { useI18n } from "@/lib/i18n";
import {
  captureFocusSessionAbandoned,
  captureFocusSessionCompleted,
  captureFocusSessionEndedEarly,
  captureFocusSessionStarted,
} from "@/lib/posthog/focusSessionEvents";
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
import V2DoneAckOverlay from "./V2DoneAckOverlay";
import { takeNextV2DoneQuote } from "./v2DoneQuotes";
import { loadV2DoneTally, recordV2Done, type V2DoneTallyTick } from "./v2DoneTally";
import { recordV2FocusSession } from "./v2FocusTally";
import { v2NormalizeThings, v2PrimaryThing } from "./v2Things";
import { markV2FirstValue } from "./v2CycleOptInPrompt";
import {
  isLastDagstartThing,
  v2ShutdownHref,
} from "./v2LastTaskShutdown";
import { trackV2LastTaskShutdownStarted } from "./v2Analytics";
import { recordV2FocusCompleted, recordV2FocusStart } from "./v2OpenTaskReminder";
import {
  clearV2FocusTimer,
  loadV2FocusTimer,
  saveV2FocusTimer,
} from "./v2FocusTimer";
import { v2ActiveMicroStepIndex, v2EnergyToMicro } from "./v2FocusMicro";
import { estimateFocusDurationBucket } from "./v2FocusDurationEstimate";
import {
  clampFocusCustomMinutes,
  parseFocusCustomMinutes,
  V2_FOCUS_CUSTOM_BUCKET_KEY,
  V2_FOCUS_CUSTOM_MAX,
  V2_FOCUS_CUSTOM_MIN,
} from "./v2FocusCustomMinutes";
import {
  addV2DumpItem,
  loadV2Dump,
  saveV2Dump,
  v2DumpAtMax,
} from "./v2Dump";
import V2HoldToConfirmButton from "./V2HoldToConfirmButton";

type Bucket = {
  key: string;
  minutes: number;
  durationBucket: Exclude<V2DurationBucket, null> | "custom";
};

/** Grove bakken in plaats van een minuten-input (tijdblindheid). */
const BUCKETS: Bucket[] = [
  { key: "kort", minutes: 5, durationBucket: "short" },
  { key: "middel", minutes: 15, durationBucket: "medium" },
  { key: "lang", minutes: 25, durationBucket: "long" },
];

const EXTEND_SECS = BUCKETS[0].minutes * 60;

/** 3 → 2 → 1 vóór de echte focus-timer, zoals v1. */
const COUNT_IN_FROM = 3;

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

function makeCustomBucket(minutes: number): Bucket {
  return {
    key: V2_FOCUS_CUSTOM_BUCKET_KEY,
    minutes: clampFocusCustomMinutes(minutes),
    durationBucket: "custom",
  };
}

function bucketFromSnapshot(
  bucketKey: string,
  totalSecs: number,
  remaining: number,
): Bucket | null {
  if (bucketKey === V2_FOCUS_CUSTOM_BUCKET_KEY) {
    const fromTotal = totalSecs > 0 ? totalSecs / 60 : remaining / 60;
    return makeCustomBucket(fromTotal > 0 ? fromTotal : V2_FOCUS_CUSTOM_MIN);
  }
  return BUCKETS.find((x) => x.key === bucketKey) ?? null;
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
  const [acknowledging, setAcknowledging] = useState(false);
  const [doneTick, setDoneTick] = useState<V2DoneTallyTick | null>(null);
  const [ackTitle, setAckTitle] = useState<string | null>(null);
  const [doneQuote, setDoneQuote] = useState("");
  const [extended, setExtended] = useState(false);
  /** null = geen aftel; 3/2/1 = pre-start countdown. */
  const [countIn, setCountIn] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [tasks, setTasks] = useState<V2Task[]>([]);
  const [suggestBusy, setSuggestBusy] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggestDismissed, setSuggestDismissed] = useState(false);
  const [selfEstimateOpen, setSelfEstimateOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customMinutes, setCustomMinutes] = useState("");
  const [customHint, setCustomHint] = useState<string | null>(null);
  const [parkDraft, setParkDraft] = useState("");
  const [parkHint, setParkHint] = useState<string | null>(null);
  const suggestShownRef = useRef(false);
  const customInputRef = useRef<HTMLInputElement | null>(null);
  const parkHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingNavRef = useRef<{ things: string[]; todayDone: boolean } | null>(
    null,
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countInRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Voorkomt dubbele focus_session_* events in één timer-run. */
  const focusStartedRef = useRef(false);
  const focusEndedRef = useRef(false);
  const focusLiveRef = useRef({
    running: false,
    finished: false,
    remaining: 0,
    plannedMinutes: 0,
    thingLabel: "",
    energy: null as string | null,
  });

  const things = v2NormalizeThings(state.things);
  const liveThingLabel =
    (focusParam && things.includes(focusParam) ? focusParam : null) ??
    v2PrimaryThing(things) ??
    t("v2.focusDefaultThing");
  // Bevries de titel tijdens het afrondscherm, anders flitst de volgende taak
  // zodra `things` wordt bijgewerkt vóór de navigatie.
  const thingLabel =
    acknowledging && ackTitle ? ackTitle : liveThingLabel;

  const bucketLabel = (b: Bucket) => {
    if (b.durationBucket === "short") return t("v2.focusBucketShort");
    if (b.durationBucket === "medium") return t("v2.focusBucketMedium");
    if (b.durationBucket === "custom") {
      return t("v2.focusRingMinutesCustom", { n: String(b.minutes) });
    }
    return t("v2.focusBucketLong");
  };

  const ringMinutesLabel = (b: Bucket) => {
    if (b.durationBucket === "short") return t("v2.focusRingMinutesShort");
    if (b.durationBucket === "medium") return t("v2.focusRingMinutesMedium");
    if (b.durationBucket === "custom") {
      return t("v2.focusRingMinutesCustom", { n: String(b.minutes) });
    }
    return t("v2.focusRingMinutesLong");
  };

  useEffect(() => {
    if (acknowledging) return;
    setTasks(loadV2Tasks());
    loadV2DoneTally();
    setSuggestDismissed(false);
    setSuggestError(null);
    setSelfEstimateOpen(false);
    setCustomOpen(false);
    setCustomMinutes("");
    setCustomHint(null);
    suggestShownRef.current = false;
  }, [thingLabel, acknowledging]);

  useEffect(() => {
    if (!customOpen) return;
    const id = window.setTimeout(() => customInputRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, [customOpen]);

  // Hervat na refresh / distractie.
  useEffect(() => {
    if (acknowledging) return;
    const snap = loadV2FocusTimer(thingLabel);
    if (snap) {
      const b = bucketFromSnapshot(
        snap.bucketKey,
        snap.totalSecs,
        snap.remaining,
      );
      if (b) {
        setBucket(b);
        // Extended = open-ended: nooit restant-MM:SS hervatten.
        const openEnded = snap.extended === true;
        setRemaining(openEnded ? 0 : snap.remaining);
        setTotalSecs(openEnded ? 0 : snap.totalSecs > 0 ? snap.totalSecs : b.minutes * 60);
        setPaused(snap.paused);
        setFinished(snap.finished);
        setExtended(snap.extended);
        // Refresh tijdens 3-2-1: opnieuw aftellen i.p.v. vastzitten zonder dock.
        const stuckPreRun =
          !snap.running &&
          !snap.paused &&
          !snap.finished &&
          !snap.extended &&
          snap.remaining > 0;
        if (stuckPreRun) {
          setRunning(false);
          setCountIn(COUNT_IN_FROM);
        } else {
          setCountIn(null);
          setRunning(snap.running && !snap.finished && !snap.extended);
        }
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
  }, [thingLabel, acknowledging]);

  // Persist timer-state.
  useEffect(() => {
    if (!hydrated) return;
    // Tijdens 3-2-1 nog niet opslaan: voorkomt stuck state na refresh.
    if (countIn != null) return;
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
    countIn,
  ]);

  useEffect(() => {
    focusLiveRef.current = {
      running,
      finished,
      remaining,
      plannedMinutes: bucket?.minutes ?? 0,
      thingLabel,
      energy: (state.energy as string | null) ?? null,
    };
  }, [running, finished, remaining, bucket, thingLabel, state.energy]);

  // Start-event zodra de echte timer loopt (na 3-2-1).
  useEffect(() => {
    if (!running || !bucket || focusStartedRef.current) return;
    focusStartedRef.current = true;
    focusEndedRef.current = false;
    captureFocusSessionStarted({
      plannedMinutes: bucket.minutes,
      taskId: thingLabel,
      energy: state.energy,
    });
  }, [running, bucket, thingLabel, state.energy]);

  // Natuurlijk klaar.
  useEffect(() => {
    if (!finished || !bucket || focusEndedRef.current) return;
    if (!focusStartedRef.current) return;
    focusEndedRef.current = true;
    captureFocusSessionCompleted({
      plannedMinutes: bucket.minutes,
      timeLeftSec: 0,
      taskId: thingLabel,
      energy: state.energy,
    });
  }, [finished, bucket, thingLabel, state.energy]);

  // Navigatie weg tijdens lopende sessie.
  useEffect(() => {
    return () => {
      const live = focusLiveRef.current;
      if (!focusStartedRef.current || focusEndedRef.current) return;
      if (!live.running || live.finished) return;
      focusEndedRef.current = true;
      captureFocusSessionAbandoned({
        plannedMinutes: live.plannedMinutes,
        timeLeftSec: live.remaining,
        taskId: live.thingLabel,
        energy: live.energy,
        reason: "navigation",
      });
    };
  }, []);

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

  // 3-2-1 aftel vóór de timer. Soft haptic per tik als de browser het toelaat.
  useEffect(() => {
    if (countIn == null) return;
    try {
      navigator.vibrate?.(12);
    } catch {
      /* ignore */
    }
    countInRef.current = setTimeout(() => {
      setCountIn((prev) => {
        if (prev == null) return null;
        if (prev <= 1) {
          setRunning(true);
          setPaused(false);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (countInRef.current) clearTimeout(countInRef.current);
    };
  }, [countIn]);

  const activeTask = useMemo(
    () => findV2TaskByTitle(tasks, thingLabel),
    [tasks, thingLabel],
  );
  const microSteps: V2MicroStep[] = activeTask?.microSteps ?? [];
  const activeMicroIdx = v2ActiveMicroStepIndex(microSteps);
  const showMicroList = microSteps.length > 0 && !finished && !acknowledging && countIn == null;
  const allMicrosDone =
    microSteps.length > 0 && microSteps.every((s) => s.done);
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
      source: "focus",
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
  /** Tijdblind: geen MM:SS tijdens sessie én tijdens open-ended "Nog bezig". */
  const hideClock = (timerActive || extended) && !finished;
  const preStart = !bucket && !finished && !extended && countIn == null;
  const countingIn = countIn != null;
  const focusLive = (running && !paused) || countingIn;
  const showSessionDock = (timerActive || extended) && !finished && !acknowledging && !countingIn;
  const showFinishDock = finished && !acknowledging;

  const persistTasks = (next: V2Task[]) => {
    setTasks(next);
    saveV2Tasks(next);
  };

  const toggleMicroStep = (stepId: string) => {
    if (!activeTask) return;
    const step = activeTask.microSteps.find((s) => s.id === stepId);
    const markingDone = step ? !step.done : false;
    const next = tasks.map((tRow) => {
      if (tRow.id !== activeTask.id) return tRow;
      return {
        ...tRow,
        microSteps: tRow.microSteps.map((s) =>
          s.id === stepId ? { ...s, done: !s.done } : s,
        ),
      };
    });
    persistTasks(next);
    if (markingDone) {
      const nextTask = next.find((tRow) => tRow.id === activeTask.id);
      const last =
        nextTask != null &&
        nextTask.microSteps.length > 0 &&
        nextTask.microSteps.every((s) => s.done);
      triggerHaptic(
        last ? HAPTIC_PATTERNS.TASK_DONE : HAPTIC_PATTERNS.MICROSTEP_DONE,
        { respectReducedMotion: true },
      );
    }
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
      const nextSteps: V2MicroStep[] = result.steps.slice(0, 4).map((title) => ({
        id: v2Id("ms"),
        title,
        done: false,
      }));
      if (activeTask) {
        const keepDone = activeTask.microSteps.filter((s) => s.done);
        persistTasks(
          tasks.map((tRow) =>
            tRow.id === activeTask.id
              ? { ...tRow, microSteps: [...keepDone, ...nextSteps] }
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
        source: "focus",
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
    captureProductEvent("parked_thought_added", { source: "focus" });
    showParkHint(t("v2.focusParkSaved"));
  };

  useEffect(() => {
    return () => {
      if (parkHintTimerRef.current) clearTimeout(parkHintTimerRef.current);
    };
  }, []);

  const start = (b: Bucket) => {
    const secs = b.minutes * 60;
    // Nog niet persistten tijdens aftel; wis oude snapshot zodat refresh schoon is.
    clearV2FocusTimer();
    focusStartedRef.current = false;
    focusEndedRef.current = false;
    setBucket(b);
    setRemaining(secs);
    setTotalSecs(secs);
    setFinished(false);
    setExtended(false);
    setPaused(false);
    setRunning(false);
    setCountIn(COUNT_IN_FROM);
    setSelfEstimateOpen(false);
    setCustomOpen(false);
    setCustomHint(null);
    recordV2FocusStart(thingLabel);
  };

  const startCustom = () => {
    const mins = parseFocusCustomMinutes(customMinutes);
    if (mins == null) {
      setCustomHint(t("v2.focusCustomInvalid"));
      return;
    }
    start(makeCustomBucket(mins));
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
    setCountIn(null);
    setRemaining(0);
    setTotalSecs(0);
  };

  const handleDone = () => {
    if (acknowledging) return;
    if (
      focusStartedRef.current &&
      !focusEndedRef.current &&
      bucket &&
      !finished
    ) {
      focusEndedRef.current = true;
      captureFocusSessionEndedEarly({
        plannedMinutes: bucket.minutes,
        timeLeftSec: remaining,
        taskId: thingLabel,
        energy: state.energy,
        reason: extended ? "open_ended_done" : "manual_complete",
      });
    }
    const nextTasks = completeV2TaskByTitle(tasks, thingLabel);
    const newlyCompleted = nextTasks !== tasks;
    persistTasks(nextTasks);
    const remainingThings = removeV2ThingFromList(things, thingLabel);
    const lastThing = isLastDagstartThing(things, thingLabel);
    pendingNavRef.current = {
      things: remainingThings,
      todayDone: false,
    };
    if (newlyCompleted) {
      setDoneTick(recordV2Done());
    } else {
      const tally = loadV2DoneTally();
      setDoneTick({
        weekFrom: tally.weekCount,
        weekTo: tally.weekCount,
        totalFrom: tally.total,
        totalTo: tally.total,
      });
    }
    recordV2FocusSession();
    recordV2FocusCompleted(thingLabel);
    markV2FirstValue();
    clearV2FocusTimer();
    setRunning(false);
    setPaused(false);
    setExtended(false);
    setFinished(true);
    if (lastThing) {
      trackV2LastTaskShutdownStarted({ source: "focus" });
      go(v2ShutdownHref(), { things: [], todayDone: false }, { hard: true });
      return;
    }
    setAckTitle(thingLabel);
    setDoneQuote(takeNextV2DoneQuote(locale));
    setAcknowledging(true);
  };

  const finishFocusAck = () => {
    const nav = pendingNavRef.current;
    pendingNavRef.current = null;
    const home =
      typeof window !== "undefined" && window.location.pathname.startsWith("/v2")
        ? "/v2/home"
        : "/";
    // Hard nav: soft-push werd geannuleerd door de V2-state update, en
    // één frame van de volgende taak werd zichtbaar. Overlay blijft tot unload.
    if (nav) {
      go(home, { things: nav.things, todayDone: nav.todayDone }, { hard: true });
      return;
    }
    go(home, undefined, { hard: true });
  };

  const reset = () => {
    if (focusStartedRef.current && !focusEndedRef.current && bucket) {
      focusEndedRef.current = true;
      captureFocusSessionAbandoned({
        plannedMinutes: bucket.minutes,
        timeLeftSec: remaining,
        taskId: thingLabel,
        energy: state.energy,
        reason: "user_cancelled",
      });
    }
    focusStartedRef.current = false;
    setRunning(false);
    setPaused(false);
    setFinished(false);
    setExtended(false);
    setCountIn(null);
    setBucket(null);
    setRemaining(0);
    setTotalSecs(0);
    setSelfEstimateOpen(false);
    setCustomOpen(false);
    setCustomMinutes("");
    setCustomHint(null);
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
      {acknowledging && doneTick ? (
        <V2DoneAckOverlay
          title={ackTitle ?? thingLabel}
          tick={doneTick}
          quote={doneQuote}
          actionLabel={t("v2.doneAckHome")}
          onAction={finishFocusAck}
        />
      ) : null}
      <div className="v2-focus-topbar" hidden={acknowledging}>
        <button type="button" onClick={() => go("/")} className="v2-link">
          {t("v2.focusClose")}
        </button>
        {paused ? (
          <span className="v2-focus-topbar__status">{t("v2.focusPaused")}</span>
        ) : (
          <span className="w-16" aria-hidden />
        )}
      </div>

      <div className="v2-focus-stage" hidden={acknowledging}>
        <div className="v2-focus-stage__inner">
          <div className="v2-info-head v2-info-head--center">
            <p className="v2-focus-kicker">
              {countingIn ? t("v2.focusCountInKicker") : t("v2.focusNow")}
            </p>
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
            <div className="v2-focus-done-wrap">
              <div
                className="v2-focus-done"
                role="img"
                aria-label={t("v2.focusDone")}
              >
                <span className="v2-focus-done__mark v2-done-ack-check" aria-hidden>
                  ✓
                </span>
              </div>
            </div>
          ) : (
            <div
              className={[
                "v2-focus-ring",
                extended ? "v2-focus-ring--soft" : "",
                focusLive ? "v2-focus-ring--live" : "",
                countingIn ? "v2-focus-ring--countin" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              role="timer"
              aria-live={countingIn ? "assertive" : "off"}
              aria-label={
                countingIn
                  ? t("v2.focusCountInAria", { n: String(countIn) })
                  : focusLive
                    ? t("v2.focusLiveAria")
                    : undefined
              }
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
                    className="v2-focus-ring__progress"
                    cx="105"
                    cy="105"
                    r={RING_R}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={RING_C}
                    strokeDashoffset={countingIn ? 0 : ringDashOffset}
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
                {countingIn ? (
                  <div key={countIn} className="v2-focus-ring__countin">
                    {countIn}
                  </div>
                ) : extended ? (
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

          {showMicroList && allMicrosDone ? (
            <p className="v2-done-ack v2-done-ack--block" role="status">
              {t("v2.doneAckLastStep")}
            </p>
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
          ) : microSteps.length === 0 &&
            suggestDismissed &&
            !finished &&
            !extended &&
            !running &&
            !paused &&
            !bucket ? (
            <button
              type="button"
              onClick={() => {
                setSuggestDismissed(false);
                void applySuggestedSteps();
              }}
              disabled={suggestBusy}
              className="v2-link mt-2 w-full text-center"
            >
              {suggestBusy
                ? t("v2.focusMicroSuggestBusy")
                : t("v2.focusMicroSuggestRetry")}
            </button>
          ) : null}
        </div>
      </div>

      <div className="v2-focus-dock" hidden={acknowledging}>
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
                {!customOpen ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomOpen(true);
                      setCustomHint(null);
                    }}
                    className="v2-link"
                  >
                    {t("v2.focusCustomPick")}
                  </button>
                ) : (
                  <form
                    className="v2-focus-custom"
                    onSubmit={(e) => {
                      e.preventDefault();
                      startCustom();
                    }}
                  >
                    <label className="sr-only" htmlFor="v2-focus-custom-min">
                      {t("v2.focusCustomAria")}
                    </label>
                    <input
                      ref={customInputRef}
                      id="v2-focus-custom-min"
                      type="number"
                      inputMode="numeric"
                      autoComplete="off"
                      min={V2_FOCUS_CUSTOM_MIN}
                      max={V2_FOCUS_CUSTOM_MAX}
                      value={customMinutes}
                      onChange={(e) => {
                        setCustomMinutes(e.target.value);
                        setCustomHint(null);
                      }}
                      placeholder={t("v2.focusCustomPh")}
                      className="v2-focus-custom__input"
                    />
                    <button
                      type="submit"
                      className="btn-ghost w-full"
                      disabled={parseFocusCustomMinutes(customMinutes) == null}
                    >
                      {t("v2.focusCustomStart")}
                    </button>
                    {customHint ? (
                      <p className="v2-focus-custom__hint" role="status">
                        {customHint}
                      </p>
                    ) : null}
                  </form>
                )}
              </div>
            )}
          </div>
        ) : null}

        {showSessionDock ? (
          <div className="v2-focus-dock__stack">
            {extended ? (
              <V2HoldToConfirmButton
                label={t("v2.focusDone")}
                holdHint={t("v2.focusDoneHoldHint")}
                tapHint={t("v2.focusDoneTapHint")}
                onConfirm={handleDone}
                className="btn-primary w-full"
              />
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
            <V2HoldToConfirmButton
              label={t("v2.focusDone")}
              holdHint={t("v2.focusDoneHoldHint")}
              tapHint={t("v2.focusDoneTapHint")}
              onConfirm={handleDone}
              className="btn-primary w-full"
            />
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
