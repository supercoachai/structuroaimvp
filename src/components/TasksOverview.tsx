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
            if (!t || !t.id || !t.title || t.source === 'medication' || t.source === 'event') return false;
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

  // Handle: Nieuwe taak toevoegen
  const handleAddTaskWithEnergy = async (energyLevel: 'low' | 'medium' | 'high') => {
    if (!newTitle.trim()) {
      toast('Voer een taak in');
      return;
    }

    try {
      const taskData = {
        title: newTitle.trim(),
        done: false,
        started: false,
        priority: null, // GEEN prioriteit bij toevoegen
        energyLevel: energyLevel, // KRITIEK: Explicit doorgeven
        estimatedDuration: newDuration || null,
        duration: newDuration || null,
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
      .filter((t: any) => {
      if (t.done || t.notToday || t.source === 'medication' || t.source === 'event' || t.source === 'parked_thought') return false;
      const hasPriority = t.priority != null && t.priority != 0 && (t.priority == 1 || t.priority == 2 || t.priority == 3);
      return !hasPriority;
      })
      // Sorteer op ingeschatte duur: kortste eerst, zonder duur onderaan
      .sort((a: any, b: any) => {
        const diff = durationOf(a) - durationOf(b);
        if (diff !== 0) return diff;
        return String(a?.title || '').localeCompare(String(b?.title || ''));
      });
  }, [tasks]);

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
      <section className="bg-white rounded-3xl shadow-sm p-4 sm:p-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Nieuwe taak toevoegen</h2>
        
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
              disabled={!newTitle.trim()}
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40"
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                boxShadow: '0 1px 3px rgba(16, 185, 129, 0.2)',
                cursor: newTitle.trim() ? 'pointer' : 'not-allowed'
              }}
              onMouseEnter={(e) => newTitle.trim() && (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.25)')}
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
              disabled={!newTitle.trim()}
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40"
              style={{
                background: 'rgba(245, 158, 11, 0.15)',
                boxShadow: '0 1px 3px rgba(245, 158, 11, 0.2)',
                cursor: newTitle.trim() ? 'pointer' : 'not-allowed'
              }}
              onMouseEnter={(e) => newTitle.trim() && (e.currentTarget.style.background = 'rgba(245, 158, 11, 0.25)')}
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
              disabled={!newTitle.trim()}
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                boxShadow: '0 1px 3px rgba(239, 68, 68, 0.2)',
                cursor: newTitle.trim() ? 'pointer' : 'not-allowed'
              }}
              onMouseEnter={(e) => newTitle.trim() && (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)')}
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
          
          {/* Duur optioneel – alleen als je een getal wilt invullen */}
          <div className="flex gap-3 items-center mt-3">
            <label className="text-sm font-medium text-gray-500">Duur (min):</label>
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
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Nu aan zet</h2>
        
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
      <section className="bg-white rounded-3xl shadow-sm p-4 sm:p-8">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Vandaag gekozen</h2>
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
                      await updateTask(task.id, { priority: null });
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
      <section className="bg-white rounded-3xl shadow-sm p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Alle open taken</h2>
        
        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm bg-gray-50 rounded-2xl shadow-sm animate-pulse">
            Taken laden…
          </div>
        ) : openTasks.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm bg-gray-50 rounded-2xl shadow-sm">
            Geen openstaande taken
          </div>
        ) : (
          <div className="space-y-4">
            {openTasks.map((task: any, taskIndex: number) => {
              const isExpanded = expandedTaskId === task.id;
              const energyLevel = task.energyLevel || 'medium';
              const isFirstTask = taskIndex === 0;
              const isCompleting = completingTaskIds.has(task.id);
              const isPop = checkboxPopId === task.id;

              return (
                <div
                  key={task.id}
                  className="group bg-gray-50 rounded-2xl overflow-hidden transition-all duration-200 hover:bg-white hover:shadow-md sm:hover:scale-[1.01]"
                >
                  {/* Collapsed view – op mobiel: titel bovenop volle breedte (volledig leesbaar), acties eronder; min-w-0 zodat knop binnen kaart blijft */}
                  <div
                    onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                    className="p-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-x-4 sm:gap-y-2 cursor-pointer min-w-0"
                  >
                    <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0 w-full sm:basis-0">
                      {/* Gekleurde bol = afvinken: klik om taak te voltooien (zelfde flow: line-through, verhuizing naar Voltooide taken) */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleCompleteFromList(task); }}
                        aria-label="Taak afvinken"
                        title={`${getEnergyLabel(energyLevel)} – klik om af te vinken`}
                        className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center transition-transform duration-200 cursor-pointer select-none ${isPop ? 'scale-125' : 'scale-100'}`}
                        style={{
                          background: getEnergyColor(energyLevel),
                          boxShadow: getEnergyGlow(energyLevel)
                        }}
                      />
                      <span
                        className={`text-sm sm:text-base font-medium flex-1 min-w-0 break-words transition-all duration-200 ${
                          isCompleting ? 'text-gray-500 opacity-50 line-through' : 'text-gray-900'
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center justify-between w-full sm:justify-start sm:w-auto gap-3 flex-shrink-0 min-w-0 sm:pl-0 pl-9">
                      {task.duration && (
                        <span className="text-xs sm:text-sm text-gray-500 tabular-nums">{task.duration} min</span>
                      )}
                      <div className="flex items-center gap-3 ml-auto sm:ml-0">
                        {/* Start-knop alleen zichtbaar wanneer rij is ingeklapt – op mobiel rechtsonder */}
                        {!isExpanded && (
                          <button
                            onClick={(e) => { e.stopPropagation(); startFocus(task); }}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-all duration-200 ${
                              isFirstTask
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-transparent border-2 border-blue-500 text-blue-500 group-hover:bg-blue-500 group-hover:text-white group-hover:border-blue-500'
                            }`}
                            title="Start deze taak"
                          >
                            Start
                          </button>
                        )}
                        <span className="text-gray-400 text-sm">{isExpanded ? '▼' : '›'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Expanded view – Launchpad: zachte achtergrond, duidelijke hiërarchie, Start Focus als primaire actie */}
                  {isExpanded && (
                    <div
                      className="pt-6 pb-5 px-5 bg-gray-50/50 border-t border-gray-100"
                      style={{ boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.03)' }}
                    >
                      {/* Mini-stappen – meer witruimte onder de taaknaam */}
                      <div className="pt-2">
                        {normalizeMicroSteps(task.microSteps).length > 0 && (
                          <div className="mb-5">
                            <div className="text-xs font-medium text-gray-500 mb-2">Mini-stappen</div>
                            <div className="space-y-2">
                              {normalizeMicroSteps(task.microSteps).slice(0, 6).map((s: MicroStep) => (
                                <div
                                  key={s.id}
                                  className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm border border-gray-100"
                                >
                                  <input
                                    type="checkbox"
                                    checked={Boolean(s.done)}
                                    onChange={() => toggleMicroStepDone(task, s.id)}
                                    className="w-4 h-4 accent-green-500 flex-shrink-0"
                                  />
                                  <div className="flex-1 min-w-0 text-sm text-gray-900 break-words line-clamp-2" style={{ textDecoration: s.done ? 'line-through' : 'none', opacity: s.done ? 0.6 : 1 }}>
                                    {s.title}
                                  </div>
                                </div>
                              ))}
                              {normalizeMicroSteps(task.microSteps).length > 6 && (
                                <div className="text-xs text-gray-500 italic">+{normalizeMicroSteps(task.microSteps).length - 6} meer</div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Mini-stap toevoegen: borderless input + plus-icoon */}
                        <div className="mb-6">
                          <div className="flex items-center gap-2 rounded-xl bg-white/80 border border-transparent focus-within:border-gray-300 focus-within:shadow-sm transition-all">
                            <input
                              value={microStepDraft.title}
                              onChange={(e) => setMicroStepDraft((p) => ({ ...p, title: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === 'Enter') addMicroStepToTask(task); }}
                              placeholder="Mini-stap toevoegen…"
                              className="flex-1 py-2.5 px-3 text-sm text-gray-900 bg-transparent border-none rounded-l-xl outline-none placeholder:text-gray-400"
                            />
                            <button
                              type="button"
                              onClick={() => addMicroStepToTask(task)}
                              className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50/50 rounded-r-xl transition-colors"
                              title="Toevoegen"
                            >
                              <PlusIcon className="w-5 h-5" aria-hidden />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Action bar: primaire actie = Start Focus, links secundaire links, rechts prullenbak */}
                      <div className="flex flex-col gap-4">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); startFocus(task); setExpandedTaskId(null); }}
                          className="w-full py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm hover:shadow-md transition-all text-center"
                          title="Start Focus"
                        >
                          Start Focus
                        </button>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-200/80">
                          <div className="flex items-center gap-4">
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
                                const currentVandaagCount = Object.values(priorityTasks).filter(t => t !== null).length;
                                if (currentVandaagCount >= maxSlots) {
                                  toast('Je focus voor vandaag is al gekozen');
                                  return;
                                }
                                let targetPriority = 1;
                                for (let i = 1; i <= maxSlots; i++) {
                                  if (!priorityTasks[i]) { targetPriority = i; break; }
                                }
                                await updateTask(task.id, { priority: targetPriority, energyLevel: task.energyLevel || 'medium' });
                                toast('Taak toegevoegd aan vandaag');
                                setExpandedTaskId(null);
                              }}
                              className="text-sm text-gray-500 hover:text-blue-600"
                            >
                              Toevoegen aan vandaag
                            </button>
                          </div>
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
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Geparkeerde gedachten</h2>
        
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
              <div style={{ fontWeight: 700, color: theme.text }}>Omzetten naar taak</div>
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
                    const duration = convertDuration && convertDuration > 0 ? convertDuration : null;
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
