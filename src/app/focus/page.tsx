"use client";

import { useState, useEffect, useMemo, useRef, useCallback, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useClientSearchParams } from '@/hooks/useClientSearchParams';
import { DopamineAirlock } from '@/components/DopamineAirlock';
import { track } from '../../shared/track';
import {
  trackFocusAbandoned,
  trackFocusCompleted,
  trackFocusModeStarted,
  trackFocusStarted,
  trackTaskCompleted,
} from '@/utils/events';
import { toast } from '../../components/Toast';
import { useTaskContext } from '../../context/TaskContext';
import { useCheckIn } from '../../hooks/useCheckIn';
import { parkFocusTaskSilently } from '@/lib/parkFocusTask';
import { getRandomAdhdPlanningQuote } from '../../lib/adhdQuotes';
import { normalizeMicroSteps, microStepId, type MicroStep, type MicroStepDifficulty } from '../../lib/microSteps';
import { useUser } from '@/hooks/useUser';
import { insertParkedThought, countActiveParkedThoughts } from '@/lib/supabase/parkedThoughtsDb';
import { triggerHaptic, HAPTIC_PATTERNS } from '@/lib/haptics';
import { getTaskDurationMinutes } from '@/lib/taskDurationMinutes';
import { getFirstOpenTop3Task } from '@/lib/top3CurrentTask';
import { useI18n } from '@/lib/i18n';
import { captureProductEvent } from '@/lib/posthog/track';
import { focusPlannedMinutesBucket } from '@/lib/posthog/durationBuckets';
import { useViewportContentFit } from '@/hooks/useViewportContentFit';
import InfoButton from '@/components/info/InfoButton';
import {
  ChevronRightIcon,
  SparklesIcon,
  PauseIcon,
  PlayIcon,
  CheckIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

const countdownDigitStyle = `
  @keyframes structuro-countdown-pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
  .structuro-countdown-digit {
    animation: structuro-countdown-pulse 1s ease-in-out forwards;
  }
`;

const FOCUS_FIT_MIN_SCALE = 0.62;

function useFocusContentFit(
  viewportRef: React.RefObject<HTMLDivElement | null>,
  contentRef: React.RefObject<HTMLDivElement | null>,
  deps: unknown[]
) {
  return useViewportContentFit(viewportRef, contentRef, deps, FOCUS_FIT_MIN_SCALE);
}

function FocusContent() {
  const fireCompletionConfetti = useCallback(() => {
    void import('canvas-confetti')
      .then(({ default: confetti }) => {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#10B981', '#3B82F6', '#8B5CF6'],
          disableForReducedMotion: true,
          zIndex: 10002,
        });
      })
      .catch((err) => {
        console.warn('confetti import failed', err);
      });
  }, []);

  const { locale, t: tr } = useI18n();
  const router = useRouter();
  const searchParams = useClientSearchParams();
  const { addTask, tasks, fetchTasks, updateTask, loading: tasksLoading } = useTaskContext();
  const { checkIn, saveCheckIn, loading: checkInLoading } = useCheckIn();
  const { user } = useUser();
  const [nuNietBusy, setNuNietBusy] = useState(false);
  const [taskTitle, setTaskTitle] = useState(searchParams?.get("task") || "");
  const [parkedCount, setParkedCount] = useState(0);
  const [showFocusCard, setShowFocusCard] = useState(true);
  const [inlineNewStep, setInlineNewStep] = useState('');
  const [isAirlockActive, setIsAirlockActive] = useState(false);
  const [microUndoSnapshot, setMicroUndoSnapshot] = useState<MicroStep[] | null>(null);
  const microUndoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const parkThoughtInputRef = useRef<HTMLInputElement | null>(null);
  const focusFitViewportRef = useRef<HTMLDivElement | null>(null);
  const focusFitContentRef = useRef<HTMLDivElement | null>(null);

  const currentTask = useMemo(() => {
    const taskParam = searchParams?.get('task');
    if (taskParam) {
      let task = tasks.find(t => t.id === taskParam);
      if (!task) task = tasks.find(t => t.title === taskParam);
      if (task) return task;
    }
    return getFirstOpenTop3Task(tasks, checkIn);
  }, [tasks, searchParams, checkIn]);

  useEffect(() => {
    if (!user?.id) return;
    countActiveParkedThoughts(user.id)
      .then(setParkedCount)
      .catch(() => setParkedCount(0));
  }, [user?.id]);

  useEffect(() => {
    const handleTaskUpdate = () => { fetchTasks(); };
    if (typeof window !== 'undefined') {
      window.addEventListener('structuro_tasks_updated', handleTaskUpdate);
      return () => { window.removeEventListener('structuro_tasks_updated', handleTaskUpdate); };
    }
  }, [fetchTasks]);

  const [duration, setDuration] = useState(() => {
    const qp = searchParams?.get('duration');
    if (qp) {
      const n = parseInt(qp, 10);
      if (Number.isFinite(n) && n > 0) return Math.min(480, n);
    }
    return 15;
  });

  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [showCountdown, setShowCountdown] = useState(false);
  /** Na "1": 500ms fade-out voordat de focus-sessie start. */
  const [countdownFadeOut, setCountdownFadeOut] = useState(false);
  const endAtRef = useRef<number | null>(null);
  /** Laatste taak waarvan we de geplande minuten naar state hebben gesynchroniseerd (geen overschrijven na verlenging / zelfde sessie). */
  const lastSyncedTaskIdRef = useRef<string | null>(null);

  const [showTimeUpPrompt, setShowTimeUpPrompt] = useState(false);
  const [extendMinutes, setExtendMinutes] = useState<number>(10);
  const [timeUpQuote, setTimeUpQuote] = useState<string>('');
  const focusOpenedTaskIdRef = useRef<string | null>(null);

  const markFocusOpened = useCallback(async () => {
    if (!currentTask?.id) return;
    await updateTask(currentTask.id, {
      focusStartedAt: new Date().toISOString(),
      focusAttempts: (currentTask.focusAttempts ?? 0) + 1,
    });
  }, [currentTask, updateTask]);

  const markFocusExitedWithoutCompletion = useCallback(async () => {
    if (!currentTask?.id) return;
    if (currentTask.done) return;
    await updateTask(currentTask.id, {
      focusExitedAt: new Date().toISOString(),
    });
  }, [currentTask, updateTask]);

  useEffect(() => {
    if (!currentTask?.id) return;
    if (focusOpenedTaskIdRef.current === currentTask.id) return;
    focusOpenedTaskIdRef.current = currentTask.id;
    void markFocusOpened();
  }, [currentTask?.id, markFocusOpened]);

  const SluitenButton = () => (
    <button
      type="button"
      onClick={async () => {
        if (isRunning || isPaused || showTimeUpPrompt) {
          const ok = confirm(
            tr("focus.closeConfirm")
          );
          if (!ok) return;
          await markFocusExitedWithoutCompletion();
        }
        router.push('/');
      }}
      className="flex items-center gap-1.5 py-1.5 text-[13px] font-medium text-[#94A3B8] transition hover:text-white"
    >
      <span className="inline-flex rotate-180" aria-hidden>
        <ChevronRightIcon className="h-3.5 w-3.5" />
      </span>
      {tr("common.close")}
    </button>
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!isRunning || isPaused) { document.title = 'Structuro'; return; }
    const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const ss = String(timeLeft % 60).padStart(2, '0');
    const name = (currentTask?.title || taskTitle || tr("focus.sessionDefault")).trim();
    document.title = `(${mm}:${ss}) ${name} | Structuro`;
    return () => { document.title = 'Structuro'; };
  }, [isRunning, isPaused, timeLeft, currentTask?.title, taskTitle, tr]);

  useEffect(() => {
    if (!isRunning) setTimeLeft(duration * 60);
  }, [duration, isRunning]);

  useEffect(() => {
    if (!showCountdown) return;

    if (countdownFadeOut) {
      const t = setTimeout(() => {
        setShowCountdown(false);
        setCountdownFadeOut(false);
        setCountdown(3);
        setIsRunning(true);
        endAtRef.current = Date.now() + timeLeft * 1000;
        if (currentTask && !currentTask.started) {
          updateTask(currentTask.id, { started: true }).catch(console.error);
        }
        track('ignite_start', { taskTitle, duration, autoStart: true });
        trackFocusStarted();
        trackFocusModeStarted(
          (currentTask?.energyLevel as "low" | "medium" | "high") ?? "medium",
          getTaskDurationMinutes(currentTask ?? null) ?? duration
        );
        captureProductEvent("focus_session_started");
      }, 500);
      return () => clearTimeout(t);
    }

    if (countdown > 1) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }

    if (countdown === 1) {
      const timer = setTimeout(() => setCountdownFadeOut(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [
    showCountdown,
    countdown,
    countdownFadeOut,
    timeLeft,
    taskTitle,
    duration,
    currentTask,
    updateTask,
  ]);

  useEffect(() => {
    if (!isRunning || isPaused) return;
    if (!endAtRef.current) endAtRef.current = Date.now() + (timeLeft * 1000);
    const tick = () => {
      const endAt = endAtRef.current;
      if (!endAt) return;
      const next = Math.max(0, Math.round((endAt - Date.now()) / 1000));
      setTimeLeft((prev) => (prev === next ? prev : next));
      if (next <= 0) {
        endAtRef.current = null;
        setIsRunning(false);
        setCompleted(false);
        setShowTimeUpPrompt(true);
        setTimeUpQuote(getRandomAdhdPlanningQuote(Date.now(), locale));
        track("ignite_complete", { taskTitle, duration });
        trackFocusCompleted(duration * 60);
        captureProductEvent("focus_session_completed", {
          duration_bucket: focusPlannedMinutesBucket(duration),
          completed_normally: true,
        });
      }
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [isRunning, isPaused, timeLeft, taskTitle, duration, locale]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleUndoMicrostep = useCallback(() => {
    if (!currentTask || !microUndoSnapshot) return;
    if (microUndoTimerRef.current) {
      clearTimeout(microUndoTimerRef.current);
      microUndoTimerRef.current = null;
    }
    void updateTask(currentTask.id, { microSteps: microUndoSnapshot });
    setMicroUndoSnapshot(null);
  }, [currentTask, microUndoSnapshot, updateTask]);

  const handleToggleMicroStep = (stepId: string) => {
    if (!currentTask) return;
    const steps = normalizeMicroSteps(currentTask.microSteps);
    const idx = steps.findIndex(s => s.id === stepId);
    if (idx < 0) return;
    const wasDone = Boolean(steps[idx]?.done);
    const next = steps.map(s => s.id === stepId ? { ...s, done: !s.done } : s);
    const nowDone = Boolean(next[idx]?.done);
    if (!wasDone && nowDone) {
      triggerHaptic(HAPTIC_PATTERNS.MICROSTEP_DONE);
      if (microUndoTimerRef.current) clearTimeout(microUndoTimerRef.current);
      setMicroUndoSnapshot(steps.map(s => ({ ...s })));
      microUndoTimerRef.current = setTimeout(() => {
        setMicroUndoSnapshot(null);
        microUndoTimerRef.current = null;
      }, 400);
    } else {
      setMicroUndoSnapshot(null);
      if (microUndoTimerRef.current) {
        clearTimeout(microUndoTimerRef.current);
        microUndoTimerRef.current = null;
      }
    }
    void updateTask(currentTask.id, { microSteps: next });
  };

  const handleInlineAddStep = async () => {
    if (!currentTask || !inlineNewStep.trim()) return;
    const steps = normalizeMicroSteps(currentTask.microSteps);
    const baseDiff = (['low', 'medium', 'high'].includes(currentTask.energyLevel || '')
      ? currentTask.energyLevel : 'medium') as MicroStepDifficulty;
    const newStep: MicroStep = {
      id: microStepId(),
      title: inlineNewStep.trim(),
      minutes: null,
      difficulty: baseDiff,
      done: false,
    };
    await updateTask(currentTask.id, { microSteps: [...steps, newStep] });
    setInlineNewStep('');
    fetchTasks();
  };

  const startSession = async () => {
    setShowFocusCard(false);
    setCountdownFadeOut(false);
    setShowCountdown(true);
    setCountdown(3);
    setTimeLeft(duration * 60);
    track('ignite_start', { taskTitle: currentTask?.title || taskTitle, duration });
  };

  const pauseSession = () => {
    setIsPaused((prev) => {
      const nextPaused = !prev;
      if (nextPaused) {
        const endAt = endAtRef.current;
        if (endAt) {
          const remaining = Math.max(0, Math.round((endAt - Date.now()) / 1000));
          endAtRef.current = null;
          setTimeLeft(remaining);
        }
      } else {
        endAtRef.current = Date.now() + (timeLeft * 1000);
      }
      track("ignite_pause", { taskTitle, duration, paused: nextPaused });
      return nextPaused;
    });
  };

  const stopSession = () => {
    if (isRunning || isPaused) {
      trackFocusAbandoned(Math.max(0, duration * 60 - timeLeft));
      void markFocusExitedWithoutCompletion();
    }
    setIsRunning(false);
    setIsPaused(false);
    setTimeLeft(duration * 60);
    endAtRef.current = null;
    track("ignite_stop", { taskTitle, duration });
  };

  const resetFocusSessionAfterPark = () => {
    setIsRunning(false);
    setIsPaused(false);
    setShowCountdown(false);
    setCountdownFadeOut(false);
    setShowFocusCard(true);
    setCompleted(false);
    setShowTimeUpPrompt(false);
    endAtRef.current = null;
  };

  const handleNuNietPark = async () => {
    if (!currentTask?.id || nuNietBusy) return;
    setNuNietBusy(true);
    try {
      if (isRunning || isPaused || showTimeUpPrompt) {
        await markFocusExitedWithoutCompletion();
      }
      const { remainingTop3Ids } = await parkFocusTaskSilently(
        currentTask.id,
        checkIn ?? null,
        saveCheckIn,
        updateTask
      );
      resetFocusSessionAfterPark();
      const nextId = remainingTop3Ids.find((id) => {
        const t = tasks.find((x) => x.id === id);
        return t && !t.done;
      });
      if (nextId) {
        const nextTask = tasks.find((x) => x.id === nextId);
        const mins = getTaskDurationMinutes(nextTask ?? null) ?? 15;
        router.replace(
          `/focus?task=${encodeURIComponent(nextId)}&duration=${mins}`
        );
      } else router.push('/');
    } catch (e) {
      console.error('park focus (nu niet):', e);
    } finally {
      setNuNietBusy(false);
    }
  };

  const handleAirlockComplete = useCallback(() => {
    setIsAirlockActive(false);
    router.push('/todo');
  }, [router]);

  const completeCurrentTask = async () => {
    if (!currentTask?.id) {
      toast(tr("focus.noTaskToast"));
      return;
    }
    try {
      triggerHaptic(HAPTIC_PATTERNS.TASK_DONE);
      setIsRunning(false);
      setIsPaused(false);
      setCompleted(false);
      setShowTimeUpPrompt(false);
      setMicroUndoSnapshot(null);
      if (microUndoTimerRef.current) {
        clearTimeout(microUndoTimerRef.current);
        microUndoTimerRef.current = null;
      }
      void updateTask(currentTask.id, {
        done: true,
        completedAt: new Date().toISOString(),
        started: true,
        focusExitedAt: null,
        source: "focus_mode",
      });
      trackTaskCompleted(
        "focus_mode",
        (currentTask.energyLevel as "low" | "medium" | "high") ?? "medium"
      );
      trackFocusCompleted(Math.max(0, duration * 60 - timeLeft));
      captureProductEvent("focus_session_completed", {
        duration_bucket: focusPlannedMinutesBucket(duration),
        completed_normally: false,
      });
      track('task_completed_early', {
        taskId: currentTask.id,
        minutesFocused: Math.max(0, Math.round(((duration * 60 - timeLeft) / 60))),
        durationPlanned: duration,
      });
      fireCompletionConfetti();
      setIsAirlockActive(true);
    } catch (err) {
      console.error("Error completing task:", err);
      toast(tr("focus.completeErr"));
    }
  };

  const handleVoltooienClick = () => {
    if (!currentTask?.id) return;
    if (!confirm(tr("focus.completeConfirm"))) return;
    void completeCurrentTask();
  };

  const extendSession = () => {
    const addSecs = 5 * 60;
    setDuration((prev) => prev + 5);
    setTimeLeft((prev) => prev + addSecs);
    if (endAtRef.current != null) {
      endAtRef.current += addSecs * 1000;
    }
    toast(tr("focus.extendToast"));
    track("ignite_extend", { taskTitle, extendedMinutes: 5 });
  };

  const handleParkThought = async (thoughtText: string) => {
    try {
      if (user?.id) {
        if (parkedCount >= 10) {
          toast(tr("focus.parkMax"));
          return;
        }
        await insertParkedThought(user.id, thoughtText);
        setParkedCount((c) => c + 1);
        if (parkedCount + 1 >= 9) {
          toast(tr("focus.parkWarn"));
        } else {
          toast(tr("focus.parkOk"));
        }
      } else {
        await addTask({
          title: thoughtText, duration: null, priority: null, done: false, started: false,
          dueAt: null, reminders: [], repeat: "none", impact: "🧠",
          source: "parked_thought", energyLevel: 'low', estimatedDuration: null,
        });
        toast(tr("focus.parkOk"));
      }
      captureProductEvent("parked_thought_added");
      track("interruption_parked", { taskTitle, duration, thought: thoughtText });
    } catch (error: any) {
      if (error.message === "max_reached") {
        toast(tr("focus.parkMaxErr"));
        return;
      }
      console.error('Failed to park thought:', error);
      toast(
        tr("focus.parkErr", {
          detail: error.message || tr("passwordSetup.errUnknown"),
        })
      );
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
      if (e.key === " ") { e.preventDefault(); if (isRunning) pauseSession(); }
      else if (e.key === "Escape") { if (isRunning) stopSession(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, isPaused]);

  useEffect(() => {
    if (!currentTask) return;
    setTaskTitle(currentTask.title);
    const taskDuration = getTaskDurationMinutes(currentTask);
    if (taskDuration == null) return;
    if (isRunning || isPaused || showCountdown || showTimeUpPrompt) return;

    const tid = currentTask.id;
    const isNewTask = lastSyncedTaskIdRef.current !== tid;
    if (!isNewTask && !showFocusCard) return;

    setDuration(taskDuration);
    setTimeLeft(taskDuration * 60);
    lastSyncedTaskIdRef.current = tid;
  }, [
    currentTask?.id,
    currentTask?.title,
    currentTask?.duration,
    currentTask?.estimatedDuration,
    isRunning,
    isPaused,
    showCountdown,
    showTimeUpPrompt,
    showFocusCard,
  ]);

  // ─── Derived data ─────────────────────────────
  const existingMicroSteps = normalizeMicroSteps(currentTask?.microSteps);
  const completedStepsCount = existingMicroSteps.filter(s => s.done).length;
  const activeStepIdx = existingMicroSteps.findIndex(s => !s.done);
  const el = currentTask?.energyLevel || "medium";
  const energyLabel =
    el === "low"
      ? tr("focus.energyLow")
      : el === "high"
        ? tr("focus.energyHigh")
        : tr("focus.energyMed");

  const taskParam = searchParams?.get('task');
  const resolvingTask =
    tasksLoading ||
    checkInLoading ||
    (Boolean(taskParam) && tasks.length === 0);

  const timerActive = isRunning || isPaused;
  const showTimerInHeader = timerActive || showTimeUpPrompt;
  const preTimerState = !timerActive && !showTimeUpPrompt;

  const RING_R = 92;
  const RING_C = 2 * Math.PI * RING_R;
  const totalSecs = Math.max(1, duration * 60);
  const progressRatio =
    showTimerInHeader && !showTimeUpPrompt
      ? Math.min(1, Math.max(0, timeLeft / totalSecs))
      : preTimerState
        ? 1
        : 0;
  const ringDashOffset = RING_C * (1 - progressRatio);

  // ─── Microstappen (donker scherm, zelfde logica als design-mock) ───────────────
  const microStepsSection = (
    <div className="focus-screen__micro-card rounded-2xl border border-white/[0.07] bg-white/[0.04]">
      <div className="mb-2 flex items-center gap-2 sm:mb-3">
        <svg className="h-3.5 w-3.5 shrink-0 text-violet-400/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 2 2 7l10 5 10-5-10-5z" />
          <path d="m2 17 10 5 10-5" />
          <path d="m2 12 10 5 10-5" />
        </svg>
        <span className="min-w-0 flex-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">
          {tr("focus.microTitle")}
        </span>
        <InfoButton infoId="microstappen" variant="onDark" autoIntro={false} />
      </div>

      {existingMicroSteps.length > 0 ? (
        <div className="flex flex-col gap-1">
          {existingMicroSteps.map((step, idx) => {
            const isDone = Boolean(step.done);
            const isActive = !isDone && idx === activeStepIdx;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => handleToggleMicroStep(step.id)}
                className={`focus-micro-step flex w-full items-center gap-2.5 rounded-[10px] px-0 text-left transition-colors ${
                  isActive
                    ? 'border border-violet-400/30 bg-violet-500/15 -mx-1 px-3 py-2'
                    : 'border border-transparent py-1.5'
                }`}
              >
                {isDone ? (
                  <>
                    <svg className="h-4 w-4 shrink-0 text-[#22c55e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span className="text-[13.5px] text-[#94A3B8] line-through">{step.title}</span>
                  </>
                ) : isActive ? (
                  <>
                    <div className="h-4 w-4 shrink-0 rounded-full border-2 border-violet-400" />
                    <span className="text-[13.5px] font-semibold text-white">{step.title}</span>
                  </>
                ) : (
                  <>
                    <div className="h-4 w-4 shrink-0 rounded-full border-2 border-[#64748B]" />
                    <span className="text-[13.5px] text-[#94A3B8]">{step.title}</span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="focus-micro-input-row mt-2 flex items-center gap-2 sm:mt-3">
        <input
          type="text"
          value={inlineNewStep}
          onChange={(e) => setInlineNewStep(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleInlineAddStep();
            }
          }}
          placeholder={tr("focus.microPh")}
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-[#64748B] focus:border-violet-400/40 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
        />
        <button
          type="button"
          onClick={handleInlineAddStep}
          disabled={!inlineNewStep.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lg font-light text-white transition hover:bg-white/15 disabled:opacity-40"
        >
          +
        </button>
      </div>

      {microUndoSnapshot && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleUndoMicrostep}
            className="text-xs font-medium text-[#94A3B8] underline decoration-white/20 underline-offset-2 hover:text-white"
          >
            {tr("focus.undo")}
          </button>
        </div>
      )}

      {existingMicroSteps.length > 0 && (
        <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
          <span className="text-sm text-[#64748B]">
            {tr("focus.stepsProgress", {
              done: String(completedStepsCount),
              total: String(existingMicroSteps.length),
            })}
          </span>
          <div className="flex gap-1.5">
            {existingMicroSteps.map((step, idx) => (
              <div
                key={step.id}
                className={`h-2 w-6 rounded-full transition-colors ${
                  step.done ? 'bg-[#22c55e]' : idx === activeStepIdx ? 'bg-violet-500' : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );

  /** Parkeerbalk alleen tijdens actieve focus (timer) of tijd-voorbij-flow, niet vóór Start. */
  const showParkBarInFocus = timerActive || showTimeUpPrompt;

  const focusFitLayout = useFocusContentFit(
    focusFitViewportRef,
    focusFitContentRef,
    [
      currentTask?.id,
      currentTask?.title,
      existingMicroSteps.length,
      timerActive,
      showTimeUpPrompt,
      showCountdown,
      duration,
    ]
  );

  const isPreSession = !timerActive && !showTimeUpPrompt;

  const focusSessionActions = showTimeUpPrompt ? (
    <>
      <p className="mb-1 text-center text-sm italic text-[#94A3B8]">
        &ldquo;{timeUpQuote}&rdquo;
      </p>
      <button
        type="button"
        onClick={() => void completeCurrentTask()}
        className="w-full rounded-xl border-2 border-emerald-500/40 py-2.5 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500/10"
      >
        {tr("focus.yesTaskDone")}
      </button>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {[5, 10, 15, 25].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setExtendMinutes(m)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              extendMinutes === m
                ? 'border-white/20 bg-white/10 text-white'
                : 'border-white/10 text-[#94A3B8] hover:bg-white/5'
            }`}
          >
            +{m} min
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          const extra = Math.max(1, Math.min(480, extendMinutes || 10));
          setShowTimeUpPrompt(false);
          setCompleted(false);
          setIsPaused(false);
          setIsRunning(true);
          setDuration((prev) => prev + extra);
          setTimeLeft(extra * 60);
          endAtRef.current = Date.now() + extra * 60 * 1000;
          track('ignite_extend_after_timeup', { taskTitle, duration, extra });
          toast(tr("focus.extendCheer", { n: String(extra) }));
        }}
        className="w-full rounded-xl border-2 border-white/10 py-2.5 text-sm font-semibold text-[#cbd5e1] transition hover:bg-white/5"
      >
        {tr("focus.extendWith", { n: String(extendMinutes) })}
      </button>
    </>
  ) : timerActive ? (
    <div className="focus-screen__timer-actions">
      <button
        type="button"
        onClick={pauseSession}
        className="mx-auto flex items-center gap-2 font-medium text-[#94A3B8] transition hover:text-white"
      >
        {isPaused ? (
          <PlayIcon className="h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <PauseIcon className="h-4 w-4 shrink-0" aria-hidden />
        )}
        {isPaused ? tr("focus.resume") : tr("focus.pause")}
      </button>
      <button
        type="button"
        onClick={extendSession}
        className="mx-auto flex items-center gap-2 font-medium text-[#94A3B8] transition hover:text-white"
      >
        <ClockIcon className="h-4 w-4 shrink-0" aria-hidden />
        {tr("focus.addFiveMin")}
      </button>
      <button
        type="button"
        onClick={handleVoltooienClick}
        className="mx-auto flex items-center gap-2 font-medium text-[#94A3B8] transition hover:text-white"
      >
        <CheckIcon className="h-4 w-4 shrink-0" aria-hidden />
        {tr("focus.finish")}
      </button>
      <button
        type="button"
        onClick={stopSession}
        className="mx-auto flex items-center gap-2 font-medium text-[#94A3B8] transition hover:text-white"
      >
        <svg
          className="h-4 w-4 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <rect x="7" y="7" width="10" height="10" rx="1.5" />
        </svg>
        {tr("focus.stop")}
      </button>
    </div>
  ) : null;

  const focusPreSessionActions = isPreSession ? (
    <>
      <button
        type="button"
        onClick={() => void handleNuNietPark()}
        disabled={nuNietBusy}
        className="mx-auto block text-center text-[10px] text-[#64748B] transition hover:text-[#94A3B8] disabled:opacity-40 sm:text-[11px]"
      >
        {nuNietBusy ? "…" : tr("focus.nuNiet")}
      </button>
      <button
        type="button"
        onClick={startSession}
        className="w-full rounded-xl bg-[#22c55e] py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(34,197,94,0.3)] transition hover:bg-[#16a34a] sm:py-3.5"
      >
        {tr("focus.startSession")}
      </button>
    </>
  ) : null;

  if (resolvingTask) {
    return (
      <div
        className="flex h-full min-h-[100dvh] w-full items-center justify-center bg-[#0f172a]"
        aria-busy="true"
        aria-label={tr('common.loadingDots')}
      />
    );
  }

  if (showCountdown) {
    return (
      <>
        <style>{countdownDigitStyle}</style>
        <div className="flex min-h-[100dvh] w-full items-center justify-center bg-[var(--structuro-bg)] px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
          <div
            className={`flex w-full max-w-md flex-col items-center text-center transition-opacity duration-500 ease-out ${
              countdownFadeOut ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <div
              key={countdown}
              className="structuro-countdown-digit font-mono text-[120px] font-bold leading-none tabular-nums text-[#0F172A]"
              aria-live="polite"
              aria-atomic="true"
            >
              {countdown}
            </div>
            <div className="mt-6 space-y-1">
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                {tr("focus.countdownUp")}
              </p>
              <p className="text-2xl font-bold text-[#0F172A]">
                {currentTask?.title || taskTitle || tr("focus.sessionDefault")}
              </p>
              <p className="text-sm text-gray-400">{energyLabel}</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!currentTask) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#0f172a] px-4 pb-8 pt-14 sm:px-6 sm:pt-16">
        <main className="flex w-full max-w-md flex-col gap-5">
          <header className="mb-10 flex w-full flex-col items-start text-left sm:mb-12">
            <div className="mb-5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 shadow-sm">
              <span className="text-xl">🎯</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              {tr("focus.noTaskTitle")}
            </h1>
            <p className="mt-2 max-w-sm text-sm text-[#94A3B8]">
              {tr("focus.noTaskBody")}
            </p>
          </header>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push('/todo')}
                className="inline-flex w-full items-center justify-center rounded-xl bg-[#22c55e] py-3 px-6 text-sm font-semibold text-white transition-colors hover:bg-[#16a34a] sm:w-auto sm:min-w-[200px]"
              >
                {tr("focus.goTasks")}
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      <DopamineAirlock isActive={isAirlockActive} onAirlockComplete={handleAirlockComplete} />

      <div
        className={`focus-screen flex flex-col bg-[#0f172a] text-white ${
          isPreSession ? "focus-screen--pre" : "focus-screen--active"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between px-5 pt-[max(8px,env(safe-area-inset-top))] pb-1">
          <SluitenButton />
          {isPaused ? (
            <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-400">
              {tr("focus.paused")}
            </span>
          ) : (
            <span className="w-16" aria-hidden />
          )}
        </div>

        <div ref={focusFitViewportRef} className="focus-screen__fit-viewport">
          <div
            className="mx-auto flex w-full max-w-md justify-center"
            style={
              focusFitLayout.scale < 0.995 && focusFitLayout.fittedHeight > 0
                ? { height: focusFitLayout.fittedHeight, maxHeight: '100%' }
                : undefined
            }
          >
            <div
              ref={focusFitContentRef}
              className="focus-screen__fit-content"
              style={
                focusFitLayout.scale < 0.995
                  ? {
                      transform: `scale(${focusFitLayout.scale})`,
                      transformOrigin: 'top center',
                    }
                  : undefined
              }
            >
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#94A3B8] sm:text-[11px]">
                  {tr("focus.nuAanZet")}
                </p>
                <InfoButton infoId="timer" variant="onDark" />
              </div>
              <h1 className="focus-screen__title mt-1.5 line-clamp-2 text-[23px] font-bold leading-tight tracking-tight text-white sm:mt-2.5">
                {currentTask.title}
              </h1>
              <p className="mt-0.5 text-xs text-[#64748B] sm:mt-1 sm:text-sm">{energyLabel}</p>
            </div>

            <div className="focus-screen__timer relative shrink-0">
              <svg viewBox="0 0 210 210" aria-hidden>
                <circle
                  cx="105"
                  cy="105"
                  r={RING_R}
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="10"
                />
                <circle
                  cx="105"
                  cy="105"
                  r={RING_R}
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={RING_C}
                  strokeDashoffset={ringDashOffset}
                  transform="rotate(-90 105 105)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="focus-screen__timer-digit font-mono font-bold leading-none tabular-nums tracking-tight text-white">
                  {showTimerInHeader && !showTimeUpPrompt
                    ? formatTime(timeLeft)
                    : formatTime(duration * 60)}
                </div>
                <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8] sm:mt-1 sm:text-[11px]">
                  {tr("focus.ofTotalMins", { n: String(duration) })}
                </div>
              </div>
            </div>

            <div className="w-full">{microStepsSection}</div>

            {focusSessionActions ? (
              <div className="focus-screen__actions flex flex-col gap-2">{focusSessionActions}</div>
            ) : null}
          </div>
          </div>
        </div>

        {focusPreSessionActions ? (
          <div className="focus-screen__pre-actions flex flex-col gap-2">
            {focusPreSessionActions}
          </div>
        ) : null}

        {showParkBarInFocus ? (
          <div
            className="flex shrink-0 flex-col border-t border-white/10 bg-[#1a1d24]"
            style={{
              paddingBottom: 'max(10px, env(safe-area-inset-bottom, 0px))',
            }}
          >
            <div className="mx-auto flex w-full max-w-lg items-center gap-2 px-4 py-2 sm:gap-3 sm:py-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const input = e.currentTarget.querySelector('input') as HTMLInputElement;
                  if (input && input.value.trim()) {
                    handleParkThought(input.value.trim());
                    input.value = '';
                  }
                }}
                className="min-w-0 flex-1"
              >
                <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 sm:px-4 sm:py-3">
                  <SparklesIcon className="h-4 w-4 shrink-0 text-[#94a3b8]" aria-hidden />
                  <input
                    ref={parkThoughtInputRef}
                    name="park-thought"
                    type="text"
                    placeholder={tr("focus.parkPlaceholder")}
                    className="min-w-0 flex-1 bg-transparent text-sm text-[#e2e8f0] placeholder:text-white/40 focus:outline-none"
                  />
                </div>
              </form>
              <button
                type="button"
                onClick={() => {
                  const v = parkThoughtInputRef.current?.value?.trim();
                  if (!v) return;
                  void handleParkThought(v);
                  parkThoughtInputRef.current!.value = "";
                }}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 sm:px-5 sm:py-3 sm:text-sm"
              >
                {tr("focus.parkAction")}
              </button>
            </div>
            {user?.id && parkedCount > 0 ? (
              <span className="sr-only">
                {tr("focus.parkedCountSr", { n: String(parkedCount) })}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}

export default function FocusPage() {
  return <FocusContent />;
}
