"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTaskContext } from "../context/TaskContext";
import { designSystem } from "../lib/design-system";
import { useCheckIn } from "../hooks/useCheckIn";
import { toast } from "./Toast";
import { track } from "../shared/track";
import TaskScheduleEditor from "./TaskScheduleEditor";
import { normalizeMicroSteps, microStepId, type MicroStep, type MicroStepDifficulty } from "../lib/microSteps";
import { isOpenBacklogTask } from "../lib/taskFilters";
import { getCalendarDateAmsterdam } from "@/lib/dagstartCookie";
import {
  CheckCircleIcon,
  PencilSquareIcon,
  TrashIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  Square2StackIcon,
} from "@heroicons/react/24/outline";
import GeparkeerdeGedachtenSection from "./GeparkeerdeGedachtenSection";
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

/** Mock Taken-scherm: genummerde kaarten blauw / teal / paars (exact doctrine) */
const PRIORITY_ROW_TINT: Record<
  number,
  { card: string; badge: string; num: string; titleMuted: boolean; timeMuted: boolean }
> = {
  1: {
    card:
      "border-sky-100 bg-sky-50/40 shadow-[0_2px_16px_rgba(15,23,42,0.05)]",
    badge: "border-[#BFDBFE] bg-[#EFF6FF]",
    num: "text-[#1D4ED8]",
    titleMuted: false,
    timeMuted: false,
  },
  2: {
    card: "border-gray-100 bg-white shadow-[0_2px_16px_rgba(15,23,42,0.05)]",
    badge: "border-teal-100 bg-teal-50",
    num: "text-teal-700",
    titleMuted: false,
    timeMuted: false,
  },
  3: {
    card: "border-gray-100 bg-white shadow-[0_2px_16px_rgba(15,23,42,0.05)]",
    badge: "border-violet-200 bg-violet-50",
    num: "text-violet-700",
    titleMuted: true,
    timeMuted: true,
  },
};

