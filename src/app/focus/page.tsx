"use client";

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppLayout from '../../components/layout/AppLayout';
import { track } from '../../shared/track';
import { toast } from '../../components/Toast';
import { useTaskContext } from '../../context/TaskContext';
import { useCheckIn } from '../../hooks/useCheckIn';
import { getRandomAdhdPlanningQuote } from '../../lib/adhdQuotes';
import { xpForTask } from '../../lib/xp';
import { normalizeMicroSteps, microStepId, type MicroStep, type MicroStepDifficulty } from '../../lib/microSteps';
import { parkFocusTaskSilently } from '@/lib/parkFocusTask';

const CONFETTI_COLORS = ['#10B981', '#F59E0B', '#4A90E2', '#EC4899', '#8B5CF6', '#F97316', '#EAB308', '#22C55E'];

const confettiStyle = `
  @keyframes confetti-burst {
    0% { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 1; }
    20% { opacity: 1; }
    100% { transform: translate(var(--tx), var(--ty)) scale(0.3) rotate(720deg); opacity: 0; }
  }
  .confetti-burst {
    animation: confetti-burst 1.4s ease-out forwards;
    pointer-events: none;
  }
`;

const PRIORITY_LABELS: Record<number, string> = { 1: 'KERNFOCUS', 2: 'VERVOLGSTAP', 3: 'BONUSACTIE' };
const ENERGY_DISPLAY: Record<string, string> = { low: 'Rustig', medium: 'Normaal', high: 'Intens' };

function FocusContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addTask, tasks, fetchTasks, updateTask } = useTaskContext();
  const [taskTitle, setTaskTitle] = useState(searchParams?.get('task') || 'Focus sessie');
  const { checkIn, saveCheckIn } = useCheckIn();
  const [nuNietBusy, setNuNietBusy] = useState(false);
  const [confettiElements, setConfettiElements] = useState<number[]>([]);
  const [showFocusCard, setShowFocusCard] = useState(true);
  const [inlineNewStep, setInlineNewStep] = useState('');

  const currentTask = useMemo(() => {
    const taskParam = searchParams?.get('task');
    if (taskParam) {
      let task = tasks.find(t => t.id === taskParam);
      if (!task) task = tasks.find(t => t.title === taskParam);
      if (task) return task;
    }
    const priority1Task = tasks.find((t: any) =>
      t && t.id && t.title && t.priority === 1 && !t.done && t.source !== 'medication'
    );
    return priority1Task || null;
  }, [tasks, searchParams]);

  useEffect(() => {
    const handleTaskUpdate = () => { fetchTasks(); };
    if (typeof window !== 'undefined') {
      window.addEventListener('structuro_tasks_updated', handleTaskUpdate);
      return () => { window.removeEventListener('structuro_tasks_updated', handleTaskUpdate); };
    }
  }, [fetchTasks]);

  const [duration, setDuration] = useState(() => {
    if (typeof window !== 'undefined') {
      const qp = searchParams?.get('duration');
      if (qp) return parseInt(qp);
      const saved = localStorage.getItem('focus_duration');
      if (saved) return parseInt(saved);
    }
    return parseInt(searchParams?.get('duration') || '15');
  });

  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [showCountdown, setShowCountdown] = useState(false);
  const [showExtendButton, setShowExtendButton] = useState(false);
  const lastTaskIdRef = useRef<string | null>(null);
  const endAtRef = useRef<number | null>(null);

  const [showTimeUpPrompt, setShowTimeUpPrompt] = useState(false);
  const [extendMinutes, setExtendMinutes] = useState<number>(10);
  const [timeUpQuote, setTimeUpQuote] = useState<string>('');

  const BackToDashboardButton = () => (
    <div className="fixed top-4 left-4 z-[10000]">
      <button
        onClick={() => {
          if (isRunning) {
            const ok = confirm('Je focus sessie loopt nog. Weet je zeker dat je terug wilt naar je dashboard?');
            if (!ok) return;
          }
          router.push('/');
        }}
        className="px-3 py-2 rounded-full bg-white/90 border border-slate-200 text-slate-700 shadow-sm hover:bg-white hover:shadow transition-colors text-sm font-semibold"
        title="Terug naar dashboard"
      >
        ← Dashboard
      </button>
    </div>
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('focus_duration', duration.toString());
    }
  }, [duration]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!isRunning || isPaused) { document.title = 'Structuro'; return; }
    const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const ss = String(timeLeft % 60).padStart(2, '0');
    const name = (currentTask?.title || taskTitle || 'Focus').trim();
    document.title = `(${mm}:${ss}) ${name} | Structuro`;
    return () => { document.title = 'Structuro'; };
  }, [isRunning, isPaused, timeLeft, currentTask?.title, taskTitle]);

  useEffect(() => {
    if (!isRunning) setTimeLeft(duration * 60);
  }, [duration, isRunning]);

  useEffect(() => {
    if (showCountdown && countdown > 0) {
      const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (showCountdown && countdown === 0) {
      setShowCountdown(false);
      setIsRunning(true);
      endAtRef.current = Date.now() + (timeLeft * 1000);
      if (currentTask && !currentTask.started) {
        updateTask(currentTask.id, { started: true }).catch(console.error);
      }
      track("ignite_start", { taskTitle, duration, autoStart: true });
    }
  }, [showCountdown, countdown, taskTitle, duration, currentTask, updateTask]);

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
        setTimeUpQuote(getRandomAdhdPlanningQuote(Date.now()));
        track("ignite_complete", { taskTitle, duration });
      }
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [isRunning, isPaused, timeLeft, taskTitle, duration]);

  useEffect(() => {
    setShowExtendButton(isRunning && timeLeft <= 60 && timeLeft > 0);
  }, [isRunning, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleMicroStep = async (stepId: string) => {
    if (!currentTask) return;
    const steps = normalizeMicroSteps(currentTask.microSteps);
    const idx = steps.findIndex(s => s.id === stepId);
    if (idx < 0) return;
    const next = steps.map(s => s.id === stepId ? { ...s, done: !s.done } : s);
    await updateTask(currentTask.id, { microSteps: next });
    const nowDone = next[idx]?.done;
    if (nowDone) {
      setConfettiElements(prev => [...prev, Date.now()]);
      setTimeout(() => setConfettiElements(prev => prev.slice(1)), 900);
      toast('Stap voltooid', { durationMs: 3000, replace: true });
    }
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

  const startSession = () => {
    setShowFocusCard(false);
    setShowCountdown(true);
    setCountdown(3);
    setTimeLeft(duration * 60);
    track("ignite_start", { taskTitle: currentTask?.title || taskTitle, duration });
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
    setShowFocusCard(true);
    setCompleted(false);
    setShowTimeUpPrompt(false);
    endAtRef.current = null;
  };

  const handleNuNietPark = async () => {
    if (!currentTask?.id || nuNietBusy) return;
    setNuNietBusy(true);
    try {
      const { remainingTop3Ids } = await parkFocusTaskSilently(
        currentTask.id, checkIn ?? null, saveCheckIn, updateTask
      );
      resetFocusSessionAfterPark();
      const nextId = remainingTop3Ids.find((id) => {
        const t = tasks.find((x) => x.id === id);
        return t && !t.done;
      });
      if (nextId) router.replace(`/focus?task=${encodeURIComponent(nextId)}`);
      else router.push('/dagstart');
    } catch (e) { console.error('park focus (nu niet):', e); }
    finally { setNuNietBusy(false); }
  };

  const completeCurrentTask = async () => {
    if (!currentTask?.id) { toast('Geen taak om te voltooien'); return; }
    try {
      const gainXp = xpForTask(currentTask);
      setIsRunning(false);
      setIsPaused(false);
      setCompleted(false);
      setShowTimeUpPrompt(false);
      await updateTask(currentTask.id, { done: true, completedAt: new Date().toISOString(), started: false });
      toast('Taak voltooid!');
      track('task_completed_early', {
        taskId: currentTask.id,
        minutesFocused: Math.max(0, Math.round(((duration * 60 - timeLeft) / 60))),
        durationPlanned: duration, xp: gainXp,
      });
      const burstCount = 28;
      setConfettiElements(Array.from({ length: burstCount }, (_, i) => Date.now() + i));
      const title = encodeURIComponent(currentTask.title || 'Taak');
      setTimeout(() => { setConfettiElements([]); router.push(`/gamification?gain=${gainXp}&task=${title}`); }, 1600);
    } catch (err) { console.error('Error completing task:', err); toast('Fout bij voltooien van taak'); }
  };

  const extendSession = () => {
    setTimeLeft(prev => prev + 300);
    setDuration(prev => prev + 5);
    toast("Sessie verlengd met 5 minuten!");
    track("ignite_extend", { taskTitle, duration, extended: true });
  };

  const handleParkThought = async (thoughtText: string) => {
    try {
      await addTask({
        title: thoughtText, duration: null, priority: null, done: false, started: false,
        dueAt: null, reminders: [], repeat: "none", impact: "🧠",
        source: "parked_thought", energyLevel: 'low', estimatedDuration: null,
      });
      toast("Gedachte geparkeerd!");
      track("interruption_parked", { taskTitle, duration, thought: thoughtText });
    } catch (error: any) {
      console.error('Failed to park thought:', error);
      toast("Fout bij parkeren: " + (error.message || 'Onbekende fout'));
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
    const taskDuration =
      (typeof currentTask.duration === 'number' && currentTask.duration > 0 ? currentTask.duration : null) ??
      (typeof (currentTask as any).estimatedDuration === 'number' && (currentTask as any).estimatedDuration > 0
        ? (currentTask as any).estimatedDuration : null);
    if (!taskDuration) return;
    const taskId = currentTask.id;
    const taskChanged = lastTaskIdRef.current !== taskId;
    if (taskChanged) lastTaskIdRef.current = taskId;
    if (!isRunning && !showCountdown && (taskChanged || showFocusCard)) {
      setDuration(taskDuration);
      setTimeLeft(taskDuration * 60);
    }
  }, [currentTask?.id, currentTask?.title, currentTask?.duration, (currentTask as any)?.estimatedDuration, isRunning, showCountdown, showFocusCard]);

  // ─── Derived data ─────────────────────────────
  const existingMicroSteps = normalizeMicroSteps(currentTask?.microSteps);
  const completedStepsCount = existingMicroSteps.filter(s => s.done).length;
  const activeStepIdx = existingMicroSteps.findIndex(s => !s.done);
  const priorityLabel = currentTask?.priority ? PRIORITY_LABELS[currentTask.priority] || 'FOCUS MODUS' : 'FOCUS MODUS';
  const energyLabel = ENERGY_DISPLAY[currentTask?.energyLevel || 'medium'] || 'Normaal';
  const taskMins = currentTask?.duration ?? (currentTask as any)?.estimatedDuration;
  const timerActive = isRunning || isPaused;
  const showTimerInHeader = timerActive || showTimeUpPrompt;
  const preTimerState = !timerActive && !showTimeUpPrompt;

  // ─── Confetti overlay ─────────────────────────
  const confettiOverlay = confettiElements.length > 0 && confettiElements.map((id, idx) => {
    const total = confettiElements.length;
    const angle = (idx / total) * 2 * Math.PI;
    const tx = Math.cos(angle) * 140;
    const ty = Math.sin(angle) * 140 + 80;
    const color = CONFETTI_COLORS[idx % CONFETTI_COLORS.length];
    const size = 8 + (idx % 4);
    const isRect = idx % 3 === 0;
    return (
      <div key={id} className="confetti-burst" style={{
        position: 'fixed', top: '50%', left: '50%', width: size,
        height: isRect ? size * 0.6 : size, background: color,
        borderRadius: isRect ? 2 : '50%', pointerEvents: 'none', zIndex: 9999,
        ['--tx' as string]: `${tx}px`, ['--ty' as string]: `${ty}px`,
      }} />
    );
  });

  // ─── Shared: Microsteps section ───────────────
  const microStepsSection = (
    <div className="bg-white p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2 2 7l10 5 10-5-10-5z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" />
        </svg>
        <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Microstappen</span>
      </div>

      {existingMicroSteps.length > 0 ? (
        <div className="space-y-1.5">
          {existingMicroSteps.map((step, idx) => {
            const isDone = Boolean(step.done);
            const isActive = !isDone && idx === activeStepIdx;
            return (
              <button
                key={step.id} type="button"
                onClick={() => handleToggleMicroStep(step.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all ${
                  isActive ? 'bg-purple-50 border border-purple-200' : 'hover:bg-slate-50'
                }`}
              >
                {isDone ? (
                  <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                ) : isActive ? (
                  <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full border-2 border-slate-300 flex-shrink-0" />
                )}
                <span className={`text-sm ${isDone ? 'text-slate-400 line-through' : isActive ? 'text-purple-800 font-medium' : 'text-slate-700'}`}>
                  {step.title}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-slate-400 mb-1">Breek deze taak op in kleine stappen</p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <input
          type="text" value={inlineNewStep}
          onChange={(e) => setInlineNewStep(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleInlineAddStep(); } }}
          placeholder="Nieuwe stap toevoegen..."
          className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 text-slate-700"
        />
        <button type="button" onClick={handleInlineAddStep} disabled={!inlineNewStep.trim()}
          className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 flex items-center justify-center transition-colors disabled:opacity-40 flex-shrink-0 text-lg font-light"
        >+</button>
      </div>

      {existingMicroSteps.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-sm text-slate-400">{completedStepsCount} van {existingMicroSteps.length} klaar</span>
          <div className="flex gap-1.5">
            {existingMicroSteps.map((step, idx) => (
              <div key={step.id} className={`w-6 h-2 rounded-full transition-colors ${
                step.done ? 'bg-emerald-400' : idx === activeStepIdx ? 'bg-purple-400' : 'bg-slate-200'
              }`} />
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ─── Shared: Thought parking form ─────────────
  const parkThoughtForm = (
    <div className="max-w-md w-full mt-6 pt-4 border-t border-slate-200">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const input = e.currentTarget.querySelector('input') as HTMLInputElement;
          if (input && input.value.trim()) { handleParkThought(input.value.trim()); input.value = ''; }
        }}
        className="flex gap-2"
      >
        <input type="text" placeholder="Parkeer een gedachte..."
          className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300"
        />
        <button type="submit"
          className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >Parkeer</button>
      </form>
    </div>
  );

  // ═══════════════════════════════════════════════
  // ─── COUNTDOWN ────────────────────────────────
  // ═══════════════════════════════════════════════
  if (showCountdown) {
    return (
      <AppLayout hideSidebar={true}>
        <style>{confettiStyle}</style>
        <div className="bg-slate-50 min-h-full flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-slate-900 text-white p-10 text-center rounded-2xl">
              <div className="text-7xl font-medium tabular-nums tracking-tight">{countdown}</div>
              <p className="text-lg font-medium text-slate-300 mt-4">Focus sessie start over</p>
              <p className="text-sm text-slate-500 mt-1">{currentTask?.title || taskTitle}</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ═══════════════════════════════════════════════
  // ─── NO TASK ──────────────────────────────────
  // ═══════════════════════════════════════════════
  if (!currentTask) {
    return (
      <AppLayout>
        <div className="flex min-h-full flex-col items-center justify-center bg-slate-50 px-4 sm:px-6 pt-14 sm:pt-16 pb-8">
          <main className="flex w-full max-w-md flex-col gap-5">
            <header className="mb-10 flex w-full flex-col items-start text-left sm:mb-12">
              <div className="mb-5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 shadow-sm">
                <span className="text-xl">🎯</span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-800">Geen focus taak</h1>
              <p className="mt-2 max-w-sm text-sm text-slate-500">
                Stel je prioriteiten in via de dagstart of kies een taak uit je takenlijst.
              </p>
            </header>
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="space-y-4 text-center">
                <h2 className="text-lg font-bold text-slate-900">Hoe wil je verder?</h2>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-1">
                  <a href="/dagstart" className="inline-flex items-center justify-center py-3 px-6 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors">
                    Start dagstart
                  </a>
                  <a href="/todo" className="inline-flex items-center justify-center py-3 px-6 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors">
                    Bekijk takenlijst
                  </a>
                </div>
              </div>
            </div>
          </main>
        </div>
      </AppLayout>
    );
  }

  // ═══════════════════════════════════════════════
  // ─── MAIN FOCUS CARD VIEW ─────────────────────
  // (pre-timer, timer running, paused, time-up)
  // ═══════════════════════════════════════════════
  return (
    <AppLayout hideSidebar={true}>
      <style>{confettiStyle}</style>
      {confettiOverlay}
      <BackToDashboardButton />

      <div className="bg-slate-50 min-h-full px-4 py-6 sm:py-8 flex flex-col items-center">
        {/* ── The Card ── */}
        <div className="max-w-md w-full rounded-2xl shadow-lg overflow-hidden mt-10">
          {/* Dark Header */}
          <div className="bg-slate-900 text-white p-6 text-center">
            <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
              {priorityLabel}
            </p>
            <h1 className="text-2xl font-bold mt-2 truncate px-2">
              {currentTask.title}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {taskMins != null && taskMins > 0 ? `${taskMins} min` : ''}
              {taskMins != null && taskMins > 0 ? ' \u00B7 ' : ''}
              {energyLabel}
            </p>

            {showTimerInHeader && (
              <div className="mt-5">
                <div className="text-5xl sm:text-6xl font-medium tabular-nums tracking-tight leading-none">
                  {formatTime(timeLeft)}
                </div>
                {isPaused && (
                  <p className="text-xs text-amber-400 mt-2 uppercase tracking-wide font-semibold">Gepauzeerd</p>
                )}
              </div>
            )}

            {preTimerState && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="text-xs text-slate-500">🕒</span>
                <select
                  value={duration}
                  onChange={(e) => { const val = parseInt(e.target.value); if (val) { setDuration(val); setTimeLeft(val * 60); } }}
                  className="bg-slate-800 text-slate-300 border border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none cursor-pointer appearance-none pr-8"
                  style={{
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394A3B8' d='M6 9L1 4h10z'/%3E%3C/svg%3E\")",
                    backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center",
                  }}
                >
                  {[5, 10, 15, 20, 25, 30, 45, 60, 90, 120].map((m) => (
                    <option key={m} value={m}>{m} min</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* White Body: Microsteps */}
          {microStepsSection}
        </div>

        {/* ── Action Buttons (below card) ── */}
        <div className="max-w-md w-full mt-6 flex flex-col gap-3">
          {showTimeUpPrompt ? (
            <>
              <p className="text-center text-slate-500 text-sm mb-1 italic">&ldquo;{timeUpQuote}&rdquo;</p>
              <button onClick={completeCurrentTask}
                className="w-full py-3 rounded-xl border-2 border-emerald-200 text-emerald-700 font-semibold hover:bg-emerald-50 transition-colors">
                Ja, taak voltooid
              </button>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {[5, 10, 15, 25].map((m) => (
                  <button key={m} onClick={() => setExtendMinutes(m)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      extendMinutes === m ? 'bg-slate-100 border-slate-300 text-slate-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}>+{m} min</button>
                ))}
              </div>
              <button
                onClick={() => {
                  const extra = Math.max(1, Math.min(480, extendMinutes || 10));
                  setShowTimeUpPrompt(false);
                  setCompleted(false);
                  setIsPaused(false);
                  setIsRunning(true);
                  setDuration(prev => prev + extra);
                  setTimeLeft(extra * 60);
                  endAtRef.current = Date.now() + (extra * 60 * 1000);
                  track('ignite_extend_after_timeup', { taskTitle, duration, extra });
                  toast(`Top, nog ${extra} minuten!`);
                }}
                className="w-full py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors">
                Nee, verlengen met {extendMinutes} min
              </button>
            </>
          ) : timerActive ? (
            <>
              <button onClick={pauseSession}
                className={`w-full py-3 rounded-xl border-2 font-semibold transition-colors ${
                  isPaused ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' : 'border-amber-200 text-amber-700 hover:bg-amber-50'
                }`}>
                {isPaused ? 'Hervatten' : 'Pauzeren'}
              </button>
              <button onClick={completeCurrentTask}
                className="w-full py-3 rounded-xl border-2 border-emerald-200 text-emerald-700 font-semibold hover:bg-emerald-50 transition-colors">
                Taak afgerond
              </button>
              {showExtendButton && (
                <button onClick={extendSession}
                  className="w-full py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors">
                  +5 Minuten
                </button>
              )}
              <button onClick={stopSession}
                className="w-full py-3 rounded-xl border-2 border-slate-200 text-slate-500 font-semibold hover:bg-slate-50 transition-colors">
                Stoppen
              </button>
            </>
          ) : (
            <button onClick={startSession}
              className="w-full py-3.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors">
              Start Focus Sessie
            </button>
          )}

          {!showTimeUpPrompt && (
            <button type="button" onClick={handleNuNietPark} disabled={nuNietBusy}
              className="text-sm text-slate-400 hover:text-slate-600 py-2 transition-colors disabled:opacity-40">
              {nuNietBusy ? '…' : 'Nu niet'}
            </button>
          )}
        </div>

        {/* ── Gedachte parkeren ── */}
        {parkThoughtForm}
      </div>
    </AppLayout>
  );
}

export default function FocusPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <span className="text-slate-400 animate-pulse">Laden...</span>
      </div>
    }>
      <FocusContent />
    </Suspense>
  );
}
