"use client";

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppLayout from '../../components/layout/AppLayout';
import { track } from '../../shared/track';
import { toast } from '../../components/Toast';
import { useTaskContext } from '../../context/TaskContext';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import GedachteParkerenModal from '../../components/GedachteParkerenModal';
import { useCheckIn } from '../../hooks/useCheckIn';
import { getRandomAdhdPlanningQuote } from '../../lib/adhdQuotes';
import { xpForTask } from '../../lib/xp';
import { normalizeMicroSteps, microStepId, type MicroStep, type MicroStepDifficulty } from '../../lib/microSteps';

// Energie kleuren helper
const getEnergyColor = (level: string) => {
  switch (level) {
    case 'low': return { bg: '#EAF9EE', border: '#10B981', text: '#065F46', label: 'Rustig' };
    case 'medium': return { bg: '#FFF4E6', border: '#F59E0B', text: '#92400E', label: 'Actief' };
    case 'high': return { bg: '#F3E8FF', border: '#9333EA', text: '#6B21A8', label: 'Intens' };
    default: return { bg: '#F3F4F6', border: '#6B7280', text: '#374151', label: 'Normaal' };
  }
};

// Confetti kleuren voor taak-voltooid viering
const CONFETTI_COLORS = ['#10B981', '#F59E0B', '#4A90E2', '#EC4899', '#8B5CF6', '#F97316', '#EAB308', '#22C55E'];

// Confetti animatie CSS – burst vanuit midden, daarna vallen
const confettiStyle = `
  @keyframes confetti-burst {
    0% {
      transform: translate(-50%, -50%) scale(1) rotate(0deg);
      opacity: 1;
    }
    20% {
      opacity: 1;
    }
    100% {
      transform: translate(var(--tx), var(--ty)) scale(0.3) rotate(720deg);
      opacity: 0;
    }
  }
  
  @keyframes confetti-fall {
    0% {
      transform: translateY(0) rotate(0deg);
      opacity: 1;
    }
    100% {
      transform: translateY(100px) rotate(360deg);
      opacity: 0;
    }
  }
  
  @keyframes glow-pulse {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(74, 144, 226, 0.7);
    }
    50% {
      box-shadow: 0 0 20px 10px rgba(74, 144, 226, 0.4);
    }
  }
  
  .confetti-burst {
    animation: confetti-burst 1.4s ease-out forwards;
    pointer-events: none;
  }
  
  .confetti {
    animation: confetti-fall 1s ease-out forwards;
  }
  
  .glow-checkbox {
    animation: glow-pulse 0.6s ease-out;
  }
`;

const theme = {
  bg: '#F7F8FA',
  card: '#FFFFFF',
  text: '#2F3441',
  sub: '#6B7280',
  line: '#E6E8EE',
  accent: '#4A90E2',
  soft: 'rgba(74,144,226,0.06)',
};

function FocusContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addTask, tasks, fetchTasks, updateTask } = useTaskContext();
  const [taskTitle, setTaskTitle] = useState(searchParams?.get('task') || 'Focus sessie');
  const { checkIn } = useCheckIn();
  const [showMicroSteps, setShowMicroSteps] = useState(false);
  const [microStepInputs, setMicroStepInputs] = useState<Array<{ id?: string; title: string; minutes: number | null; difficulty: MicroStepDifficulty | null; done?: boolean }>>([
    { title: '', minutes: null, difficulty: null },
  ]);
  const [confettiElements, setConfettiElements] = useState<number[]>([]);
  const [showFocusCard, setShowFocusCard] = useState(true); // Toon Focus Card standaard
  
  // Vind taak op basis van titel of ID, of gebruik priority 1 taak
  const currentTask = useMemo(() => {
    const taskParam = searchParams?.get('task');
    
    // Als er een task parameter is, zoek die taak
    if (taskParam) {
      // Probeer eerst op ID (als het een ID is)
      let task = tasks.find(t => t.id === taskParam);
      
      // Als niet gevonden, zoek op titel
      if (!task) {
        task = tasks.find(t => t.title === taskParam);
      }
      
      if (task) return task;
    }
    
    // Anders, gebruik priority 1 taak (ALTIJD de eerste niet-voltooide taak met priority 1)
    // BELANGRIJK: Als priority 1 taak wordt voltooid, toon dan een lege staat
    const priority1Task = tasks.find((t: any) => 
      t && 
      t.id &&
      t.title &&
      t.priority === 1 && 
      !t.done && 
      t.source !== 'medication'
    );
    
    return priority1Task || null;
  }, [tasks, searchParams]);
  
  // BELANGRIJK: Refresh taken wanneer ze worden geüpdatet (real-time sync)
  useEffect(() => {
    const handleTaskUpdate = () => {
      console.log('🔄 Focus Mode: Task update event received, refreshing...');
      fetchTasks();
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('structuro_tasks_updated', handleTaskUpdate);
      return () => {
        window.removeEventListener('structuro_tasks_updated', handleTaskUpdate);
      };
    }
  }, [fetchTasks]);
  
  // Persistent timer state met localStorage (default 15 minuten)
  const [duration, setDuration] = useState(() => {
    if (typeof window !== 'undefined') {
      // Prefer explicit query param over localStorage, so duration can "match" the task when navigating.
      const qp = searchParams?.get('duration');
      if (qp) return parseInt(qp);

      const saved = localStorage.getItem('focus_duration');
      if (saved) return parseInt(saved);
    }
    return parseInt(searchParams?.get('duration') || '15');
  });
  
  const [timeLeft, setTimeLeft] = useState(duration * 60); // in seconden
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [showCountdown, setShowCountdown] = useState(false);
  const [showFirstStep, setShowFirstStep] = useState(true);
  const [showExtendButton, setShowExtendButton] = useState(false);
  const [showParkModal, setShowParkModal] = useState(false);
  const [showTipTooltip, setShowTipTooltip] = useState(false);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const [showAddTooltip, setShowAddTooltip] = useState(false);
  const lastTaskIdRef = useRef<string | null>(null);
  const endAtRef = useRef<number | null>(null); // timestamp (ms) waarop de sessie eindigt; voorkomt drift in background tabs

  // Timer is klaar: vraag of taak voltooid is, of verlengen met extra tijd + quote
  const [showTimeUpPrompt, setShowTimeUpPrompt] = useState(false);
  const [extendMinutes, setExtendMinutes] = useState<number>(10);
  const [timeUpQuote, setTimeUpQuote] = useState<string>('');

  // Altijd een uitweg terug naar het hoofdmenu (Focus Mode verbergt sidebar).
  const goToMainMenu = () => {
    // Voorkom dat iemand per ongeluk een lopende focus sessie verlaat.
    if (isRunning) {
      const ok = confirm('Je focus sessie loopt nog. Weet je zeker dat je terug wilt naar het hoofdmenu?');
      if (!ok) return;
    }
    router.push('/'); // hoofdmenu/overzicht (met sidebar)
  };

  const BackToDashboardButton = ({ variant }: { variant: "light" | "dark" }) => (
    <div style={{ position: 'fixed', top: 16, left: 16, zIndex: 10000 }}>
      <button
        onClick={() => {
          if (isRunning) {
            const ok = confirm('Je focus sessie loopt nog. Weet je zeker dat je terug wilt naar je dashboard?');
            if (!ok) return;
          }
          router.push('/');
        }}
        className={
          variant === "light"
            ? "px-3 py-2 rounded-full bg-white/90 border border-gray-200 text-gray-800 shadow-sm hover:bg-white hover:shadow transition-colors text-sm font-semibold"
            : "px-3 py-2 rounded-full bg-white/10 border border-white/20 text-slate-100 backdrop-blur hover:bg-white/15 transition-colors text-sm font-semibold"
        }
        title="Terug naar dashboard"
      >
        ← Dashboard
      </button>
    </div>
  );

  // Sla duration op in localStorage wanneer deze verandert
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('focus_duration', duration.toString());
    }
  }, [duration]);

  // External timer: sync resterende tijd naar tab title
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!isRunning || isPaused) {
      document.title = 'Structuro';
      return;
    }
    const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const ss = String(timeLeft % 60).padStart(2, '0');
    const name = (currentTask?.title || taskTitle || 'Focus').trim();
    document.title = `(${mm}:${ss}) ${name} | Structuro`;
    return () => {
      document.title = 'Structuro';
    };
  }, [isRunning, isPaused, timeLeft, currentTask?.title, taskTitle]);

  // Bereken dynamische presets: [current-5, current, current+10] met grenzen 5-60
  const presets = useMemo(() => {
    const min = 5;
    const max = 60;
    const preset1 = Math.max(min, duration - 5);
    const preset2 = duration;
    const preset3 = Math.min(max, duration + 10);
    
    // Zorg dat we altijd 3 unieke presets hebben
    const uniquePresets = Array.from(new Set([preset1, preset2, preset3])).sort((a, b) => a - b);
    
    // Als we minder dan 3 hebben, vul aan
    while (uniquePresets.length < 3) {
      if (uniquePresets[uniquePresets.length - 1] < max) {
        uniquePresets.push(Math.min(max, uniquePresets[uniquePresets.length - 1] + 5));
      } else if (uniquePresets[0] > min) {
        uniquePresets.unshift(Math.max(min, uniquePresets[0] - 5));
      } else {
        break;
      }
    }
    
    return uniquePresets.slice(0, 3);
  }, [duration]);

  // Update timeLeft wanneer duration verandert
  useEffect(() => {
    if (!isRunning) {
      setTimeLeft(duration * 60);
    }
  }, [duration, isRunning]);

  // Start NIET automatisch - wacht op gebruiker actie via Focus Card

  // Countdown timer
  useEffect(() => {
    if (showCountdown && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (showCountdown && countdown === 0) {
      setShowCountdown(false);
      setIsRunning(true);
      setShowFirstStep(false);
      // Start timer op basis van absolute eindtijd (drift-proof)
      endAtRef.current = Date.now() + (timeLeft * 1000);
      
      // Markeer taak als gestart
      if (currentTask && !currentTask.started) {
        updateTask(currentTask.id, { started: true }).catch(err => {
          console.error('Error marking task as started:', err);
        });
      }
      
      track("ignite_start", { taskTitle, duration, autoStart: true });
    }
  }, [showCountdown, countdown, taskTitle, duration, currentTask, updateTask]);

  // Timer countdown (drift-proof): reken timeLeft uit vanaf endAtRef
  useEffect(() => {
    if (!isRunning || isPaused) return;
    if (!endAtRef.current) {
      endAtRef.current = Date.now() + (timeLeft * 1000);
    }
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

  // Toon verleng-knop in laatste minuut
  useEffect(() => {
    if (isRunning && timeLeft <= 60 && timeLeft > 0) {
      setShowExtendButton(true);
    } else {
      setShowExtendButton(false);
    }
  }, [isRunning, timeLeft]);

  // Progress berekening (0-100%)
  const progress = useMemo(() => {
    if (duration === 0) return 0;
    const elapsed = (duration * 60 - timeLeft) / (duration * 60);
    return Math.min(100, Math.max(0, elapsed * 100));
  }, [duration, timeLeft]);

  // Format tijd als MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Energie matching
  const taskEnergy = currentTask?.energyLevel || 'medium';
  const userEnergy = checkIn?.energy_level || 'medium';
  const energyColors = getEnergyColor(taskEnergy);
  const hasEnergyMismatch = taskEnergy === 'high' && userEnergy === 'low';

  // Open mini-stappen editor: lege velden om zelf in te vullen (beginnen met 1)
  const handleHelpMeStart = () => {
    if (!currentTask) return;

    const existing = normalizeMicroSteps(currentTask.microSteps);
    if (existing.length > 0) {
      setMicroStepInputs([
        ...existing.map(s => ({ id: s.id, title: s.title, minutes: s.minutes ?? null, difficulty: (s.difficulty as any) ?? null, done: s.done })),
        { title: '', minutes: null, difficulty: null },
      ]);
    } else {
      setMicroStepInputs([{ title: '', minutes: null, difficulty: null }]);
    }
    setShowMicroSteps(true);
  };

  // Sla micro-stappen op
  const handleSaveMicroSteps = async () => {
    if (!currentTask) return;

    const baseDifficulty = (currentTask?.energyLevel === 'low' || currentTask?.energyLevel === 'medium' || currentTask?.energyLevel === 'high')
      ? (currentTask.energyLevel as MicroStepDifficulty)
      : 'medium';

    const steps: MicroStep[] = microStepInputs
      .map((s) => ({
        id: s.id ? String(s.id) : microStepId(),
        title: String(s.title || '').trim(),
        minutes: typeof s.minutes === 'number' && Number.isFinite(s.minutes) ? s.minutes : null,
        difficulty: (s.difficulty ?? baseDifficulty) as any,
        done: Boolean(s.done),
      }))
      .filter(s => s.title !== '');

    if (steps.length === 0) {
      toast('Voeg minimaal 1 micro-stap toe');
      return;
    }

    await updateTask(currentTask.id, {
      microSteps: steps
    });
    
    setShowMicroSteps(false);
    toast('Micro-stappen opgeslagen!');
    fetchTasks();
  };

  // Toggle micro-stap completion met confetti effect
  const handleToggleMicroStep = async (stepId: string) => {
    if (!currentTask) return;
    const steps = normalizeMicroSteps(currentTask.microSteps);
    const idx = steps.findIndex(s => s.id === stepId);
    if (idx < 0) return;

    const next = steps.map(s => s.id === stepId ? { ...s, done: !s.done } : s);
    await updateTask(currentTask.id, { microSteps: next });

    // Confetti only when marking done
    const nowDone = next[idx]?.done;
    if (nowDone) {
      setConfettiElements(prev => [...prev, Date.now()]);
      setTimeout(() => setConfettiElements(prev => prev.slice(1)), 900);
      toast('✓ Stap voltooid', { durationMs: 3000, replace: true });
    }
  };

  // Start sessie (vanuit Focus Card)
  const startSession = () => {
    setShowFocusCard(false); // Verberg Focus Card
    setShowCountdown(true);
    setCountdown(3);
    setTimeLeft(duration * 60);
    track("ignite_start", { taskTitle: currentTask?.title || taskTitle, duration });
  };

  // Pauzeer/hervat sessie
  const pauseSession = () => {
    setIsPaused((prev) => {
      const nextPaused = !prev;
      if (nextPaused) {
        // Pauzeren: bevries endAt en zet timeLeft exact
        const endAt = endAtRef.current;
        if (endAt) {
          const remaining = Math.max(0, Math.round((endAt - Date.now()) / 1000));
          endAtRef.current = null;
          setTimeLeft(remaining);
        }
      } else {
        // Hervatten: nieuwe eindtijd vanaf nu
        endAtRef.current = Date.now() + (timeLeft * 1000);
      }
      track("ignite_pause", { taskTitle, duration, paused: nextPaused });
      return nextPaused;
    });
  };

  // Stop sessie
  const stopSession = () => {
    setIsRunning(false);
    setIsPaused(false);
    setTimeLeft(duration * 60);
    endAtRef.current = null;
    track("ignite_stop", { taskTitle, duration });
  };

  // Taak direct voltooien (ook als timer nog loopt)
  const completeCurrentTask = async () => {
    if (!currentTask?.id) {
      toast('Geen taak om te voltooien');
      return;
    }
    try {
      const gainXp = xpForTask(currentTask);

      // Stop timer UI
      setIsRunning(false);
      setIsPaused(false);
      setCompleted(false);

      await updateTask(currentTask.id, {
        done: true,
        completedAt: new Date().toISOString(),
        started: false,
      });

      toast('Taak voltooid!');
      track('task_completed_early', {
        taskId: currentTask.id,
        minutesFocused: Math.max(0, Math.round(((duration * 60 - timeLeft) / 60))),
        durationPlanned: duration,
        xp: gainXp,
      });

      // Confetti-viering: veel kleuren, burst vanuit midden
      const burstCount = 28;
      setConfettiElements(Array.from({ length: burstCount }, (_, i) => Date.now() + i));

      // Na confetti pas doorsturen naar gamification
      const title = encodeURIComponent(currentTask.title || 'Taak');
      setTimeout(() => {
        setConfettiElements([]);
        router.push(`/gamification?gain=${gainXp}&task=${title}`);
      }, 1600);
    } catch (err) {
      console.error('Error completing task:', err);
      toast('Fout bij voltooien van taak');
    }
  };

  // Verleng sessie met 5 minuten
  const extendSession = () => {
    setTimeLeft(prev => prev + 300);
    setDuration(prev => prev + 5);
    toast("Sessie verlengd met 5 minuten! ⏰");
    track("ignite_extend", { taskTitle, duration, extended: true });
  };

  // Gedachte parkeren
  const handleParkThought = async (thoughtText: string) => {
    try {
      await addTask({
        title: thoughtText,
        duration: null,
        priority: null,
        done: false,
        started: false,
        dueAt: null,
        reminders: [],
        repeat: "none",
        impact: "🧠",
        source: "parked_thought",
        energyLevel: 'low',
        estimatedDuration: null
      });
      
      toast("Gedachte geparkeerd! 📝");
      track("interruption_parked", { taskTitle, duration, thought: thoughtText });
    } catch (error: any) {
      console.error('Failed to park thought:', error);
      toast("Fout bij parkeren van gedachte: " + (error.message || 'Onbekende fout'));
      throw error;
    }
  };

  const openParkModal = () => {
    setShowParkModal(true);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
      
      if (e.key === " ") {
        e.preventDefault();
        if (isRunning) pauseSession();
      } else if (e.key === "Escape") {
        if (isRunning) stopSession();
      } else if (e.key.toLowerCase() === "j") {
        if (isRunning || !isRunning) {
          openParkModal();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, isPaused]);

  // Update preset handler
  const handlePresetClick = (mins: number) => {
    setDuration(mins);
    setTimeLeft(mins * 60);
  };

  // Update taskTitle en (initiële) duration wanneer de taak verandert.
  // KRITIEK: reset NOOIT de timer terwijl een sessie loopt (bv. na "Gedachte parkeren" triggert tasks refresh).
  useEffect(() => {
    if (!currentTask) return;

    setTaskTitle(currentTask.title);

    const taskDuration =
      (typeof currentTask.duration === 'number' && currentTask.duration > 0 ? currentTask.duration : null) ??
      (typeof (currentTask as any).estimatedDuration === 'number' &&
      (currentTask as any).estimatedDuration > 0
        ? (currentTask as any).estimatedDuration
        : null);

    if (!taskDuration) return;

    const taskId = currentTask.id;
    const taskChanged = lastTaskIdRef.current !== taskId;
    if (taskChanged) {
      lastTaskIdRef.current = taskId;
    }

    // Alleen duration/timeLeft initialiseren wanneer:
    // - taak wisselt, OF
    // - je zit nog in de Focus Card (voor de sessie start),
    // EN de timer loopt niet.
    if (!isRunning && !showCountdown && (taskChanged || showFocusCard)) {
      setDuration(taskDuration);
      setTimeLeft(taskDuration * 60);
    }
  }, [
    currentTask?.id,
    currentTask?.title,
    currentTask?.duration,
    (currentTask as any)?.estimatedDuration,
    isRunning,
    showCountdown,
    showFocusCard,
  ]);

  const existingMicroSteps = normalizeMicroSteps(currentTask?.microSteps);

  // Countdown overlay –zelfde stijl als dashboard (licht, rustig)
  if (showCountdown) {
    return (
      <AppLayout hideSidebar={true}>
        <style>{confettiStyle}</style>
        <BackToDashboardButton variant="light" />
        <div
          className="min-h-screen flex items-center justify-center p-6"
          style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' }}
        >
          <div className="max-w-md w-full bg-white rounded-3xl shadow-sm p-8 sm:p-10 text-center">
            <div className="text-6xl font-medium text-gray-800 mb-6 tabular-nums tracking-tight">{countdown}</div>
            <p className="text-lg font-medium text-gray-900 mb-1">Focus sessie start over</p>
            <p className="text-sm text-gray-500">{currentTask?.title || taskTitle}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Focus Card - toon VOOR timer (alleen als er een taak is)
  // Als er geen taak is, toon melding in dezelfde stijl als dashboard
  if (showFocusCard) {
    if (!currentTask) {
      // Geen taak gevonden –zelfde stijl als Dagstart-pagina (header + witte kaart)
      return (
        <AppLayout>
          <div
            className="min-h-screen py-12 px-4 sm:px-6 pb-16"
            style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' }}
          >
            <main className="max-w-3xl mx-auto flex flex-col gap-6">
              {/* Header –zelfde als Dagstart */}
              <header className="text-center pt-12 pb-0 mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 mb-4 shadow-sm">
                  <span className="text-2xl">🎯</span>
                </div>
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                  Geen focus taak
                </h1>
                <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                  Stel je prioriteiten in via de dagstart of kies een taak uit je takenlijst.
                </p>
              </header>

              {/* Content kaart –zelfde stijl als DayStartCheckIn */}
              <div className="bg-white rounded-3xl shadow-sm p-6 sm:p-8 mb-6 max-w-3xl mx-auto">
                <div className="space-y-5 text-center">
                  <h2 className="text-xl font-bold text-gray-900">
                    Hoe wil je verder?
                  </h2>
                  <p className="text-sm text-gray-500 max-w-md mx-auto">
                    Start de dagstart check-in om je focus voor vandaag te bepalen, of ga naar je taken om een taak te kiezen.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                    <a
                      href="/dagstart"
                      className="inline-flex items-center justify-center py-3 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-colors text-center"
                    >
                      Start dagstart check-in
                    </a>
                    <a
                      href="/todo"
                      className="inline-flex items-center justify-center py-3 px-6 rounded-2xl bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-semibold shadow-sm transition-colors text-center"
                    >
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
    
    // Er is een taak - toon Zen-modus Focus Card (geen Hoofdmenu/Taken tot sessie start)
    return (
      <AppLayout hideSidebar={true}>
        <style>{confettiStyle}</style>
        <BackToDashboardButton variant="light" />
        
        {/* Confetti bij Taak voltooid – burst vanuit midden */}
        {confettiElements.map((id, idx) => {
          const total = confettiElements.length;
          const angle = (idx / total) * 2 * Math.PI;
          const tx = Math.cos(angle) * 140;
          const ty = Math.sin(angle) * 140 + 80;
          const color = CONFETTI_COLORS[idx % CONFETTI_COLORS.length];
          const size = 8 + (idx % 4);
          const isRect = idx % 3 === 0;
          return (
            <div
              key={id}
              className="confetti-burst"
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                width: size,
                height: isRect ? size * 0.6 : size,
                background: color,
                borderRadius: isRect ? 2 : '50%',
                pointerEvents: 'none',
                zIndex: 9999,
                ['--tx' as string]: `${tx}px`,
                ['--ty' as string]: `${ty}px`,
              }}
            />
          );
        })}

        {/* Zen-modus: Donkere achtergrond, gecentreerde content */}
        <div style={{ 
          minHeight: '100vh',
          background: '#0F172A', // Donkere achtergrond (slate-900)
          color: '#F1F5F9', // Lichte tekst
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'center',
          padding: '60px 24px 40px',
          position: 'relative'
        }}>
          {/* Hoofdcontent: Taak groot gecentreerd */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'center',
            width: '100%',
            maxWidth: '800px',
            textAlign: 'center',
            paddingTop: '40px',
            paddingBottom: '40px'
          }}>
            {/* Taak titel –zelfde typografie als dashboard */}
            <h1 style={{
              fontSize: 'clamp(24px, 5vw, 42px)',
              fontWeight: 500,
              color: '#F1F5F9',
              marginBottom: 8,
              lineHeight: 1.4,
              letterSpacing: '-0.025em',
              width: '100%',
              maxWidth: '100%',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              textAlign: 'center',
              fontFamily: 'inherit'
            }}>
              {currentTask.title}
            </h1>
            {/* Tijdsduur en moeilijkheid informatief */}
            <div style={{ marginBottom: 40, display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', fontSize: 14, color: 'rgba(241,245,249,0.75)', fontWeight: 400 }}>
              {(() => {
                const mins = currentTask.duration ?? currentTask.estimatedDuration;
                return mins != null && mins > 0 ? <span>{mins} min</span> : null;
              })()}
              <span>{currentTask?.energyLevel === 'low' ? 'Makkelijk' : currentTask?.energyLevel === 'high' ? 'Moeilijk' : 'Normaal'}</span>
            </div>

            {/* Mini-stappen – altijd zichtbaar vóór start */}
            <div style={{
              width: '100%',
              maxWidth: '600px',
              marginBottom: 24
            }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(241,245,249,0.8)', marginBottom: 12 }}>
                Mini-stappen
              </div>
              {existingMicroSteps.length > 0 ? (
                existingMicroSteps.map((step: MicroStep, idx: number) => (
                  <div 
                    key={step.id}
                    id={`micro-step-${idx}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '34px 1fr',
                      alignItems: 'center',
                      gap: 14,
                      marginBottom: 16,
                      padding: 16,
                      background: step.done
                        ? 'rgba(16, 185, 129, 0.1)' 
                        : 'rgba(255, 255, 255, 0.03)',
                      borderRadius: 16,
                      border: `2px solid ${step.done ? '#10B981' : 'rgba(255, 255, 255, 0.1)'}`,
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleToggleMicroStep(step.id)}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(step.done)}
                      onChange={() => handleToggleMicroStep(step.id)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: 28,
                        height: 28,
                        cursor: 'pointer',
                        accentColor: '#10B981',
                        flexShrink: 0
                      }}
                    />
                    <span style={{
                      fontSize: 17,
                      color: step.done ? 'rgba(241, 245, 249, 0.5)' : '#F1F5F9',
                      textDecoration: step.done ? 'line-through' : 'none',
                      fontWeight: 400,
                      textAlign: 'left'
                    }}>
                      {step.title}
                    </span>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: 14, color: 'rgba(241,245,249,0.6)' }}>
                  Nog geen mini-stappen. Klik op de knop hieronder om stappen in te vullen.
                </p>
              )}
            </div>

          </div>

          {/* Twee knoppen net boven het lijntje */}
          <div style={{
            width: '100%',
            maxWidth: '600px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            paddingBottom: 24,
          }}>
            <button
              type="button"
              onClick={handleHelpMeStart}
              style={{
                padding: '12px 20px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#F1F5F9',
                cursor: 'pointer',
                fontSize: 15,
                fontWeight: 500,
                width: '100%',
                maxWidth: 320,
                margin: '0 auto',
              }}
            >
              {existingMicroSteps.length > 0 ? 'Bewerk mini-stappen' : 'Opdelen in mini-stappen'}
            </button>
            <button
              onClick={startSession}
              style={{
                padding: '12px 28px',
                background: 'rgba(74, 144, 226, 0.2)',
                color: '#4A90E2',
                border: '2px solid rgba(74, 144, 226, 0.4)',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                width: '100%',
                maxWidth: 320,
                margin: '0 auto',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(74, 144, 226, 0.3)';
                e.currentTarget.style.borderColor = 'rgba(74, 144, 226, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(74, 144, 226, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(74, 144, 226, 0.4)';
              }}
            >
              Start Focus Sessie
            </button>
          </div>

          {/* Gedachten parkeren - Subtiel onderaan */}
          <div style={{
            width: '100%',
            maxWidth: '600px',
            paddingTop: 40,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.querySelector('input') as HTMLInputElement;
                if (input && input.value.trim()) {
                  handleParkThought(input.value.trim());
                  input.value = '';
                }
              }}
              style={{ display: 'flex', gap: 12 }}
            >
              <input
                type="text"
                placeholder="Parkeer een gedachte..."
                style={{
                  flex: 1,
                  padding: '14px 20px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 12,
                  fontSize: 15,
                  color: '#F1F5F9',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '14px 24px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#F1F5F9',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                Parkeer
              </button>
            </form>
          </div>
        </div>

        {/* Mini-stappen editor modal (ook in Focus Card zodat knop werkt) */}
        {showMicroSteps && currentTask && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 12000,
          }}
            onClick={() => setShowMicroSteps(false)}
          >
            <div
              style={{
                width: '100%',
                maxWidth: 560,
                background: '#0B1220',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 16,
                padding: 14,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                <div style={{ fontWeight: 600, color: '#F1F5F9', letterSpacing: '-0.025em' }}>Mini-stappen (behapbaar maken)</div>
                <button
                  onClick={() => setShowMicroSteps(false)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.14)',
                    background: 'rgba(255,255,255,0.06)',
                    color: 'rgba(241,245,249,0.9)',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  Sluiten
                </button>
              </div>

              <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                {microStepInputs.map((row, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      value={row.title}
                      onChange={(e) => {
                        const v = e.target.value;
                        setMicroStepInputs((prev) => prev.map((p, i) => (i === idx ? { ...p, title: v } : p)));
                      }}
                      placeholder="Mini-stap (1 zin)…"
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: 12,
                        border: '1px solid rgba(255,255,255,0.14)',
                        background: 'rgba(255,255,255,0.06)',
                        color: '#F1F5F9',
                        outline: 'none',
                      }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    setMicroStepInputs((prev) => [...prev, { title: '', minutes: null, difficulty: null }]);
                  }}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.14)',
                    background: 'rgba(255,255,255,0.06)',
                    color: '#F1F5F9',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  + Mini stap toevoegen
                </button>
                <button
                  onClick={handleSaveMicroSteps}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid rgba(74,144,226,0.55)',
                    background: 'rgba(74,144,226,0.22)',
                    color: '#93C5FD',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Opslaan
                </button>
              </div>
            </div>
          </div>
        )}
      </AppLayout>
    );
  }

  // Timer modus - Zen-modus met donkere achtergrond
  return (
    <AppLayout hideSidebar={true}>
      <BackToDashboardButton variant="dark" />
      <div
        style={{
          height: "100dvh",
          minHeight: "100vh",
          background: "#0F172A",
          color: "#F1F5F9",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "60px 16px 16px",
          overflow: "hidden",
          boxSizing: "border-box"
        }}
      >
        {/* Hoofdcontent: scrollbaar; Gedachten parkeren blijft onderaan in beeld */}
        <div className="no-scrollbar" style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          alignItems: "center",
          width: "100%",
          maxWidth: "800px",
          textAlign: "center",
          paddingTop: "24px",
          paddingBottom: "16px",
          overflowY: "auto",
          overflowX: "hidden"
        }}>
          {/* Taak titel –zelfde typografie als dashboard */}
          {currentTask && (
            <div style={{ width: '100%', maxWidth: '100%', marginBottom: 24 }}>
              <h1 style={{
                fontSize: 'clamp(20px, 4vw, 36px)',
                fontWeight: 500,
                color: '#F1F5F9',
                marginBottom: 6,
                lineHeight: 1.4,
                letterSpacing: '-0.025em',
                opacity: 0.95,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textAlign: 'center',
                fontFamily: 'inherit'
              }}>
                {currentTask.title}
              </h1>
              <div style={{ fontSize: 14, color: 'rgba(241,245,249,0.65)', textAlign: 'center', fontWeight: 400 }}>
                {(currentTask.duration || currentTask.estimatedDuration) && (
                  <span>{(currentTask.duration ?? currentTask.estimatedDuration) ?? 0} min gepland</span>
                )}
              </div>
            </div>
          )}

          {/* Timer Display –zelfde vibe als dashboard (Inter, tracking-tight) */}
          <div style={{ marginBottom: "40px" }}>
            <div style={{ 
              fontSize: "clamp(64px, 15vw, 120px)", 
              fontFamily: "inherit",
              fontVariantNumeric: "tabular-nums",
              fontWeight: 500,
              color: "#F1F5F9",
              lineHeight: 1,
              letterSpacing: "-0.025em"
            }}>
              {formatTime(timeLeft)}
            </div>
          </div>

          {/* Micro-stappen tijdens timer (als beschikbaar) */}
          {currentTask && existingMicroSteps.length > 0 && (
            <div style={{
              width: '100%',
              maxWidth: '500px',
              marginBottom: 40
            }}>
              {existingMicroSteps.map((step: MicroStep, idx: number) => (
                <div 
                  key={step.id}
                    style={{
                    display: 'grid',
                    gridTemplateColumns: '26px 1fr',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 16,
                    padding: 12,
                    background: step.done
                      ? 'rgba(16, 185, 129, 0.1)' 
                      : 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 12,
                    border: `1px solid ${step.done ? '#10B981' : 'rgba(255, 255, 255, 0.1)'}`,
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    opacity: step.done ? 0.6 : 1
                  }}
                  onClick={() => handleToggleMicroStep(step.id)}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(step.done)}
                    onChange={() => handleToggleMicroStep(step.id)}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: 24,
                      height: 24,
                      cursor: 'pointer',
                      accentColor: '#10B981',
                      flexShrink: 0
                    }}
                  />
                  <span style={{
                    fontSize: 16,
                    color: step.done ? 'rgba(241, 245, 249, 0.5)' : '#F1F5F9',
                    textDecoration: step.done ? 'line-through' : 'none',
                    flex: 1,
                    fontWeight: 400,
                    textAlign: 'left'
                  }}>
                    {step.title}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* During-focus add/edit button */}
          {currentTask && (
            <div style={{ marginBottom: 18 }}>
              <button
                onClick={handleHelpMeStart}
                style={{
                  padding: '10px 14px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  color: '#F1F5F9',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  letterSpacing: '-0.025em',
                  fontFamily: 'inherit',
                }}
              >
                + Mini-stap toevoegen
              </button>
            </div>
          )}

          {/* Micro steps editor modal (lightweight) */}
          {showMicroSteps && currentTask && (
            <div style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
              zIndex: 12000,
            }}
              onClick={() => setShowMicroSteps(false)}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: 560,
                  background: '#0B1220',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 16,
                  padding: 14,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                  <div style={{ fontWeight: 600, color: '#F1F5F9', letterSpacing: '-0.025em', fontFamily: 'inherit' }}>Mini-stappen (behapbaar maken)</div>
                  <button
                    onClick={() => setShowMicroSteps(false)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.14)',
                      background: 'rgba(255,255,255,0.06)',
                      color: 'rgba(241,245,249,0.9)',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    Sluiten
                  </button>
                </div>

                <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                  {microStepInputs.map((row, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        value={row.title}
                        onChange={(e) => {
                          const v = e.target.value;
                          setMicroStepInputs((prev) => prev.map((p, i) => (i === idx ? { ...p, title: v } : p)));
                        }}
                        placeholder="Mini-stap (1 zin)…"
                        style={{
                          flex: 1,
                          padding: '10px 12px',
                          borderRadius: 12,
                          border: '1px solid rgba(255,255,255,0.14)',
                          background: 'rgba(255,255,255,0.06)',
                          color: '#F1F5F9',
                          outline: 'none',
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setMicroStepInputs((prev) => [...prev, { title: '', minutes: null, difficulty: null }]);
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.14)',
                      background: 'rgba(255,255,255,0.06)',
                      color: '#F1F5F9',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    + Mini stap toevoegen
                  </button>
                  <button
                    onClick={handleSaveMicroSteps}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1px solid rgba(74,144,226,0.55)',
                      background: 'rgba(74,144,226,0.22)',
                      color: '#93C5FD',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    Opslaan
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Controls – compact zodat Gedachten parkeren op één scherm blijft */}
          {!completed && !showTimeUpPrompt && (
            <div style={{ marginTop: 'auto', paddingTop: 24, paddingBottom: 16, display: "flex", flexDirection: "column", gap: "10px", width: "100%", maxWidth: "400px" }}>
              {!isRunning ? (
                <>
                  {/* Tijdskeuze - Subtiel */}
                  <div style={{ marginBottom: "20px", display: "flex", justifyContent: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "14px", color: "rgba(241, 245, 249, 0.6)" }}>🕒</span>
                      <select
                        value={duration}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (val) {
                            setDuration(val);
                            setTimeLeft(val * 60);
                          }
                        }}
                        style={{
                          padding: "8px 32px 8px 12px",
                          borderRadius: "8px",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          fontSize: "14px",
                          fontWeight: 500,
                          color: "#F1F5F9",
                          background: "rgba(255, 255, 255, 0.1)",
                          cursor: "pointer",
                          outline: "none",
                          appearance: "none",
                          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23F1F5F9' d='M6 9L1 4h10z'/%3E%3C/svg%3E\")",
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 12px center",
                          paddingRight: "40px"
                        }}
                      >
                        {[5, 10, 15, 20, 25, 30, 45, 60, 90, 120].map((mins) => (
                          <option key={mins} value={mins} style={{ background: "#0F172A", color: "#F1F5F9" }}>{mins} min</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Start knop */}
                  <button
                    onClick={startSession}
                    style={{
                      width: "100%",
                      background: "rgba(74, 144, 226, 0.2)",
                      border: "2px solid rgba(74, 144, 226, 0.4)",
                      borderRadius: "12px",
                      padding: "16px 24px",
                      fontSize: "16px",
                      fontWeight: 500,
                      color: "#4A90E2",
                      cursor: "pointer",
                      transition: "all 0.3s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(74, 144, 226, 0.3)";
                      e.currentTarget.style.borderColor = "rgba(74, 144, 226, 0.6)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(74, 144, 226, 0.2)";
                      e.currentTarget.style.borderColor = "rgba(74, 144, 226, 0.4)";
                    }}
                  >
                    Start Focus Sessie
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={pauseSession}
                    style={{
                      width: "100%",
                      background: isPaused ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
                      border: `2px solid ${isPaused ? "rgba(16, 185, 129, 0.4)" : "rgba(245, 158, 11, 0.4)"}`,
                      borderRadius: "12px",
                      padding: "14px 20px",
                      fontSize: "15px",
                      fontWeight: 500,
                      color: isPaused ? "#10B981" : "#F59E0B",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      fontFamily: "inherit",
                      letterSpacing: "-0.025em"
                    }}
                  >
                    {isPaused ? 'Hervatten' : 'Pauzeren'}
                  </button>
                  
                  {showExtendButton && (
                    <button
                      onClick={extendSession}
                      style={{
                        width: "100%",
                        background: "rgba(16, 185, 129, 0.2)",
                        border: "2px solid rgba(16, 185, 129, 0.4)",
                        borderRadius: "12px",
                        padding: "12px 20px",
                        fontSize: "14px",
                        fontWeight: 500,
                        fontFamily: "inherit",
                        letterSpacing: "-0.025em",
                        color: "#10B981",
                        cursor: "pointer",
                        transition: "all 0.3s ease"
                      }}
                    >
                      +5 Minuten
                    </button>
                  )}
                  
                  <button
                    onClick={stopSession}
                    style={{
                      width: "100%",
                      background: "rgba(239, 68, 68, 0.2)",
                      border: "2px solid rgba(239, 68, 68, 0.4)",
                      borderRadius: "12px",
                    padding: "14px 20px",
                    fontSize: "15px",
                    fontWeight: 500,
                    fontFamily: 'inherit',
                    letterSpacing: '-0.025em',
                    color: "#EF4444",
                      cursor: "pointer",
                      transition: "all 0.3s ease"
                    }}
                  >
                    Stoppen
                  </button>

                  <button
                    onClick={completeCurrentTask}
                    style={{
                      width: "100%",
                      background: "rgba(16, 185, 129, 0.2)",
                      border: "2px solid rgba(16, 185, 129, 0.4)",
                      borderRadius: "12px",
                    padding: "14px 20px",
                    fontSize: "15px",
                    fontWeight: 500,
                    fontFamily: 'inherit',
                    letterSpacing: '-0.025em',
                    color: "#10B981",
                    cursor: "pointer",
                    transition: "all 0.3s ease"
                    }}
                  >
                    Taak voltooid
                  </button>
                </>
              )}
            </div>
          )}

          {/* Timer klaar prompt */}
          {showTimeUpPrompt && (
            <div style={{
              width: '100%',
              maxWidth: 520,
              marginTop: 8,
              padding: 20,
              borderRadius: 16,
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.025em', fontFamily: 'inherit', color: '#F1F5F9', marginBottom: 8 }}>
                Tijd is om. Is de taak voltooid?
              </div>
              <div style={{ fontSize: 14, color: 'rgba(241, 245, 249, 0.75)', marginBottom: 14, lineHeight: 1.5 }}>
                {timeUpQuote}
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={completeCurrentTask}
                  style={{
                    padding: '12px 16px',
                    minWidth: 180,
                    borderRadius: 12,
                    background: 'rgba(16, 185, 129, 0.22)',
                    border: '2px solid rgba(16, 185, 129, 0.40)',
                    color: '#10B981',
                    fontSize: 15,
                    fontWeight: 500,
                    letterSpacing: '-0.025em',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Ja, taak voltooid
                </button>

                <button
                  onClick={() => {
                    const extra = Math.max(1, Math.min(480, extendMinutes || 10));
                    setShowTimeUpPrompt(false);
                    setCompleted(false);
                    setIsPaused(false);
                    setIsRunning(true);
                    setDuration(prev => prev + extra);
                    setTimeLeft(extra * 60);
                    track('ignite_extend_after_timeup', { taskTitle, duration, extra });
                    toast(`Top — nog ${extra} minuten!`);
                  }}
                  style={{
                    padding: '12px 16px',
                    minWidth: 180,
                    borderRadius: 12,
                    background: 'rgba(74, 144, 226, 0.18)',
                    border: '2px solid rgba(74, 144, 226, 0.35)',
                    color: '#93C5FD',
                    fontSize: 15,
                    fontWeight: 500,
                    letterSpacing: '-0.025em',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Nee, verlengen
                </button>
              </div>

              <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                {[5, 10, 15, 25].map((m) => (
                  <button
                    key={m}
                    onClick={() => setExtendMinutes(m)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 999,
                      background: extendMinutes === m ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.16)',
                      color: '#F1F5F9',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    +{m} min
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Completion Message */}
          {completed && (
            <div style={{ 
              marginBottom: "28px", 
              padding: "32px", 
              background: "rgba(16, 185, 129, 0.1)", 
              border: "2px solid rgba(16, 185, 129, 0.3)", 
              borderRadius: "16px",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎉</div>
              <h3 style={{ fontSize: "24px", fontWeight: 600, color: "#10B981", marginBottom: "8px" }}>
                Taakblok Afgerond!
              </h3>
              <div style={{ fontSize: "14px", color: "rgba(241, 245, 249, 0.8)", fontWeight: 400, marginBottom: "24px" }}>
                Je hebt {Math.round(((duration * 60 - timeLeft) / 60))} minuten gefocust
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <button
                  onClick={completeCurrentTask}
                  style={{
                    width: "100%",
                    background: "rgba(16, 185, 129, 0.2)",
                    border: "2px solid rgba(16, 185, 129, 0.4)",
                    borderRadius: "12px",
                    padding: "16px 24px",
                    fontSize: "16px",
                    fontWeight: 500,
                    color: "#10B981",
                    cursor: "pointer",
                    transition: "all 0.3s ease"
                  }}
                >
                  Taak voltooid
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Gedachten parkeren – altijd zichtbaar onderaan (geen scrollen nodig) */}
        <div style={{
          width: "100%",
          maxWidth: "600px",
          flexShrink: 0,
          paddingTop: 12,
          paddingBottom: 8,
          borderTop: "1px solid rgba(255, 255, 255, 0.1)"
        }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.querySelector('input') as HTMLInputElement;
              if (input && input.value.trim()) {
                handleParkThought(input.value.trim());
                input.value = '';
              }
            }}
            style={{ display: "flex", gap: 10 }}
          >
            <input
              type="text"
              placeholder="Parkeer een gedachte..."
              style={{
                flex: 1,
                padding: "12px 16px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 12,
                fontSize: 14,
                color: "#F1F5F9",
                outline: "none",
                transition: "all 0.2s"
              }}
              onFocus={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
              }}
            />
            <button
              type="submit"
              style={{
                padding: "12px 20px",
                background: "rgba(255, 255, 255, 0.1)",
                color: "#F1F5F9",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
              }}
            >
              Parkeer
            </button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}

export default function FocusPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0F172A]">
        <span className="text-slate-400">Laden...</span>
      </div>
    }>
      <FocusContent />
    </Suspense>
  );
}