/** ---------- Hoofdcomponent ---------- */
export default function TasksOverviewCalm() {
  const { tasks, loading, addTask, updateTask, deleteTask } = useTaskContext();
  const router = useRouter();
  
  // State voor nieuwe taak input
  const [taskInput, setTaskInput] = useState("");
  const [energy, setEnergy] = useState<"laag" | "normaal" | "hoog" | null>(null);
  /** Vaste keuze 15/30/45 of "custom" voor vrij in te vullen minuten (vierde optie). */
  const [duration, setDuration] = useState<"15 min" | "30 min" | "45 min" | "custom" | null>(null);
  const [customMinutes, setCustomMinutes] = useState("");
  /** null = nog niet gekozen; true = ja, microstappen invullen; false = nee */
  const [newTaskUseMicroSteps, setNewTaskUseMicroSteps] = useState<boolean | null>(null);
  const [newTaskMicroTitles, setNewTaskMicroTitles] = useState<string[]>([]);
  const [newTaskMicroInput, setNewTaskMicroInput] = useState("");
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
  /** Lege taak: eerst knop "Microstappen toevoegen"; daarna invoer tonen */
  const [microStepsAddOpenId, setMicroStepsAddOpenId] = useState<string | null>(null);

  /** Alle open taken: Makkelijk / Normaal / Intensief elk inklapbaar, taken verticaal gestapeld */
  const [openEnergySections, setOpenEnergySections] = useState<Record<"green" | "yellow" | "red", boolean>>({
    green: false,
    yellow: false,
    red: false,
  });

  useEffect(() => {
    if (taskInput.length <= 2) {
      setEnergy(null);
      setDuration(null);
      setCustomMinutes("");
      setNewTaskUseMicroSteps(null);
      setNewTaskMicroTitles([]);
      setNewTaskMicroInput("");
    }
  }, [taskInput]);

  useEffect(() => {
    setDuration(null);
    setCustomMinutes("");
    setNewTaskUseMicroSteps(null);
    setNewTaskMicroTitles([]);
    setNewTaskMicroInput("");
  }, [energy]);

  useEffect(() => {
    setMicroStepDraft({ title: "", minutes: null, difficulty: null });
    setMicroStepsAddOpenId(null);
  }, [expandedTaskId]);

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

  const durationLabelToMinutes = (label: "15 min" | "30 min" | "45 min"): number => {
    switch (label) {
      case "15 min":
        return 15;
      case "30 min":
        return 30;
      case "45 min":
        return 45;
      default:
        return 15;
    }
  };

  const parseCustomMinutes = (raw: string): number | null => {
    const n = parseInt(raw.trim(), 10);
    if (!Number.isFinite(n) || n < 1 || n > 480) return null;
    return n;
  };

  const resolvedDurationMinutes = (): number | null => {
    if (!duration) return null;
    if (duration === "custom") return parseCustomMinutes(customMinutes);
    return durationLabelToMinutes(duration);
  };

  const durationResolved = resolvedDurationMinutes() !== null;

  const canSubmitNewTask =
    Boolean(taskInput.trim()) &&
    Boolean(energy) &&
    durationResolved &&
    newTaskUseMicroSteps !== null &&
    (newTaskUseMicroSteps === false ||
      (newTaskUseMicroSteps === true && newTaskMicroTitles.length > 0));

  const appendNewTaskMicroStep = () => {
    const t = newTaskMicroInput.trim();
    if (!t) {
      toast("Vul een microstap in");
      return;
    }
    setNewTaskMicroTitles((prev) => [...prev, t]);
    setNewTaskMicroInput("");
  };

  const energyUiToLevel = (e: "laag" | "normaal" | "hoog"): "low" | "medium" | "high" => {
    if (e === "laag") return "low";
    if (e === "normaal") return "medium";
    return "high";
  };

  const handleSaveTask = async () => {
    const title = taskInput.trim();
    const minutes = resolvedDurationMinutes();
    if (!title || !energy || minutes == null) {
      if (duration === "custom" && minutes == null) {
        toast("Vul minuten in tussen 1 en 480");
      }
      return;
    }

    const energyLevel = energyUiToLevel(energy);

    if (newTaskUseMicroSteps === null) {
      return;
    }
    if (newTaskUseMicroSteps === true && newTaskMicroTitles.length === 0) {
      toast("Voeg minstens één microstap toe");
      return;
    }

    const microSteps: MicroStep[] =
      newTaskUseMicroSteps === true
        ? newTaskMicroTitles.map((stepTitle) => ({
            id: microStepId(),
            title: stepTitle,
            minutes: null,
            difficulty: null,
            done: false,
          }))
        : [];

    try {
      const taskData = {
        title,
        done: false,
        started: false,
        priority: null,
        energyLevel,
        estimatedDuration: minutes,
        duration: minutes,
        notToday: false,
        source: "regular" as const,
        microSteps,
      };

      const newTask = await addTask(taskData);

      setTaskInput("");
      setEnergy(null);
      setDuration(null);
      setCustomMinutes("");
      setNewTaskUseMicroSteps(null);
      setNewTaskMicroTitles([]);
      setNewTaskMicroInput("");

      toast("✅ Taak toegevoegd → Staat bij Alle open taken");

      setShowVandaagPrompt(newTask.id);

      setTimeout(() => {
        setShowVandaagPrompt(null);
      }, 5000);

      track("task_added", { energyLevel });
    } catch (error) {
      console.error("Error adding task:", error);
      toast("Fout bij toevoegen van taak");
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

  /** Taken die al onder "Vandaag gekozen" staan: niet opnieuw in het energie-bord (één plek per scherm). */
  const vandaagFocusIds = useMemo(() => {
    const ids = new Set<string>();
    for (let p = 1; p <= maxSlots; p++) {
      const t = priorityTasks[p];
      if (t?.id && !t.done) ids.add(t.id);
    }
    return ids;
  }, [priorityTasks, maxSlots]);

  // Filter: backlog voor energie-kolommen — zelfde basis als isOpenBacklogTask, minus vandaag-focus
  const openTasks = useMemo(() => {
    const durationOf = (t: any) => {
      const d = t?.duration ?? t?.estimatedDuration;
      return typeof d === 'number' && !Number.isNaN(d) ? d : Number.POSITIVE_INFINITY;
    };

    return tasks
      .filter((t: any) => isOpenBacklogTask(t) && !vandaagFocusIds.has(t.id))
      // Sorteer op ingeschatte duur: kortste eerst, zonder duur onderaan
      .sort((a: any, b: any) => {
        const diff = durationOf(a) - durationOf(b);
        if (diff !== 0) return diff;
        return String(a?.title || '').localeCompare(String(b?.title || ''));
      });
  }, [tasks, vandaagFocusIds]);

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

  const completedTodayCount = useMemo(() => {
    const today = getCalendarDateAmsterdam();
    return tasks.filter((t: any) => {
      if (!t.done || !t.completedAt || t.source === "medication" || t.source === "event") return false;
      return getCalendarDateAmsterdam(new Date(t.completedAt)) === today;
    }).length;
  }, [tasks]);

  const completedTodayTasks = useMemo(() => {
    const today = getCalendarDateAmsterdam();
    return tasks
      .filter((t: any) => {
        if (!t.done || !t.completedAt || t.source === "medication" || t.source === "event") return false;
        return getCalendarDateAmsterdam(new Date(t.completedAt)) === today;
      })
      .sort((a: any, b: any) => {
        const da = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const db = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return db - da;
      });
  }, [tasks]);

  return (
    <div className="min-h-full bg-[var(--structuro-bg)] px-5 pb-6 pt-6">
      <main className="mx-auto flex w-full max-w-lg flex-col">
        <header className="mb-6 flex w-full flex-col items-start text-left">
          <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-[#0F172A]">
            Taken
          </h1>
          <p className="mt-2 text-[15px] leading-snug text-gray-400">
            {loading ? "Taken laden…" : "Maximaal 3. De rest bestaat even niet."}
          </p>
        </header>

        {/* Doctrine mock: max 3 focuskaarten */}
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((priority) => {
            if (priority > maxSlots) return null;
            const task = priorityTasks[priority];
            if (!task || task.done) return null;
            const tint = PRIORITY_ROW_TINT[priority] ?? PRIORITY_ROW_TINT[1];
            const ms = normalizeMicroSteps(task.microSteps);
            const msDone = ms.filter((s) => s.done).length;
            const mins = task.duration ?? task.estimatedDuration ?? 15;

            return (
              <button
                key={priority}
                type="button"
                onClick={() => startFocus(task)}
                className={`flex w-full items-center gap-4 rounded-3xl border p-5 text-left transition active:scale-[0.99] ${tint.card}`}
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] text-[17px] font-bold leading-none ${tint.badge} ${tint.num}`}
                  aria-hidden
                >
                  {priority}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className={`break-words text-[16px] font-bold leading-snug ${
                      tint.titleMuted ? "text-gray-400" : "text-[#0F172A]"
                    }`}
                  >
                    {task.title}
                  </div>
                  <p
                    className={`mt-1 text-[13px] tabular-nums ${
                      tint.timeMuted ? "text-gray-300" : "text-[#64748B]"
                    }`}
                  >
                    {mins} min
                  </p>
                  {ms.length > 0 ? (
                    <div className="mt-2.5 flex items-center gap-1.5 text-[12px] font-medium text-violet-600">
                      <Square2StackIcon className="h-3.5 w-3.5 shrink-0 text-violet-500" aria-hidden />
                      <span className="tracking-tight">
                        {msDone} / {ms.length} microstappen
                      </span>
                    </div>
                  ) : null}
                </div>
                <ChevronRightIcon className="h-5 w-5 shrink-0 text-gray-300" aria-hidden />
              </button>
            );
          })}
          {!loading &&
            Object.values(priorityTasks).filter((t) => t !== null && !t?.done).length === 0 && (
              <div className="rounded-3xl border border-gray-100 bg-white p-8 text-center text-[15px] text-gray-400 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
                Geen taken gekozen voor vandaag
              </div>
            )}
        </div>

        <div className="mt-8 border-t border-gray-200" role="presentation" />
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3.5 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100"
              aria-hidden
            >
              <CheckCircleIcon className="h-5 w-5 text-gray-400" strokeWidth={1.5} />
            </div>
            <span className="text-[15px] text-gray-400">
              Vandaag voltooid · {completedTodayCount}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setCompletedSectionOpen((v) => !v)}
            className="shrink-0 text-[15px] font-normal lowercase text-gray-400 transition hover:text-gray-500"
            aria-expanded={completedSectionOpen}
            aria-label={completedSectionOpen ? "Voltooide taken verbergen" : "Voltooide taken tonen"}
          >
            tonen
          </button>
        </div>

        {completedSectionOpen ? (
          <div className="mt-3 space-y-3">
            {completedTodayTasks.length === 0 ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-400 shadow-sm">
                Geen voltooide taken vandaag
              </div>
            ) : (
              <>
                {completedTodayTasks.map((task: any) => (
                  <div
                    key={task.id}
                    className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 transition-colors hover:bg-gray-100/80"
                  >
                    <CheckCircleIcon className="h-5 w-5 shrink-0 text-green-600" aria-hidden />
                    <span className="min-w-0 flex-1 break-words text-sm text-gray-700 line-through">
                      {task.title}
                    </span>
                    {task.completedAt ? (
                      <span className="text-xs tabular-nums text-gray-400">
                        {new Date(task.completedAt).toLocaleDateString("nl-NL", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    ) : null}
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await updateTask(task.id, { done: false, completedAt: undefined });
                          toast("Taak teruggezet bij Alle open taken");
                        }}
                        className="rounded-xl bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-300"
                      >
                        Terug naar open
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (
                        !confirm(
                          `Weet je zeker dat je alle ${completedTodayTasks.length} voltooide taken van vandaag wilt verwijderen? Ze zijn daarna niet meer terug te halen.`
                        )
                      )
                        return;
                      for (const task of completedTodayTasks) {
                        await deleteTask(task.id);
                      }
                      toast("Voltooide taken van vandaag geleegd");
                    }}
                    className="rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
                  >
                    Voltooide taken legen
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null}

        <div className="mt-10 flex flex-col gap-8">
          <GeparkeerdeGedachtenSection />

      {/* SECTIE 1: Nieuwe taak toevoegen (progressive disclosure) */}
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
                toast(
                  "Stap voor stap: titel (meer dan 2 tekens), energie, tijdsduur. Daarna microstappen ja of nee. Taak toevoegen wordt zichtbaar na het kiezen van de duur."
                );
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
                Energie en duur verschijnen na elkaar. Na de duur kies je of je{' '}
                <span className="font-semibold">microstappen</span> wilt; daarna activeer je Taak toevoegen.
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-3">
            <input
              type="text"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              className="w-full bg-white rounded-2xl px-4 py-4 text-base text-gray-900 shadow-sm border border-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-blue-300 transition-all"
              placeholder="Nieuwe taak..."
            />
          </div>

          {taskInput.length > 2 && (
            <div className="flex gap-2 animate-fade-in">
              {[
                { label: "Rustig", emoji: "🌙", value: "laag" as const },
                { label: "Normaal", emoji: "😊", value: "normaal" as const },
                { label: "Intensief", emoji: "⚡", value: "hoog" as const },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEnergy(opt.value)}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                    energy === opt.value
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-600 border border-gray-200"
                  }`}
                >
                  <span className="text-lg" aria-hidden>
                    {opt.emoji}
                  </span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          )}

          {energy && (
            <div className="flex flex-col gap-2 animate-fade-in">
              <div className="flex gap-2">
                {(["15 min", "30 min", "45 min"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setDuration(opt);
                      setCustomMinutes("");
                    }}
                    className={`flex-1 min-w-[4rem] py-3 rounded-xl text-sm font-medium transition-all ${
                      duration === opt
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-600 border border-gray-200"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              <div
                className={`overflow-hidden rounded-xl border transition-colors ${
                  duration === "custom"
                    ? "border-blue-600 ring-2 ring-blue-600/15"
                    : "border-gray-200 bg-white"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setDuration("custom")}
                  className={`w-full py-3 px-3 text-center transition-all ${
                    duration === "custom"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="text-sm font-medium">1 uur</span>
                  <span
                    className={`mt-0.5 block text-xs font-normal ${
                      duration === "custom" ? "text-white/90" : "text-gray-500"
                    }`}
                  >
                    of eigen aantal minuten
                  </span>
                </button>
                {duration === "custom" ? (
                  <div className="border-t border-gray-100 bg-gray-50/80 px-3 py-3 animate-fade-in">
                    <label htmlFor="custom-task-minutes" className="sr-only">
                      Minuten
                    </label>
                    <input
                      id="custom-task-minutes"
                      type="number"
                      min={1}
                      max={480}
                      inputMode="numeric"
                      value={customMinutes}
                      onChange={(e) => setCustomMinutes(e.target.value)}
                      placeholder="Bijv. 60"
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {energy && durationResolved && newTaskUseMicroSteps === null ? (
            <div className="space-y-3 animate-fade-in">
              <p className="text-sm font-medium text-gray-800">
                Wil je deze taak onderverdelen in microstappen?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNewTaskUseMicroSteps(true)}
                  className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
                >
                  Ja
                </button>
                <button
                  type="button"
                  onClick={() => setNewTaskUseMicroSteps(false)}
                  className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
                >
                  Nee
                </button>
              </div>
            </div>
          ) : null}

          {energy && durationResolved && newTaskUseMicroSteps === true ? (
            <div className="space-y-3 animate-fade-in rounded-2xl border border-violet-200 bg-violet-50/40 px-3 py-3 sm:px-4">
              <div className="flex items-center gap-2">
                <Square2StackIcon className="h-4 w-4 shrink-0 text-violet-600" aria-hidden />
                <span className="text-sm font-semibold text-gray-900">Microstappen</span>
              </div>
              {newTaskMicroTitles.length > 0 ? (
                <ul className="space-y-2">
                  {newTaskMicroTitles.map((line, idx) => (
                    <li
                      key={`${idx}-${line.slice(0, 24)}`}
                      className="flex items-start gap-2 rounded-xl bg-white/90 px-3 py-2 text-sm text-gray-800 shadow-sm"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[11px] font-bold text-violet-700">
                        {idx + 1}
                      </span>
                      <span className="min-w-0 flex-1 leading-snug">{line}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setNewTaskMicroTitles((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="shrink-0 rounded-lg px-1.5 py-0.5 text-xs font-medium text-gray-400 hover:bg-red-50 hover:text-red-600"
                        aria-label="Stap verwijderen"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-600">
                  Voeg hieronder je eerste stap toe. Je kunt er meerdere toevoegen.
                </p>
              )}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <input
                  type="text"
                  value={newTaskMicroInput}
                  onChange={(e) => setNewTaskMicroInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      appendNewTaskMicroStep();
                    }
                  }}
                  placeholder="Bijv. bestand openen…"
                  className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                />
                <button
                  type="button"
                  onClick={() => appendNewTaskMicroStep()}
                  className="shrink-0 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
                >
                  Toevoegen
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNewTaskUseMicroSteps(false);
                  setNewTaskMicroTitles([]);
                  setNewTaskMicroInput("");
                }}
                className="text-xs font-medium text-gray-500 underline decoration-gray-300 underline-offset-2 hover:text-gray-700"
              >
                Toch geen microstappen
              </button>
            </div>
          ) : null}

          {durationResolved ? (
            <div className="animate-fade-in">
              <button
                type="button"
                onClick={() => void handleSaveTask()}
                disabled={!canSubmitNewTask}
                title={
                  canSubmitNewTask
                    ? undefined
                    : "Kies of je microstappen wilt en vul ze zo nodig in."
                }
                className={`w-full rounded-xl py-4 font-semibold text-white transition-all ${
                  canSubmitNewTask
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "cursor-not-allowed bg-blue-400/60"
                }`}
              >
                Taak toevoegen
              </button>
            </div>
          ) : null}
        </div>

        {/* "Vandaag?" prompt */}
        {showVandaagPrompt && (
          <div className="mt-3 p-4 bg-gray-50 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-gray-600">Wil je dit vandaag oppakken?</span>
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
            <div className="flex flex-col gap-3">
              {(
                [
                  { key: "green" as const, title: "Makkelijk", titleClass: "text-emerald-700" },
                  { key: "yellow" as const, title: "Normaal", titleClass: "text-amber-700" },
                  { key: "red" as const, title: "Intensief", titleClass: "text-red-700" },
                ] as const
              ).map((col) => {
                const list = (openByEnergy as Record<typeof col.key, any[]>)[col.key];
                const zoneOpen = openEnergySections[col.key];
                return (
                  <div
                    key={col.key}
                    className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setOpenEnergySections((p) => ({ ...p, [col.key]: !p[col.key] }))
                      }
                      className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-100/90"
                      aria-expanded={zoneOpen}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={`shrink-0 text-sm font-semibold ${col.titleClass}`}>
                          {col.title}
                        </span>
                        <span className="tabular-nums rounded-lg border border-gray-200 bg-white px-2 py-0.5 text-xs font-semibold text-gray-600">
                          {list.length}
                        </span>
                      </div>
                      <ChevronDownIcon
                        className={`h-5 w-5 shrink-0 text-gray-500 transition-transform duration-200 ${
                          zoneOpen ? "rotate-180" : ""
                        }`}
                        aria-hidden
                      />
                    </button>
                    {zoneOpen ? (
                      <div className="border-t border-gray-200 bg-white/60 px-3 pb-3 pt-2">
                        {list.length === 0 ? (
                          <p className="px-1 py-2 text-xs italic text-gray-500">Geen taken</p>
                        ) : (
                          <div className="flex flex-col gap-3">
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

                            {isExpanded && (() => {
                              const ms = normalizeMicroSteps(task.microSteps);
                              const msDone = ms.filter((s) => s.done).length;
                              const showMicroPanel =
                                ms.length > 0 || microStepsAddOpenId === task.id;

                              return (
                              <div
                                className="pt-5 pb-5 px-5 bg-gray-50/50 border-t border-gray-100"
                                style={{ boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.03)' }}
                              >
                                <div className="flex flex-col gap-4">
                                  <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 shadow-sm">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex min-w-0 items-center gap-2">
                                        <Square2StackIcon
                                          className="h-4 w-4 shrink-0 text-violet-600"
                                          aria-hidden
                                        />
                                        <span className="text-sm font-semibold text-gray-800">
                                          Microstappen
                                        </span>
                                        {ms.length > 0 ? (
                                          <span className="text-xs tabular-nums text-gray-500">
                                            {msDone}/{ms.length}
                                          </span>
                                        ) : null}
                                      </div>
                                      {!showMicroPanel ? (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setMicroStepsAddOpenId(task.id);
                                          }}
                                          className="shrink-0 rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
                                        >
                                          Microstappen toevoegen
                                        </button>
                                      ) : null}
                                    </div>

                                    {showMicroPanel ? (
                                      <div className="mt-3 space-y-2">
                                        {ms.length > 0 ? (
                                          <ul className="space-y-1.5">
                                            {ms.map((step) => (
                                              <li key={step.id} className="flex items-start gap-2">
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    void toggleMicroStepDone(task, step.id);
                                                  }}
                                                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                                                    step.done
                                                      ? "border-emerald-500 bg-emerald-500"
                                                      : "border-gray-300 bg-white hover:border-violet-400"
                                                  }`}
                                                  aria-label={step.done ? "Stap ongedaan" : "Stap afvinken"}
                                                >
                                                  {step.done ? (
                                                    <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
                                                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                  ) : null}
                                                </button>
                                                <span
                                                  className={`min-w-0 flex-1 text-sm leading-snug ${
                                                    step.done
                                                      ? "text-gray-400 line-through"
                                                      : "text-gray-800"
                                                  }`}
                                                >
                                                  {step.title}
                                                </span>
                                              </li>
                                            ))}
                                          </ul>
                                        ) : null}

                                        <div className="flex gap-2 pt-0.5">
                                          <input
                                            type="text"
                                            value={microStepDraft.title}
                                            onChange={(e) =>
                                              setMicroStepDraft((d) => ({
                                                ...d,
                                                title: e.target.value,
                                              }))
                                            }
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                e.preventDefault();
                                                void addMicroStepToTask(task);
                                              }
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            placeholder="Nieuwe microstap…"
                                            className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                                          />
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              void addMicroStepToTask(task);
                                            }}
                                            className="shrink-0 rounded-xl bg-violet-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
                                          >
                                            Toevoegen
                                          </button>
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startFocus(task);
                                      setExpandedTaskId(null);
                                    }}
                                    className="w-full py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-all text-center"
                                  >
                                    Start Focus
                                  </button>
                                  <div className="flex items-center justify-between pt-2 border-t border-gray-200/80">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditing(task);
                                      }}
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
                              );
                            })()}
                          </div>
                        );
                      })}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </>
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
                placeholder="Minuten, bijv. 15"
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
