"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTaskContext } from "../context/TaskContext";
import { designSystem } from "../lib/design-system";
import { useCheckIn } from "../hooks/useCheckIn";
import { toast } from "./Toast";
import { track } from "../shared/track";
import TaskScheduleEditor from "./TaskScheduleEditor";
import { normalizeMicroSteps, microStepId, type MicroStep, type MicroStepDifficulty } from "../lib/microSteps";
import { isOpenBacklogTask } from "../lib/taskFilters";
import { PlayIcon, CheckCircleIcon, PlusIcon, PencilSquareIcon, TrashIcon, ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
/** ---- Theme (gebruikt design-systeem) ---- */
const theme = {
  bg: designSystem.colors.background,
  card: designSystem.colors.white,
  text: designSystem.colors.text,
  sub: designSystem.colors.textSecondary,
  line: designSystem.colors.border,
  accent: designSystem.colors.primary,
  soft: "rgba(74,144,226,0.06)",
};

/** ---------- Hoofdcomponent ---------- */
export default function TasksOverviewCalm() {
  const { tasks, loading, addTask, updateTask, deleteTask } = useTaskContext();
  const router = useRouter();
  
  // State voor nieuwe taak input
  const [newTitle, setNewTitle] = useState("");
  const [newDuration, setNewDuration] = useState<number | null>(null);
  const [showVandaagPrompt, setShowVandaagPrompt] = useState<string | null>(null); // taskId die prompt moet tonen
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [editing, setEditing] = useState<any>(null);
  const [microStepDraft, setMicroStepDraft] = useState<{ title: string; minutes: number | null; difficulty: MicroStepDifficulty | null }>({
    title: '',
    minutes: null,
    difficulty: null,
  });

  // Parked thought -> task conversion modal state
  const [convertingThought, setConvertingThought] = useState<any>(null);
  const [convertDuration, setConvertDuration] = useState<number | null>(null);
  const [convertEnergy, setConvertEnergy] = useState<'low' | 'medium' | 'high'>('medium');
  const { checkIn: todayCheckIn } = useCheckIn();
  const [priorityTasks, setPriorityTasks] = useState<{ [key: number]: any }>({ 1: null, 2: null, 3: null });
  const [completedSectionOpen, setCompletedSectionOpen] = useState(false);
  /** Taak net aangevinkt: line-through + opacity, na 300ms echte update + verhuizing naar Voltooide taken */
  const [completingTaskIds, setCompletingTaskIds] = useState<Set<string>>(new Set());
  /** Pop-animatie op checkbox (task.id) */
  const [checkboxPopId, setCheckboxPopId] = useState<string | null>(null);

  // Mobiele kolommen: scroll-snap pager
  const columnsWrapperRef = useRef<HTMLDivElement | null>(null);
  const [activeEnergyCol, setActiveEnergyCol] = useState(0);

  // Nieuwe taak UX: eerst titel + duur invullen, pas daarna op energie-kleur klikken.
  const durationValid =
    typeof newDuration === 'number' &&
    Number.isFinite(newDuration) &&
    newDuration >= 1 &&
    newDuration <= 480;
  const canAddNewTask = newTitle.trim().length > 0 && durationValid;

  useEffect(() => {
    const loadFromDayStart = () => {
      if (typeof window === 'undefined') return;
      
      try {
        // Taken uit context (Supabase of localStorage)
        const allTasks = tasks;
        
        // BELANGRIJK: Toon ALLE taken met priority 1, 2 of 3, ongeacht maxSlots
        const priorities: { [key: number]: any } = { 1: null, 2: null, 3: null };
        
        for (let i = 1; i <= 3; i++) {
          const task = allTasks.find((t: any) => {
            if (!t || !t.id || !t.title || t.done || t.source === 'medication' || t.source === 'event') {
              return false;
            }
            return t.priority == i;
          });
          if (task) {
            priorities[i] = task;
          }
        }
        
        setPriorityTasks(priorities);
      } catch (error) {
        console.error('❌ Error loading from DayStart:', error);
      }
    };
    
    loadFromDayStart();
  }, [tasks]);

  useEffect(() => {
    const el = columnsWrapperRef.current;
    if (!el) return;

    let raf = 0;
    const updateActive = () => {
      const cards = Array.from(el.querySelectorAll<HTMLElement>(".tasks-column-card"));
      if (cards.length === 0) return;

      const center = el.scrollLeft + el.clientWidth / 2;
      let bestIdx = 0;
      let bestDist = Number.POSITIVE_INFINITY;

      for (let i = 0; i < cards.length; i++) {
        const c = cards[i];
        const cCenter = c.offsetLeft + c.offsetWidth / 2;
        const d = Math.abs(cCenter - center);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }

      setActiveEnergyCol((prev) => (prev === bestIdx ? prev : bestIdx));
    };

    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateActive);
    };

    // Init + listeners
    updateActive();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll as any);
      window.removeEventListener("resize", onScroll as any);
    };
  }, []);

  // Bepaal max slots
  const maxSlots = useMemo(() => {
    if (!todayCheckIn) return 3;
    const energyLevel = todayCheckIn.energy_level || 'medium';
    if (energyLevel === 'low') return 1;
    if (energyLevel === 'medium') return 2;
    return 3;
  }, [todayCheckIn]);

  // Helper: Get energie kleur
  const getEnergyColor = (level: string) => {
    switch (level) {
      case 'low': return '#10B981'; // groen
      case 'medium': return '#F59E0B'; // oranje
      case 'high': return '#EF4444'; // rood
      default: return '#6B7280';
    }
  };

  // Glow voor status-dot (zelfde kleur, transparant)
  const getEnergyGlow = (level: string) => {
    const c = getEnergyColor(level);
    const hex = c.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `0 0 0 2px ${c}20, 0 0 8px ${c}40`;
  };

  // Helper: Get energie label
  const getEnergyLabel = (level: string) => {
    switch (level) {
      case 'low': return 'Makkelijk';
      case 'medium': return 'Normaal';
      case 'high': return 'Moeilijk';
      default: return 'Onbekend';
    }
  };

  const addMicroStepToTask = async (task: any) => {
    const title = microStepDraft.title.trim();
    if (!title) {
      toast('Vul een mini-stap in');
      return;
    }
    const existing = normalizeMicroSteps(task.microSteps);
    const next: MicroStep[] = [
      ...existing,
      {
        id: microStepId(),
        title,
        minutes: null,
        difficulty: null,
        done: false,
      }
    ];
    await updateTask(task.id, { microSteps: next });
    setMicroStepDraft({ title: '', minutes: null, difficulty: null });
    toast('Mini-stap toegevoegd');
  };

  const toggleMicroStepDone = async (task: any, stepId: string) => {
    const steps = normalizeMicroSteps(task.microSteps);
    const next = steps.map(s => (s.id === stepId ? { ...s, done: !s.done } : s));
    await updateTask(task.id, { microSteps: next });
  };

  const promoteMicroStepToTask = async (task: any, stepId: string) => {
    const steps = normalizeMicroSteps(task.microSteps);
    const step = steps.find(s => s.id === stepId);
    if (!step) return;
    const nextSteps = steps.map(s => s.id === stepId ? { ...s, done: true } : s);

    await addTask({
      title: step.title,
      done: false,
      started: false,
      priority: null,
      energyLevel: step.difficulty || task.energyLevel || 'medium',
      duration: (typeof step.minutes === 'number' && step.minutes > 0) ? step.minutes : null,
      estimatedDuration: (typeof step.minutes === 'number' && step.minutes > 0) ? step.minutes : null,
      notToday: false,
      source: 'regular',
    });

    await updateTask(task.id, { microSteps: nextSteps });
    toast('Mini-stap omgezet naar taak', { durationMs: 3000, replace: true });
  };

  // Handle: Nieuwe taak toevoegen
  const handleAddTaskWithEnergy = async (energyLevel: 'low' | 'medium' | 'high') => {
    if (!newTitle.trim()) {
      toast('Voer een taak in');
      return;
    }

    if (!durationValid) {
      toast('Vul eerst de duur (minuten) in (minimaal 1).');
      return;
    }

    const duration = newDuration as number;

    try {
      const taskData = {
        title: newTitle.trim(),
        done: false,
        started: false,
        priority: null, // GEEN prioriteit bij toevoegen
        energyLevel: energyLevel, // KRITIEK: Explicit doorgeven
        estimatedDuration: duration,
        duration: duration,
        notToday: false,
        source: 'regular',
      };
      
      const newTask = await addTask(taskData);

      setNewTitle("");
      setNewDuration(null);
      
      // Bevestiging: Taak toegevoegd (inline, subtiel)
      toast("✅ Taak toegevoegd → Staat bij Alle open taken");
      
      // Toon "Vandaag?" prompt na toevoegen (optioneel)
      setShowVandaagPrompt(newTask.id);
      
      // Auto-verberg prompt na 5 seconden
      setTimeout(() => {
        setShowVandaagPrompt(null);
      }, 5000);
      
      track('task_added', { energyLevel });
    } catch (error) {
      console.error('Error adding task:', error);
      toast('Fout bij toevoegen van taak');
    }
  };

  // Handle: "Vandaag" kiezen voor nieuwe taak
  const handleAddToVandaag = async (taskId: string) => {
    // Check of "Vandaag gekozen" al vol is (max 3)
    const currentVandaagCount = Object.values(priorityTasks).filter(t => t !== null).length;
    
    if (currentVandaagCount >= maxSlots) {
      toast(`Je focus voor vandaag is al gekozen`);
      setShowVandaagPrompt(null);
      return;
    }

    // Vind de laagste beschikbare priority (achteraan toevoegen)
    let targetPriority = 1;
    for (let i = 1; i <= maxSlots; i++) {
      if (!priorityTasks[i]) {
        targetPriority = i;
        break;
      }
    }

    try {
      // KRITIEK: Vind de taak om energyLevel te behouden
      const taskToUpdate = tasks.find(t => t.id === taskId);
      const preservedEnergyLevel = taskToUpdate?.energyLevel || 'medium';
      
      await updateTask(taskId, { 
        priority: targetPriority,
        energyLevel: preservedEnergyLevel // Behoud bestaande energyLevel
      });
      setShowVandaagPrompt(null);
      toast('Taak toegevoegd aan vandaag');
      track('task_added_to_vandaag', { taskId, priority: targetPriority });
    } catch (error) {
      console.error('Error adding to vandaag:', error);
      toast('Fout bij toevoegen aan vandaag');
    }
  };

  // Handle: "Later" kiezen (geen actie nodig)
  const handleAddToLater = () => {
    setShowVandaagPrompt(null);
  };

  // Handle: Start Focus Mode
  // KRITIEK: Focus duur moet matchen met de ingeschatte taakduur (duration/estimatedDuration)
  const startFocus = async (task: any) => {
    try {
      await updateTask(task.id, { started: true });
      
      const taskDuration =
        (typeof task?.duration === 'number' && task.duration > 0 ? task.duration : null) ??
        (typeof task?.estimatedDuration === 'number' && task.estimatedDuration > 0 ? task.estimatedDuration : null) ??
        15;

      const focusUrl = `/focus?task=${encodeURIComponent(task.id)}&duration=${encodeURIComponent(taskDuration)}&energy=${task.energyLevel || 'medium'}`;
      router.push(focusUrl);
      
      toast("🚀 Focus sessie gestart!");
      track("focus_start", { 
        taskId: task.id, 
        duration: taskDuration,
        energyLevel: task.energyLevel || 'medium'
      });
    } catch (error) {
      console.error('Error starting focus:', error);
      toast('Fout bij starten van focus sessie');
    }
  };

  // Voltooien vanuit Alle open taken: eerst visueel (line-through, pop), dan na 300ms persist + verhuizing naar Voltooide taken
  const handleCompleteFromList = (task: any) => {
    setCompletingTaskIds((prev) => new Set(prev).add(task.id));
    setCheckboxPopId(task.id);
    setTimeout(() => setCheckboxPopId(null), 200);
    setTimeout(() => {
      updateTask(task.id, { done: true, completedAt: new Date().toISOString() });
      setCompletingTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
      setCompletedSectionOpen(true); // Sectie Voltooide taken open zodat de taak daar zichtbaar is
      toast('Taak afgevinkt!');
    }, 300);
  };

  // Bepaal "Nu aan zet" taak (eerste taak uit "Vandaag gekozen")
  const nuAanZetTask = useMemo(() => {
    for (let i = 1; i <= maxSlots; i++) {
      if (priorityTasks[i] && !priorityTasks[i].done && !priorityTasks[i].started) {
        return priorityTasks[i];
      }
    }
    return null;
  }, [priorityTasks, maxSlots]);

  // Filter: Alle open taken (geen priority, niet done, geen medication/events/parked_thought)
  const openTasks = useMemo(() => {
    const durationOf = (t: any) => {
      const d = t?.duration ?? t?.estimatedDuration;
      return typeof d === 'number' && !Number.isNaN(d) ? d : Number.POSITIVE_INFINITY;
    };

    return tasks
      .filter((t: any) => isOpenBacklogTask(t))
      // Sorteer op ingeschatte duur: kortste eerst, zonder duur onderaan
      .sort((a: any, b: any) => {
        const diff = durationOf(a) - durationOf(b);
        if (diff !== 0) return diff;
        return String(a?.title || '').localeCompare(String(b?.title || ''));
      });
  }, [tasks]);

  // Energy Board (Taken & Prioriteiten): verdeel open taken in 3 kolommen
  const openByEnergy = useMemo(() => {
    const normalize = (lvl?: string) => {
      // Support zowel legacy low/medium/high als green/yellow/red
      if (!lvl) return 'yellow';
      if (lvl === 'low') return 'green';
      if (lvl === 'medium') return 'yellow';
      if (lvl === 'high') return 'red';
      return lvl;
    };
    const withNorm = openTasks.map((t: any) => ({ ...t, _energyNorm: normalize(t.energyLevel) }));
    return {
      green: withNorm.filter((t: any) => t._energyNorm === 'green'),
      yellow: withNorm.filter((t: any) => t._energyNorm === 'yellow'),
      red: withNorm.filter((t: any) => t._energyNorm === 'red'),
    };
  }, [openTasks]);

  // Filter: Voltooide taken (done, gesorteerd op completedAt nieuwste eerst)
  const completedTasks = useMemo(() => {
    return tasks
      .filter((t: any) => t.done && t.source !== 'medication' && t.source !== 'event')
      .sort((a: any, b: any) => {
        const da = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const db = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return db - da;
      });
  }, [tasks]);

  // Filter: Geparkeerde gedachten
  const parkedThoughts = useMemo(() => {
    return tasks.filter((t: any) => {
      return t.source === 'parked_thought' && !t.done;
    });
  }, [tasks]);

  return (
    <div
      className="min-h-screen py-12 px-4 sm:px-6 pb-16"
      style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' }}
    >
      <main className="mx-auto max-w-4xl flex flex-col gap-8">
        {/* Header – zweeft los op grijze achtergrond, luchtigheid zoals Herinneringen */}
        <header className="text-center pt-12 pb-0 mb-12">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4"
            style={{
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              boxShadow: '0 4px 14px rgba(34, 197, 94, 0.35)',
            }}
          >
            <CheckCircleIcon className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Taken en Prioriteiten</h1>
          <p className="text-sm text-gray-500 mt-2">
            {loading ? (
              'Taken laden…'
            ) : (
              'Focus op wat nu belangrijk is en begin met je eerste taak.'
            )}
          </p>
        </header>

        {/* Content – losse witte kaarten met gelijke afstand */}
        <div className="flex flex-col gap-8">
      {/* SECTIE 1: Nieuwe taak toevoegen – compact op mobiel, ruim op desktop */}
      <section className="bg-white rounded-3xl shadow-sm p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Nieuwe taak toevoegen</h2>
          <div className="group relative flex items-center">
            <button
              type="button"
              aria-label="Uitleg nieuwe taak toevoegen"
              title="Uitleg nieuwe taak toevoegen"
              className="w-6 h-6 rounded-full border border-gray-200 bg-white/70 text-slate-600 flex items-center justify-center text-[12px] leading-none hover:bg-white transition-colors"
              onClick={() => {
                toast("Vul eerst de duur (minuten) in. Klik daarna op een kleur om de taak toe te voegen.");
              }}
            >
              i
            </button>
            <div
              className="pointer-events-none absolute top-7 right-0 z-50 w-64 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
              role="tooltip"
            >
              <div className="text-[11px] font-semibold text-gray-900 mb-1">Zo werkt het</div>
              <div className="text-[11px] text-gray-600 leading-relaxed">
                Vul eerst <span className="font-semibold">Duur (min)</span> in.
                <br />
                Klik daarna op <span className="font-semibold">een kleur</span> (groen/geel/rood).
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-2xl p-4 sm:p-5 mb-4">
          <div className="flex gap-3 items-center flex-wrap">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddTaskWithEnergy('medium');
              }}
              placeholder="Nieuwe taak…"
              className="flex-1 min-w-[200px] px-4 py-3 rounded-2xl shadow-sm bg-white focus:ring-2 focus:ring-gray-200 text-gray-900 placeholder-gray-400"
            />
            
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
            <button
              onClick={() => handleAddTaskWithEnergy('low')}
              disabled={!canAddNewTask}
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40"
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                boxShadow: '0 1px 3px rgba(16, 185, 129, 0.2)',
                cursor: canAddNewTask ? 'pointer' : 'not-allowed'
              }}
              onMouseEnter={(e) => canAddNewTask && (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.25)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)')}
              title="Makkelijk"
            >
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#10B981'
              }} />
            </button>
            <button
              onClick={() => handleAddTaskWithEnergy('medium')}
              disabled={!canAddNewTask}
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40"
              style={{
                background: 'rgba(245, 158, 11, 0.15)',
                boxShadow: '0 1px 3px rgba(245, 158, 11, 0.2)',
                cursor: canAddNewTask ? 'pointer' : 'not-allowed'
              }}
              onMouseEnter={(e) => canAddNewTask && (e.currentTarget.style.background = 'rgba(245, 158, 11, 0.25)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(245, 158, 11, 0.15)')}
              title="Normaal"
            >
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#F59E0B'
              }} />
            </button>
            <button
              onClick={() => handleAddTaskWithEnergy('high')}
              disabled={!canAddNewTask}
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                boxShadow: '0 1px 3px rgba(239, 68, 68, 0.2)',
                cursor: canAddNewTask ? 'pointer' : 'not-allowed'
              }}
              onMouseEnter={(e) => canAddNewTask && (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)')}
              title="Moeilijk"
            >
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#EF4444'
              }} />
            </button>
          </div>
          </div>
          
          {/* Duur is verplicht voordat je de taak toevoegt */}
          <div className="flex gap-3 items-center mt-3">
            <label className="text-sm font-medium text-gray-500">
              Duur (min): <span className="text-gray-400">(verplicht)</span>
            </label>
            <input
              type="number"
              min="1"
              max="480"
              value={newDuration || ''}
              onChange={(e) => {
                const value = e.target.value;
                setNewDuration(value === '' ? null : parseInt(value, 10));
              }}
              placeholder="15"
              className="w-24 px-3 py-2 rounded-xl shadow-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gray-200 text-gray-900 placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* "Vandaag?" prompt */}
        {showVandaagPrompt && (
          <div className="mt-3 p-4 bg-gray-50 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-gray-600">Moet dit vandaag?</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleAddToVandaag(showVandaagPrompt)}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-sm hover:bg-blue-700 transition-colors"
              >
                Vandaag
              </button>
              <button
                onClick={handleAddToLater}
                className="px-4 py-2 rounded-xl bg-white text-gray-600 text-sm font-medium shadow-sm hover:bg-gray-50 transition-colors"
              >
                Later
              </button>
            </div>
          </div>
        )}
      </section>

      {/* SECTIE 2: Nu aan zet */}
      <section className="bg-white rounded-3xl shadow-sm p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Nu aan zet</h2>
          <div className="group relative flex items-center">
            <button
              type="button"
              aria-label="Uitleg nu aan zet"
              title="Uitleg nu aan zet"
              className="w-6 h-6 rounded-full border border-gray-200 bg-white/70 text-slate-600 flex items-center justify-center text-[12px] leading-none hover:bg-white transition-colors"
              onClick={() =>
                toast("Nu aan zet: dit is je eerste focus-taak. Klik op Beginnen om Focus Modus te starten.")
              }
            >
              i
            </button>
            <div
              className="pointer-events-none absolute top-7 left-0 z-50 w-56 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
              role="tooltip"
            >
              <div className="text-[11px] font-semibold text-gray-900 mb-1">Nu aan zet</div>
              <div className="text-[11px] text-gray-600 leading-relaxed">
                Je eerste focus-taak. Klik op <span className="font-semibold">Beginnen</span> om Focus Modus te starten.
              </div>
            </div>
          </div>
        </div>
        
        {nuAanZetTask ? (
          <div className="bg-gray-50 rounded-2xl p-6 hover:shadow-sm transition-shadow">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 600, color: theme.text, marginBottom: 6, lineHeight: 1.35 }}>
                  {nuAanZetTask.title}
                </div>
                <div style={{ fontSize: 13, color: theme.sub }}>
                  {getEnergyLabel(nuAanZetTask.energyLevel || 'medium')}
                  {nuAanZetTask.duration ? ` · ${nuAanZetTask.duration} min` : ''}
                </div>
              </div>
              <button
                type="button"
                onClick={() => startFocus(nuAanZetTask)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors flex-shrink-0"
              >
                <PlayIcon className="w-4 h-4" aria-hidden />
                Beginnen
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-gray-50 rounded-2xl shadow-sm text-center text-gray-500 text-sm">
            Geen taak gekozen voor vandaag
          </div>
        )}
      </section>

      {/* SECTIE 3: Vandaag gekozen – responsief: op mobiel titel boven, knoppen eronder */}
      <section className="bg-white rounded-3xl shadow-sm p-6 sm:p-8">
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Vandaag gekozen</h2>
            <div className="group relative flex items-center">
              <button
                type="button"
                aria-label="Uitleg vandaag gekozen"
                title="Uitleg vandaag gekozen"
                className="w-6 h-6 rounded-full border border-gray-200 bg-white/70 text-slate-600 flex items-center justify-center text-[12px] leading-none hover:bg-white transition-colors"
                onClick={() =>
                  toast("Vandaag gekozen: dit zijn je focuspunten voor vandaag (prioriteit 1/2/3). Start per taak met Start Focus.")
                }
              >
                i
              </button>
              <div
                className="pointer-events-none absolute top-7 left-0 z-50 w-64 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                role="tooltip"
              >
                <div className="text-[11px] font-semibold text-gray-900 mb-1">Vandaag gekozen</div>
                <div className="text-[11px] text-gray-600 leading-relaxed">
                  Je focuspunten voor vandaag (prioriteit 1/2/3). Start per taak met <span className="font-semibold">Start Focus</span>.
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">(klaargezet voor vandaag)</p>
        </div>
        
        <div className="space-y-4">
          {[1, 2, 3].map((priority) => {
            if (priority > maxSlots) return null;
            
            const task = priorityTasks[priority];
            if (!task || task.done) return null;
            
            return (
              <div
                key={priority}
                className="bg-gray-50 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 transition-all duration-200 hover:bg-white hover:shadow-md sm:hover:scale-[1.01] cursor-default min-w-0"
              >
                <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0 w-full sm:w-auto">
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: theme.accent,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 600,
                    flexShrink: 0
                  }}>
                    {priority}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm sm:text-base font-medium text-gray-900 break-words" style={{ marginBottom: 4 }}>
                      {task.title}
                    </div>
                    <div className="flex gap-2 sm:gap-3 items-center text-xs sm:text-sm text-gray-500">
                      <span
                        style={{
                          display: 'inline-block',
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: getEnergyColor(task.energyLevel || 'medium'),
                          boxShadow: getEnergyGlow(task.energyLevel || 'medium'),
                          flexShrink: 0
                        }}
                        title={getEnergyLabel(task.energyLevel || 'medium')}
                      />
                      {task.duration && (
                        <span className="tabular-nums">· {task.duration} min</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Acties: Start, Uit vandaag, Verwijderen – elke taak heeft eigen Start */}
                <div className="flex gap-2 sm:gap-3 flex-shrink-0 justify-end sm:justify-end flex-wrap">
                  <button
                    onClick={(e) => { e.stopPropagation(); startFocus(task); }}
                    className="px-3 py-2 sm:py-1.5 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-sm hover:bg-blue-700 transition-colors"
                    title="Start Focus voor deze taak"
                  >
                    Start
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      // Zorg dat de taak weer zichtbaar wordt bij "Alle open taken"
                      await updateTask(task.id, { priority: null, notToday: false });
                      toast('Taak staat weer bij Alle open taken');
                    }}
                    className="px-3 py-2 sm:py-1.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium shadow-sm hover:bg-gray-200 transition-colors"
                    title="Uit vandaag halen"
                  >
                    Uit vandaag
                  </button>

                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (confirm('Weet je zeker dat je deze taak wilt verwijderen?')) {
                        await deleteTask(task.id);
                        toast('Taak verwijderd');
                      }
                    }}
                    className="px-3 py-2 sm:py-1.5 rounded-xl bg-red-50 text-red-600 text-sm font-medium shadow-sm hover:bg-red-100 transition-colors"
                    title="Taak verwijderen"
                  >
                    Verwijderen
                  </button>
                </div>
              </div>
            );
          })}
          
          {Object.values(priorityTasks).filter(t => t !== null && !t.done).length === 0 && (
            <div className="p-6 text-center text-gray-500 text-sm bg-gray-50 rounded-2xl shadow-sm">
              Geen taken gekozen voor vandaag
            </div>
          )}
        </div>
      </section>

      {/* SECTIE 4: Alle open taken – zwevende kaarten */}
      <section id="alle-open-taken" className="bg-white rounded-3xl shadow-sm p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Alle open taken</h2>
          <div className="group relative flex items-center">
            <button
              type="button"
              aria-label="Uitleg energie-zones"
              title="Uitleg energie-zones"
              className="w-6 h-6 rounded-full border border-gray-200 bg-white/70 text-slate-600 flex items-center justify-center text-[12px] leading-none hover:bg-white transition-colors"
            >
              i
            </button>
            <div
              className="pointer-events-none absolute top-7 right-[-120px] z-50 w-56 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
              role="tooltip"
            >
              <div className="text-[11px] font-semibold text-gray-900 mb-1">Energie-zones</div>
              <div className="text-[11px] text-gray-600 leading-relaxed">
                <span className="font-semibold text-emerald-600">Makkelijk</span>: dit zijn taken die je weinig energie kosten.
                <br />
                <span className="font-semibold text-amber-600">Normaal</span>: taken met normale energie-kost.
                <br />
                <span className="font-semibold text-red-600">Intensief</span>: taken die je veel energie kosten.
              </div>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm bg-gray-50 rounded-2xl shadow-sm animate-pulse">
            Taken laden…
          </div>
        ) : openTasks.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm bg-gray-50 rounded-2xl shadow-sm">
            Geen openstaande taken
          </div>
        ) : (
          <>
            <div ref={columnsWrapperRef} className="tasks-columns-wrapper grid grid-cols-1 lg:grid-cols-3 gap-4">
              {[
                {
                  key: 'green' as const,
                  title: 'Makkelijk',
                },
                {
                  key: 'yellow' as const,
                  title: 'Normaal',
                },
                {
                  key: 'red' as const,
                  title: 'Intensief',
                },
              ].map((col) => {
                const list = (openByEnergy as any)[col.key] as any[];
                return (
                  <div key={col.key} className="tasks-column-card bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="tasks-column-title text-sm font-semibold text-gray-900">{col.title}</div>
                    <div className="text-xs font-semibold text-gray-500 bg-white border border-gray-200 rounded-lg px-2 py-0.5">
                      {list.length}
                    </div>
                  </div>
                  {list.length === 0 ? (
                    <div className="text-xs text-gray-500 italic">Geen taken</div>
                  ) : (
                    <div className="space-y-3">
                      {list.map((task: any) => {
                        const isExpanded = expandedTaskId === task.id;
                        const energyLevel = task.energyLevel || 'medium';
                        const isCompleting = completingTaskIds.has(task.id);
                        const isPop = checkboxPopId === task.id;

                        return (
                          <div
                            key={task.id}
                            className="group bg-white rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-sm border border-gray-100"
                          >
                            <div
                              onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                              className="p-4 flex flex-col gap-2 cursor-pointer min-w-0"
                            >
                              <div className="flex items-start gap-3 min-w-0">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleCompleteFromList(task); }}
                                  aria-label="Taak afvinken"
                                  title={`${getEnergyLabel(energyLevel)} – klik om af te vinken`}
                                  className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-full transition-transform duration-200 cursor-pointer ${isPop ? 'scale-125' : 'scale-100'}`}
                                  style={{
                                    background: getEnergyColor(energyLevel),
                                    boxShadow: getEnergyGlow(energyLevel)
                                  }}
                                />
                                <div className="flex-1 min-w-0">
                                  <div
                                    className={`text-sm font-medium break-words transition-all duration-200 ${
                                      isCompleting ? 'text-gray-500 opacity-50 line-through' : 'text-gray-900'
                                    }`}
                                  >
                                    {task.title}
                                  </div>
                                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                                    {(task.duration || task.estimatedDuration) && (
                                      <span className="text-[11px] text-gray-400 tabular-nums">
                                        {task.duration || task.estimatedDuration} min
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {!isExpanded && (
                                <div className="flex items-center justify-end gap-3 pt-2">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); startFocus(task); }}
                                    className="px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-colors bg-blue-600 text-white hover:bg-blue-700"
                                    title="Start deze taak"
                                  >
                                    Start
                                  </button>
                                  <span className="text-gray-400 text-sm">{isExpanded ? '▼' : '›'}</span>
                                </div>
                              )}
                            </div>

                            {isExpanded && (
                              <div
                                className="pt-5 pb-5 px-5 bg-gray-50/50 border-t border-gray-100"
                                style={{ boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.03)' }}
                              >
                                <div className="flex flex-col gap-4">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); startFocus(task); setExpandedTaskId(null); }}
                                    className="w-full py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-all text-center"
                                  >
                                    Start Focus
                                  </button>
                                  <div className="flex items-center justify-between pt-2 border-t border-gray-200/80">
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); setEditing(task); }}
                                      className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1.5"
                                    >
                                      <PencilSquareIcon className="w-4 h-4" aria-hidden />
                                      Bewerken
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (confirm('Weet je zeker dat je deze taak wilt verwijderen?')) {
                                          await deleteTask(task.id);
                                          setExpandedTaskId(null);
                                        }
                                      }}
                                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Verwijderen"
                                    >
                                      <TrashIcon className="w-5 h-5" aria-hidden />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                );
              })}
            </div>

            {/* Mobiele pager dots: Makkelijk / Normaal / Intensief */}
            <div className="mt-4 flex items-center justify-center gap-2 lg:hidden">
              {['Makkelijk', 'Normaal', 'Intensief'].map((label, idx) => (
                <button
                  key={label}
                  type="button"
                  aria-label={`Ga naar ${label}`}
                  onClick={() => {
                    const el = columnsWrapperRef.current;
                    if (!el) return;
                    const cards = Array.from(el.querySelectorAll<HTMLElement>(".tasks-column-card"));
                    const card = cards[idx];
                    card?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                  }}
                  className={`h-2.5 w-2.5 rounded-full transition-all ${
                    activeEnergyCol === idx ? 'bg-slate-700 w-7' : 'bg-slate-300'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* SECTIE 4b: Voltooide taken – inklapbaar, legen of terugzetten */}
      <section className="bg-white rounded-3xl shadow-sm p-6 sm:p-8">
        <button
          type="button"
          onClick={() => setCompletedSectionOpen((prev) => !prev)}
          className="w-full flex items-center justify-between gap-3 text-left mb-4 group"
        >
          <h2 className="text-lg font-semibold text-gray-900">Voltooide taken</h2>
          <span className="flex items-center gap-2 text-sm text-gray-500">
            {completedTasks.length > 0 && (
              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg font-medium">
                {completedTasks.length}
              </span>
            )}
            {completedSectionOpen ? (
              <ChevronDownIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600" aria-hidden />
            ) : (
              <ChevronRightIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600" aria-hidden />
            )}
          </span>
        </button>

        {completedSectionOpen && (
          <>
            {completedTasks.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm bg-gray-50 rounded-2xl shadow-sm">
                Geen voltooide taken
              </div>
            ) : (
              <div className="space-y-3">
                {completedTasks.map((task: any) => (
                  <div
                    key={task.id}
                    className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-gray-100/80 transition-colors"
                  >
                    <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" aria-hidden />
                    <span className="flex-1 min-w-0 text-sm text-gray-700 line-through break-words">{task.title}</span>
                    {task.completedAt && (
                      <span className="text-xs text-gray-400 tabular-nums">
                        {new Date(task.completedAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={async () => {
                          await updateTask(task.id, { done: false, completedAt: undefined });
                          toast('Taak teruggezet bij Alle open taken');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-300 transition-colors"
                      >
                        Terug naar open
                      </button>
                    </div>
                  </div>
                ))}
                <div className="pt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm(`Weet je zeker dat je alle ${completedTasks.length} voltooide taken wilt verwijderen? Ze zijn daarna niet meer terug te halen.`)) return;
                      for (const task of completedTasks) {
                        await deleteTask(task.id);
                      }
                      toast('Voltooide taken geleegd');
                    }}
                    className="px-4 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors"
                  >
                    Voltooide taken legen
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* SECTIE 5: Geparkeerde gedachten */}
      <section className="bg-white rounded-3xl shadow-sm p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Geparkeerde gedachten</h2>
          <div className="group relative flex items-center">
            <button
              type="button"
              aria-label="Uitleg geparkeerde gedachten"
              title="Uitleg geparkeerde gedachten"
              className="w-6 h-6 rounded-full border border-gray-200 bg-white/70 text-slate-600 flex items-center justify-center text-[12px] leading-none hover:bg-white transition-colors"
              onClick={() =>
                toast("Geparkeerde gedachten: gedachten die je even niet kunt doen. Je kunt ze later omzetten naar een taak of afhandelen.")
              }
            >
              i
            </button>
            <div
              className="pointer-events-none absolute top-7 left-0 z-50 w-64 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
              role="tooltip"
            >
              <div className="text-[11px] font-semibold text-gray-900 mb-1">Geparkeerde gedachten</div>
              <div className="text-[11px] text-gray-600 leading-relaxed">
                Onderbrekingen die je parkeert, zodat je focus kan blijven. Later kun je ze omzetten naar een taak.
              </div>
            </div>
          </div>
        </div>
        
        {parkedThoughts.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm bg-gray-50 rounded-2xl shadow-sm">
            Geen geparkeerde gedachten
          </div>
        ) : (
          <div className="space-y-4">
            {parkedThoughts.map((task: any) => {
              const isExpanded = expandedTaskId === task.id;

              return (
                <div
                  key={task.id}
                  className="bg-amber-50 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all"
                >
                  <div
                    onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                    className="p-4 flex flex-wrap items-center gap-3 cursor-pointer"
                  >
                    <span className="text-xl flex-shrink-0">🧠</span>
                    <span className="flex-1 min-w-0 text-lg font-medium text-gray-900 break-words line-clamp-3">{task.title}</span>
                    <span className="text-gray-500 text-sm flex-shrink-0">{isExpanded ? '▼' : '›'}</span>
                  </div>
                  
                  {isExpanded && (
                    <div className="p-4 bg-amber-50/80">
                      {/* Context (read-only) */}
                      <div style={{ marginBottom: designSystem.spacing.sm }}>
                        <div style={{ fontSize: 12, color: theme.sub, fontStyle: 'italic' }}>
                          Geparkeerde gedachte
                        </div>
                      </div>
                      
                      {/* Acties direct zichtbaar */}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              // Eerst vragen: duur + moeilijkheidsgraad
                              const existingDuration =
                                (typeof task?.duration === 'number' && task.duration > 0 ? task.duration : null) ??
                                (typeof task?.estimatedDuration === 'number' && task.estimatedDuration > 0 ? task.estimatedDuration : null) ??
                                15;
                              setConvertDuration(existingDuration);
                              setConvertEnergy((task?.energyLevel as any) || 'medium');
                              setConvertingThought(task);
                            }}
                            style={{
                              padding: '6px 12px',
                              background: 'white',
                              color: '#0EA5E9',
                              border: '1px solid #0EA5E9',
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontSize: 13,
                              fontWeight: 400
                            }}
                          >
                            Omzetten naar taak
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await updateTask(task.id, { done: true });
                              toast('Gedachte afgehandeld');
                              setExpandedTaskId(null);
                            }}
                            style={{
                              padding: '6px 12px',
                              background: 'white',
                              color: '#10B981',
                              border: '1px solid #10B981',
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontSize: 13,
                              fontWeight: 400
                            }}
                          >
                            Afgehandeld
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm('Weet je zeker dat je deze gedachte wilt verwijderen?')) {
                                await deleteTask(task.id);
                                setExpandedTaskId(null);
                              }
                            }}
                            style={{
                              padding: '6px 12px',
                              background: 'white',
                              color: '#EF4444',
                              border: '1px solid #EF4444',
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontSize: 13,
                              fontWeight: 400
                            }}
                        >
                          Verwijderen
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

        </div>
      </main>

      {/* Task Editor Modal –zelfde layout als rest van de app */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4 overflow-y-auto">
          <div className="my-auto w-full max-w-lg">
            <TaskScheduleEditor
              task={editing}
              onSave={async (updatedTask: any) => {
                await updateTask(updatedTask.id, {
                  title: updatedTask.title,
                  dueAt: updatedTask.dueAt ?? null,
                  reminders: updatedTask.reminders ?? [],
                  repeat: updatedTask.repeat ?? "none",
                  duration: updatedTask.duration ?? null,
                  estimatedDuration: updatedTask.estimatedDuration ?? null,
                  energyLevel: updatedTask.energyLevel ?? "medium",
                });
                setEditing(null);
                setExpandedTaskId(null);
              }}
              onClose={() => setEditing(null)}
            />
          </div>
        </div>
      )}

      {/* Convert parked thought -> task modal */}
      {convertingThought && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            width: '100%',
            maxWidth: 520,
            background: 'white',
            borderRadius: 12,
            border: `1px solid ${theme.line}`,
            padding: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontWeight: 700, color: theme.text }}>Omzetten naar taak</div>
                <button
                  type="button"
                  aria-label="Uitleg omzetten naar taak"
                  title="Uitleg omzetten naar taak"
                  onClick={() => {
                    toast('Vul eerst de duur (minuten) in, daarna kun je omzetten naar taak.');
                  }}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    border: `1px solid ${theme.line}`,
                    background: '#ffffff',
                    color: theme.sub,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 700
                  }}
                >
                  i
                </button>
              </div>
              <button
                onClick={() => setConvertingThought(null)}
                style={{
                  padding: '8px 12px',
                  background: 'white',
                  color: theme.sub,
                  border: `1px solid ${theme.line}`,
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500
                }}
              >
                Sluiten
              </button>
            </div>

            <div style={{ marginBottom: 12, color: theme.sub, fontSize: 13 }}>
              Taak: <span style={{ color: theme.text, fontWeight: 600 }}>{convertingThought.title}</span>
            </div>

            {/* Duration */}
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 10, alignItems: 'center', marginTop: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Duur (min)</div>
              <input
                type="number"
                min="1"
                max="480"
                value={convertDuration ?? ''}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value, 10) : null;
                  setConvertDuration(Number.isFinite(val as any) ? val : null);
                }}
                placeholder="Bijv. 15, 30, 60"
                style={{
                  padding: '10px 12px',
                  border: `1px solid ${theme.line}`,
                  borderRadius: 10,
                  outline: 'none',
                  background: '#FFFFFF',
                  color: theme.text
                }}
              />
            </div>

            {/* Difficulty / energy */}
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 10, alignItems: 'center', marginTop: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Moeilijkheid</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {([
                  { key: 'low', label: 'Makkelijk', color: '#10B981' },
                  { key: 'medium', label: 'Normaal', color: '#F59E0B' },
                  { key: 'high', label: 'Moeilijk', color: '#EF4444' },
                ] as const).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setConvertEnergy(opt.key)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 999,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                      background: convertEnergy === opt.key ? opt.color : 'white',
                      color: convertEnergy === opt.key ? 'white' : theme.text,
                      border: `1px solid ${convertEnergy === opt.key ? opt.color : theme.line}`,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                onClick={() => setConvertingThought(null)}
                style={{
                  padding: '10px 14px',
                  background: 'white',
                  color: theme.sub,
                  border: `1px solid ${theme.line}`,
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600
                }}
              >
                Annuleren
              </button>
              <button
                onClick={async () => {
                  try {
                    const duration =
                      typeof convertDuration === 'number' &&
                      Number.isFinite(convertDuration) &&
                      convertDuration >= 1 &&
                      convertDuration <= 480
                        ? convertDuration
                        : null;

                    if (!duration) {
                      toast('Vul eerst de duur (minuten) in (minimaal 1).');
                      return;
                    }

                    await updateTask(convertingThought.id, {
                      source: 'regular',
                      priority: null,
                      duration: duration,
                      estimatedDuration: duration,
                      energyLevel: convertEnergy,
                    });
                    toast('Gedachte omgezet naar taak (bij Alle open taken)');
                    setExpandedTaskId(null);
                    setConvertingThought(null);
                  } catch (err) {
                    console.error('Error converting thought:', err);
                    toast('Fout bij omzetten naar taak');
                  }
                }}
                style={{
                  padding: '10px 14px',
                  background: theme.accent,
                  color: 'white',
                  border: `1px solid ${theme.accent}`,
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 700
                }}
              >
                Omzetten
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
  );
}
