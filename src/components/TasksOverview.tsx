"use client";

import React, { useMemo, useState, useEffect } from "react";
import TaskScheduleEditor from "./TaskScheduleEditor";
import { scheduleReminders, requestNotificationPermission, formatWhen, startTask, stopTask } from "./ReminderEngine";
import { useTaskShortcuts } from "../hooks/useTaskShortcuts";
import { toast } from "./Toast";
import { track } from "../shared/track";
import { useTasks } from "../hooks/useTasks";
import { designSystem } from "../lib/design-system";
import { getTodayCheckIn } from "../lib/localStorageTasks";

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

/** --- Demo startdata (vervang met API/data store) --- */
const seed: any[] = [
  // Lege lijst - begin met schone lei
];

/** ---------- Natural Language Parsing ---------- */
function parseNaturalLanguage(input: string) {
  const timePatterns = [
    { regex: /morgen (\d{1,2}):(\d{2})/, action: 'tomorrow' },
    { regex: /over (\d+) uur/, action: 'hours' },
    { regex: /over (\d+) min/, action: 'minutes' },
    { regex: /vandaag (\d{1,2}):(\d{2})/, action: 'today' },
  ];

  for (const pattern of timePatterns) {
    const match = input.match(pattern.regex);
    if (match) {
      return { hasTime: true, pattern: pattern.action, match, regex: pattern.regex };
    }
  }

  return { hasTime: false };
}

/** ---------- Hoofdscherm ---------- */
export default function TasksOverviewCalm({ initialTasks = seed, onChange }: any) {
  const { tasks, loading, addTask: apiAddTask, updateTask: apiUpdateTask, deleteTask: apiDeleteTask, updateTasks: apiUpdateTasks, fetchTasks } = useTasks();
  const [newTitle, setNewTitle] = useState("");
  const [editing, setEditing] = useState<any>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isEditingDuration, setIsEditingDuration] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [todayEnergyLevel, setTodayEnergyLevel] = useState<string | null>(null);

  // Vraag notificatie permissie bij app start
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Haal energie-niveau op uit check-in
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const { getTodayCheckIn } = require('../lib/localStorageTasks');
      const checkIn = getTodayCheckIn();
      if (checkIn && checkIn.energy_level) {
        setTodayEnergyLevel(checkIn.energy_level);
      }
    }
  }, []);

  // Forceer refresh van taken bij mount en na navigatie
  useEffect(() => {
    // Haal taken opnieuw op bij mount om zeker te zijn dat we de laatste versie hebben
    console.log('🔄 TasksOverview: Mounting, fetching tasks...');
    fetchTasks();
    
    // Luister naar task update events
    const handleTaskUpdate = () => {
      console.log('🔄 TasksOverview: Task update event received, refreshing tasks...');
      // Forceer directe refresh
      setTimeout(() => {
        fetchTasks();
      }, 100);
    };
    
    // Luister ook naar storage events (cross-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'structuro_tasks' && e.newValue) {
        console.log('🔄 TasksOverview: localStorage changed, refreshing tasks...');
        setTimeout(() => {
          fetchTasks();
        }, 100);
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('structuro_tasks_updated', handleTaskUpdate);
      window.addEventListener('storage', handleStorageChange);
      
      // Forceer ook een refresh na korte delay (voor navigatie van andere pagina's)
      const delayedRefresh = setTimeout(() => {
        console.log('🔄 TasksOverview: Delayed refresh after mount');
        fetchTasks();
      }, 500);
      
      return () => {
        window.removeEventListener('structuro_tasks_updated', handleTaskUpdate);
        window.removeEventListener('storage', handleStorageChange);
        clearTimeout(delayedRefresh);
      };
    }
  }, [fetchTasks]);

  // Debug: log taken met priority
  useEffect(() => {
    if (tasks.length > 0) {
      const priorityTasks = tasks.filter((t: any) => 
        t.priority != null && t.priority >= 1 && t.priority <= 3
      );
      console.log('📊 TasksOverview - Total tasks:', tasks.length);
      console.log('📊 TasksOverview - Tasks with priority 1-3:', priorityTasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        energyLevel: t.energyLevel,
        done: t.done,
        source: t.source
      })));
      
      // Debug: specifiek voor priority 1
      const priority1Tasks = tasks.filter((t: any) => t.priority === 1);
      console.log('📊 TasksOverview - Priority 1 tasks:', priority1Tasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        done: t.done,
        source: t.source
      })));
    }
  }, [tasks]);

  // Tasks worden nu via API geladen via useTasks hook

  const top3 = useMemo(
    () => {
      // EXACTE FILTER LOGICA: Kolom 1 = priority === 1, Kolom 2 = priority === 2, Kolom 3 = priority === 3
      // BELANGRIJK: Toon ook done taken, zodat gebruiker kan zien wat er is toegevoegd
      
      // Debug: log alle taken met priority
      const allPriorityTasks = tasks.filter((t: any) => 
        t && t.id && t.title && t.priority != null && t.priority >= 1 && t.priority <= 3
      );
      console.log('🔍 Top3 filter - All tasks with priority:', allPriorityTasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        done: t.done,
        source: t.source
      })));
      
      // Kolom 1 (MOET VANDAAG): alleen tasks.filter(t => t.priority === 1)
      const priority1Task = tasks.find((t: any) => 
        t && 
        t.id &&
        t.title &&
        t.priority === 1 && 
        t.source !== 'medication'
      );
      
      // Kolom 2 (BELANGRIJK): alleen tasks.filter(t => t.priority === 2)
      const priority2Task = tasks.find((t: any) => 
        t && 
        t.id &&
        t.title &&
        t.priority === 2 && 
        t.source !== 'medication'
      );
      
      // Kolom 3 (EXTRA FOCUS): alleen tasks.filter(t => t.priority === 3)
      const priority3Task = tasks.find((t: any) => 
        t && 
        t.id &&
        t.title &&
        t.priority === 3 && 
        t.source !== 'medication'
      );
      
      console.log('🔍 Top3 result:', {
        priority1: priority1Task ? { id: priority1Task.id, title: priority1Task.title } : null,
        priority2: priority2Task ? { id: priority2Task.id, title: priority2Task.title } : null,
        priority3: priority3Task ? { id: priority3Task.id, title: priority3Task.title } : null
      });
      
      // Zet taken in de juiste slots (0-based index)
      return [priority1Task || null, priority2Task || null, priority3Task || null];
    },
    [tasks]
  );
  const others = useMemo(
    () => tasks.filter((t: any) => {
      // Filter uit: taken met prioriteit 1-3 (staan al in top3 sectie)
      const hasPriority = t.priority != null && t.priority >= 1 && t.priority <= 3;
      if (hasPriority) return false;
      // Filter uit: gedaan, notToday, medication
      if (t.done || t.notToday || t.source === 'medication') return false;
      return true;
    }),
    [tasks]
  );
  const notTodayTasks = useMemo(
    () => tasks.filter((t: any) => t.notToday && !t.done && t.source !== 'medication'),
    [tasks]
  );
  const completed = useMemo(() => tasks.filter((t: any) => t.done && t.source !== 'medication'), [tasks]);

  // Groepeer taken op type voor betere organisatie
  const parkedThoughts = useMemo(() => 
    tasks.filter((t: any) => t.source === 'parked_thought' && !t.done && t.source !== 'medication' && t.source !== 'event'),
    [tasks]
  );
  const interruptionTasks = useMemo(() => 
    others.filter((t: any) => t.source === 'interruption_hopper'),
    [others]
  );
  const remainderTasks = useMemo(() => 
    others.filter((t: any) => t.source === 'focus_remainder'),
    [others]
  );
  const regularTasks = useMemo(() => 
    others.filter((t: any) => t.source !== 'medication' && (!t.source || (t.source !== 'interruption_hopper' && t.source !== 'focus_remainder' && t.source !== 'parked_thought'))),
    [others]
  );

  // Debug logging (uitgezet voor productie)
  // console.log('Debug - Tasks:', tasks);
  // console.log('Debug - Top3:', top3);
  // console.log('Debug - Others:', others);
  // console.log('Debug - InterruptionTasks:', interruptionTasks);
  // console.log('Debug - RemainderTasks:', remainderTasks);
  // console.log('Debug - RegularTasks:', regularTasks);

  const update = async (next: any) => {
    // Filter duplicaten op basis van ID (uniek) - gebruik Map voor betere performance
    const uniqueTasksMap = new Map<string, any>();
    
    next.forEach((task: any) => {
      if (task.id) {
        // Als taak al bestaat, behoud de meest recente (nieuwste updated_at)
        const existing = uniqueTasksMap.get(task.id);
        if (!existing || (task.updated_at && existing.updated_at && 
            new Date(task.updated_at) > new Date(existing.updated_at))) {
          uniqueTasksMap.set(task.id, task);
        }
      } else {
        // Legacy taken zonder ID: gebruik titel + source als key
        const key = `${task.title}-${task.source || 'regular'}`;
        if (!uniqueTasksMap.has(key)) {
          uniqueTasksMap.set(key, task);
        }
      }
    });
    
    const uniqueTasks = Array.from(uniqueTasksMap.values());
    
    // Sync met database via API
    try {
      await apiUpdateTasks(uniqueTasks);
      
      // BELANGRIJK: Trigger expliciet een sync event zodat andere pagina's direct updaten
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('structuro_tasks_updated'));
      }
    } catch (error) {
      console.error('Failed to update tasks:', error);
      toast('Fout bij opslaan van taken');
    }
    
    scheduleReminders(uniqueTasks); // Herplant herinneringen bij elke wijziging
    onChange?.(uniqueTasks);
  };

  // Eenmalig: verwijder geparkeerde gedachten uit bestaande data (test/legacy)
  const didCleanParkedRef = React.useRef(false);
  useEffect(() => {
    if (didCleanParkedRef.current || loading) return;
    const cleanup = async () => {
      try {
        const hasParked = tasks.some((t: any) => t.source === 'interruption_hopper');
        if (hasParked) {
          const cleaned = tasks.filter((t: any) => t.source !== 'interruption_hopper');
          await update(cleaned);
        }
        didCleanParkedRef.current = true;
      } catch {}
    };
    cleanup();
  }, [tasks, loading]);

  // Direct toevoegen met energyLevel - wordt aangeroepen bij klik op kleur knop
  const handleAddTaskWithEnergy = async (energyLevel: 'low' | 'medium' | 'high') => {
    const title = newTitle.trim();
    if (!title) {
      toast('Vul eerst een taaknaam in');
      return;
    }

    const newTask = {
      title: title,
      duration: null, // Geen automatische duur
      priority: null,
      done: false,
      started: false,
      dueAt: null, // Geen datum/tijd meer
      reminders: [],
      repeat: "none",
      impact: "🌱",
      energyLevel: energyLevel, // Gebruik geselecteerde energie-niveau
      estimatedDuration: null,
      source: 'regular',
      completedAt: null,
      microSteps: [],
      notToday: false
    };
    
    try {
      await apiAddTask(newTask);
      setNewTitle(""); // Reset input
      
      // Toast notificatie
      const energyLabels = {
        low: 'Groen (makkelijk)',
        medium: 'Oranje (normaal)',
        high: 'Rood (moeilijk)'
      };
      toast(`✅ Taak toegevoegd - ${energyLabels[energyLevel]}`);
      
      // Track event
      track("task_add", { 
        source: "quick_input", 
        energyLevel: energyLevel
      });
    } catch (error: any) {
      console.error('Failed to add task:', error);
      toast('Fout bij toevoegen van taak: ' + (error.message || 'Onbekende fout'));
    }
  };

  const toggleDone = async (id: string, checked: boolean) => {
    const task = tasks.find((t: any) => t.id === id);
    if (!task) return;
    
    try {
      await apiUpdateTask(id, {
        done: checked,
        priority: checked ? null : task.priority,
        completedAt: checked ? new Date().toISOString() : undefined
      });
      
      if (checked) {
        // Update gamification data
        try {
          const response = await fetch('/api/gamification');
          if (response.ok) {
            const gamificationData = await response.json();
            const updatedData = {
              currentStreak: gamificationData.current_streak || 0,
              longestStreak: gamificationData.longest_streak || 0,
              totalTasksCompleted: (gamificationData.total_tasks_completed || 0) + 1,
              badges: gamificationData.badges || [],
              level: gamificationData.level || 1,
              experiencePoints: (gamificationData.experience_points || 0) + 10
            };
            
            await fetch('/api/gamification', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatedData)
            });
          }
        } catch (error) {
          console.error('Failed to update gamification:', error);
        }
        
        // Confetti effect voor voltooide taken
        showConfetti();
        toast("🎉 Taak voltooid! Je bent geweldig!");
        track("task_done", { taskId: id });
      } else {
        toast("Taak hervat - je kunt dit!");
        track("task_undone", { taskId: id });
      }
    } catch (error) {
      console.error('Failed to update task:', error);
      toast('Fout bij bijwerken van taak');
    }
  };

  // Confetti effect
  const showConfetti = () => {
    // Eenvoudige confetti met CSS
    const confetti = document.createElement('div');
    confetti.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
    `;
    
    // Maak confetti elementen
    for (let i = 0; i < 50; i++) {
      const piece = document.createElement('div');
      piece.style.cssText = `
        position: absolute;
        width: 8px;
        height: 8px;
        background: ${['#EF4444', '#F59E0B', '#10B981', '#4A90E2', '#8B5CF6'][Math.floor(Math.random() * 5)]};
        left: ${Math.random() * 100}%;
        top: -10px;
        animation: confetti-fall 2s linear forwards;
        animation-delay: ${Math.random() * 2}s;
      `;
      confetti.appendChild(piece);
    }
    
    document.body.appendChild(confetti);
    
    // Verwijder na animatie
    setTimeout(() => {
      document.body.removeChild(confetti);
    }, 4000);
  };

  const removeTask = async (id: string) => {
    try {
      await apiDeleteTask(id);
      toast("Taak verwijderd");
      track("task_remove", { taskId: id });
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast('Fout bij verwijderen van taak');
    }
  };

  const convertToTask = async (id: string) => {
    const task = tasks.find((t: any) => t.id === id);
    if (!task) return;
    
    try {
      await apiUpdateTask(id, {
        source: 'regular',
        impact: task.impact || '🌱',
      });
    toast("Geparkeerde gedachte omgezet naar taak! 📝");
      track("task_convert", { taskId: id, from: task.source || "unknown" });
    } catch (error: any) {
      toast("Fout bij omzetten: " + (error.message || 'Onbekende fout'));
    }
  };

  /** Promoot naar 1/2/3; verschuif anderen netjes mee */
  const setPriority = async (id: string, level: number) => {
    const cur = tasks.find((t: any) => t.id === id);
    if (!cur) return;
    
    // maak plek door taken op/na level één naar beneden te schuiven
    const bumped = tasks.map((t: any) => {
      if (t.id === id) return t;
      if (t.priority != null && t.priority >= level && t.priority < 3) {
        return { ...t, priority: t.priority + 1 };
      }
      return t;
    });
    
    // zet target op level en demote wie >3 is geworden
    const leveled = bumped.map((t: any) =>
      t.id === id ? { ...t, priority: level } : t.priority > 3 ? { ...t, priority: null } : t
    );
    
    await update(leveled);
    track(`priority_set_${level}`, { taskId: id });
  };

  const clearPriority = async (id: string) => {
    // Verwijder prioriteit en zet taak terug naar openstaande taken
    await update(tasks.map((t: any) => (t.id === id ? { ...t, priority: null, notToday: false } : t)));
    track("task_priority_cleared", { taskId: id });
  };

  // Markeer taak als gestart (zonder focus sessie)
  const markTaskAsStarted = async (task: any) => {
    try {
      await updateTask(task.id, { started: true });
      toast("✓ Je bent begonnen! Dat is al een overwinning.");
      track("task_started", { taskId: task.id });
    } catch (error) {
      console.error('Error marking task as started:', error);
      toast('Fout bij markeren van taak. Probeer het opnieuw.');
    }
  };

  // Start Focus Modus voor een taak
  const startFocus = async (task: any) => {
    // Markeer als gestart
    try {
      await updateTask(task.id, { started: true });
    } catch (error) {
      console.error('Error marking task as started:', error);
    }

    // Start task tracking voor reminders
    startTask({
      id: task.id,
      title: task.title,
      dueAt: task.dueAt,
      done: task.done,
      reminders: task.reminders || [],
      onNavigate: (t) => {
        const focusUrl = `/focus?task=${encodeURIComponent(t.title)}&duration=${task.duration || 15}&energy=${task.energyLevel || 'medium'}`;
        window.location.href = focusUrl;
      }
    });

    // Navigeer naar Focus Modus met taak info
    const focusUrl = `/focus?task=${encodeURIComponent(task.title)}&duration=${task.duration || 15}&energy=${task.energyLevel || 'medium'}`;
    window.location.href = focusUrl;
    
    // Positieve feedback
    toast("🚀 Focus sessie gestart! Je kunt dit!");
    track("focus_start", { 
      taskId: task.id, 
      duration: task.duration || 15,
      energyLevel: task.energyLevel || 'medium'
    });
  };

  // Drag & Drop handlers
  const handleDragStart = (taskId: string) => {
    setDraggedTaskId(taskId);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverTarget(null);
  };

  const handleDragOver = (e: React.DragEvent, target: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(target);
  };

  const handleDragLeave = () => {
    setDragOverTarget(null);
  };

  const handleDrop = async (e: React.DragEvent, target: 'priority1' | 'priority2' | 'priority3' | 'others' | 'notToday' | 'parked' | 'completed') => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(null);

    if (!draggedTaskId) return;

    const task = tasks.find((t: any) => t.id === draggedTaskId);
    if (!task) return;

    try {
      switch (target) {
        case 'priority1':
          await setPriority(draggedTaskId, 1);
          // Als taak voltooid was, maak onvoltooid
          if (task.done) {
            await toggleDone(draggedTaskId, false);
          }
          break;
        case 'priority2':
          await setPriority(draggedTaskId, 2);
          // Als taak voltooid was, maak onvoltooid
          if (task.done) {
            await toggleDone(draggedTaskId, false);
          }
          break;
        case 'priority3':
          await setPriority(draggedTaskId, 3);
          // Als taak voltooid was, maak onvoltooid
          if (task.done) {
            await toggleDone(draggedTaskId, false);
          }
          break;
        case 'others':
          await clearPriority(draggedTaskId);
          // Als taak voltooid was, maak onvoltooid
          if (task.done) {
            await toggleDone(draggedTaskId, false);
          }
          break;
        case 'notToday':
          await toggleNotToday(draggedTaskId, true);
          // Als taak voltooid was, maak onvoltooid
          if (task.done) {
            await toggleDone(draggedTaskId, false);
          }
          break;
        case 'completed':
          // Markeer taak als voltooid
          await toggleDone(draggedTaskId, true);
          break;
        case 'parked':
          // Alleen voor geparkeerde gedachten - converteer naar taak
          if (task.source === 'parked_thought') {
            await convertToTask(draggedTaskId);
          }
          break;
      }
      track("task_drag_drop", { taskId: draggedTaskId, target });
    } catch (error) {
      console.error('Failed to move task:', error);
      toast('Fout bij verplaatsen van taak');
    }

    setDraggedTaskId(null);
  };

  // Toggle "niet vandaag" status
  const toggleNotToday = async (id: string, notToday: boolean) => {
    try {
      await apiUpdateTask(id, { notToday });
      // Refresh tasks na update om de lijst te updaten
      await fetchTasks();
      track("task_not_today_toggle", { taskId: id, notToday });
    } catch (error) {
      console.error('Failed to update task:', error);
      toast('Fout bij bijwerken van taak');
    }
  };

  // Verplaats taak naar morgen, deze week, of deze maand
  const moveTaskToDate = async (id: string, option: 'tomorrow' | 'thisWeek' | 'thisMonth') => {
    try {
      const task = tasks.find((t: any) => t.id === id);
      if (!task) return;

      const now = new Date();
      let targetDate: Date;

      switch (option) {
        case 'tomorrow':
          targetDate = new Date(now);
          targetDate.setDate(targetDate.getDate() + 1);
          targetDate.setHours(9, 0, 0, 0);
          break;
        case 'thisWeek':
          // Vind volgende maandag
          const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
          targetDate = new Date(now);
          targetDate.setDate(targetDate.getDate() + daysUntilMonday);
          targetDate.setHours(9, 0, 0, 0);
          break;
        case 'thisMonth':
          // Eerste dag van volgende maand
          targetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1, 9, 0, 0);
          break;
      }

      await apiUpdateTask(id, { 
        notToday: false, // Haal uit "niet vandaag"
        dueAt: targetDate.toISOString()
      });
      await fetchTasks();
      track("task_move_date", { taskId: id, option });
    } catch (error) {
      console.error('Failed to move task:', error);
      toast('Fout bij verplaatsen van taak');
    }
  };


  // Keyboard shortcuts
  useTaskShortcuts({
    onAdd: () => {
      // Bij keyboard shortcut: voeg toe met medium (oranje) als default
      if (newTitle.trim()) {
        handleAddTaskWithEnergy('medium');
      }
    },
    onPromote1: () => selectedTaskId && setPriority(selectedTaskId, 1),
    onPromote2: () => selectedTaskId && setPriority(selectedTaskId, 2),
    onPromote3: () => selectedTaskId && setPriority(selectedTaskId, 3),
    onFocus: () => {
      const task = tasks.find((t: any) => t.id === selectedTaskId) || top3[0];
      if (task) startFocus(task);
    },
    onDelete: () => selectedTaskId && removeTask(selectedTaskId)
  });

  // Selecteer eerste taak in "Overige" als default
  useEffect(() => {
    if (others.length > 0 && !selectedTaskId) {
      setSelectedTaskId(others[0].id);
    }
  }, [others, selectedTaskId]);

  const updateTask = async (task: any) => {
    // Als de taak al bestaat, update deze direct via API
    if (task.id && tasks.some((t: any) => t.id === task.id)) {
      try {
        // Zorg dat microSteps correct wordt gemapped
        const microStepsToSave = task.microSteps !== undefined 
          ? task.microSteps 
          : (task.micro_steps !== undefined ? task.micro_steps : undefined);
        
        // Update alleen de gewijzigde velden
        const updatePayload: any = {};
        if (microStepsToSave !== undefined) {
          updatePayload.microSteps = microStepsToSave;
        }
        if (task.duration !== undefined) updatePayload.duration = task.duration;
        if (task.estimatedDuration !== undefined) updatePayload.estimatedDuration = task.estimatedDuration;
        if (task.title !== undefined) updatePayload.title = task.title;
        if (task.priority !== undefined) updatePayload.priority = task.priority;
        if (task.done !== undefined) updatePayload.done = task.done;
        if (task.started !== undefined) updatePayload.started = task.started;
        if (task.notToday !== undefined) updatePayload.notToday = task.notToday;
        if (task.dueAt !== undefined) updatePayload.dueAt = task.dueAt;
        if (task.energyLevel !== undefined) updatePayload.energyLevel = task.energyLevel;
        if (task.source !== undefined) updatePayload.source = task.source;
        
        // Update in localStorage via API (deze doet al een optimistische update)
        await apiUpdateTask(task.id, updatePayload);
        
        // GEEN fetchTasks() meer - de optimistische update in useTasks.ts is voldoende
        // Dit voorkomt dat de taak verdwijnt
      } catch (error) {
        console.error('Failed to update task:', error);
        toast('Fout bij bijwerken van taak');
        // Alleen bij error: refresh om correcte state te krijgen
        fetchTasks();
      }
    } else {
      // Anders open de editor
      setEditing(task);
    }
  };

  // Functie om de volledige editor te openen
  const openTaskEditor = (task: any) => {
    setEditing(task);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.bg,
        color: theme.text,
        padding: "24px 16px 64px",
      }}
    >
      {/* Confetti CSS */}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: '1',
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: '0',
          }
        }
      `}</style>

      <div style={designSystem.container}>
        {/* Header */}
        <header style={{ textAlign: "center", marginBottom: designSystem.spacing.lg }}>
          <div style={designSystem.typography.h1}>Jouw dag in overzicht</div>
          <div style={{ ...designSystem.typography.body, color: theme.sub, marginTop: 8 }}>
            Eerst wat nú telt. De rest kan later.
          </div>
        </header>

        {/* Agenda Preview - vandaag */}
        <section style={designSystem.section}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: designSystem.spacing.md }}>
            <div style={designSystem.typography.h3}>📅 Vandaag</div>
            <a 
              href="/agenda" 
              style={{ 
                fontSize: 14, 
                color: designSystem.colors.primary, 
                textDecoration: 'none',
                fontWeight: 600
              }}
            >
              Volledige agenda →
            </a>
          </div>
          <div style={{ display: "grid", gap: designSystem.spacing.xs }}>
            {tasks
              .filter((t: any) => {
                if (!t.dueAt || t.done || t.source === 'medication') return false;
                const taskDate = new Date(t.dueAt);
                const today = new Date();
                return taskDate.toDateString() === today.toDateString();
              })
              .sort((a: any, b: any) => {
                const timeA = new Date(a.dueAt).getTime();
                const timeB = new Date(b.dueAt).getTime();
                return timeA - timeB;
              })
              .slice(0, 5)
              .map((task: any) => {
                const taskTime = new Date(task.dueAt);
                return (
                  <div
                    key={task.id}
                    onClick={() => window.location.href = `/focus?task=${encodeURIComponent(task.title)}&duration=${task.duration || 15}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: designSystem.spacing.sm,
                      padding: designSystem.spacing.sm,
                      borderRadius: 8,
                      background: theme.card,
                      border: `1px solid ${theme.line}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#F8F9FA';
                      e.currentTarget.style.borderColor = designSystem.colors.primary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = theme.card;
                      e.currentTarget.style.borderColor = theme.line;
                    }}
                  >
                    <div style={{ 
                      fontSize: 12, 
                      fontWeight: 600, 
                      color: designSystem.colors.primary,
                      minWidth: 60,
                      textAlign: 'right'
                    }}>
                      {taskTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ flex: 1, ...designSystem.typography.body }}>
                      {task.title}
                    </div>
                    {task.duration && (
                      <div style={{ fontSize: 11, color: theme.sub }}>
                        ⏱ {task.duration} min
                      </div>
                    )}
                  </div>
                );
              })}
            {tasks.filter((t: any) => {
              if (!t.dueAt || t.done || t.source === 'medication') return false;
              const taskDate = new Date(t.dueAt);
              const today = new Date();
              return taskDate.toDateString() === today.toDateString();
            }).length === 0 && (
              <div style={{ ...designSystem.typography.body, color: theme.sub, textAlign: 'center' as const, padding: '20px' }}>
                Geen taken gepland voor vandaag
              </div>
            )}
          </div>
        </section>

        {/* Snel taak toevoegen */}
        <section style={designSystem.section}>
          <div style={{ display: "grid", gap: designSystem.spacing.sm }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: 'wrap' }}>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  // Enter toevoegt taak met medium (oranje) als default
                  if (e.key === "Enter" && newTitle.trim()) {
                    handleAddTaskWithEnergy('medium');
                  }
                }}
                placeholder="Nieuwe taak…"
                style={{ ...input, flex: 1, minWidth: 200 }}
                aria-label="Taak titel"
              />
              
              {/* Energie-niveau knoppen: alleen kleuren, direct toevoegen bij klik */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  onClick={() => handleAddTaskWithEnergy('low')}
                  disabled={!newTitle.trim()}
                  style={{
                    width: 48,
                    height: 48,
                    background: '#10B981',
                    border: '2px solid #10B981',
                    borderRadius: 12,
                    cursor: newTitle.trim() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s ease',
                    opacity: newTitle.trim() ? 1 : 0.5,
                    boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (newTitle.trim()) {
                      e.currentTarget.style.transform = 'scale(1.1)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.2)';
                  }}
                  title="Groen - Makkelijk (lage energie)"
                />
                <button
                  onClick={() => handleAddTaskWithEnergy('medium')}
                  disabled={!newTitle.trim()}
                  style={{
                    width: 48,
                    height: 48,
                    background: '#F59E0B',
                    border: '2px solid #F59E0B',
                    borderRadius: 12,
                    cursor: newTitle.trim() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s ease',
                    opacity: newTitle.trim() ? 1 : 0.5,
                    boxShadow: '0 2px 4px rgba(245, 158, 11, 0.2)',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (newTitle.trim()) {
                      e.currentTarget.style.transform = 'scale(1.1)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(245, 158, 11, 0.2)';
                  }}
                  title="Oranje - Normaal (gemiddelde energie)"
                />
                <button
                  onClick={() => handleAddTaskWithEnergy('high')}
                  disabled={!newTitle.trim()}
                  style={{
                    width: 48,
                    height: 48,
                    background: '#EF4444',
                    border: '2px solid #EF4444',
                    borderRadius: 12,
                    cursor: newTitle.trim() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s ease',
                    opacity: newTitle.trim() ? 1 : 0.5,
                    boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (newTitle.trim()) {
                      e.currentTarget.style.transform = 'scale(1.1)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(239, 68, 68, 0.2)';
                  }}
                  title="Rood - Moeilijk (hoge energie)"
                />
              </div>
            </div>
            <div style={{ ...designSystem.typography.bodySmall, color: theme.sub, fontSize: 11 }}>
              Klik op een kleur om de taak direct toe te voegen: Groen (makkelijk), Oranje (normaal), Rood (moeilijk)
            </div>
          </div>
        </section>

        {/* Top 3 Prioriteiten - Visuele Hiërarchie */}
        <section style={designSystem.section}>
          <div style={{ ...designSystem.typography.h3, marginBottom: designSystem.spacing.md }}>
            Prioriteiten voor vandaag
          </div>
          
          <div style={{ display: "grid", gap: designSystem.spacing.sm }}>
            {/* Prioriteit 1 - Moet vandaag */}
            <div 
              style={{ 
                ...spotlightWrap, 
                border: "1px solid #EF4444", 
                background: dragOverTarget === 'priority1' ? "#FEE2E2" : "#FEF2F2",
                transition: "all 200ms ease"
              }}
              onDragOver={(e) => handleDragOver(e, 'priority1')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'priority1')}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <NumberBadge n={1} big />
                <div style={{ display: "grid", gap: 6, flex: 1 }}>
                  <div style={{ fontSize: 12, color: "#EF4444", fontWeight: 600 }}>MOET VANDAAG</div>
                  {top3[0] ? (
                    <TaskInline
                      task={top3[0]}
                      checked={top3[0].done}
                      onToggle={(c: boolean) => toggleDone(top3[0].id, c)}
                      onRemove={() => removeTask(top3[0].id)}
                      onDemote={() => clearPriority(top3[0].id)}
                      onEdit={updateTask}
                      onStart={startFocus}
                      onMarkStarted={markTaskAsStarted}
                      openTaskEditor={openTaskEditor}
                    />
                  ) : (
                    <EmptySlot text="Sleep hier je belangrijkste taak naartoe" />
                  )}
                </div>
              </div>
            </div>

            {/* Prioriteit 2 - Belangrijk */}
            {(() => {
              const isLowEnergy = todayEnergyLevel === 'low';
              const isDisabled = isLowEnergy;
              return (
                <div 
                  style={{ 
                    ...spotlightWrap, 
                    border: `1px solid ${isDisabled ? '#D1D5DB' : '#F59E0B'}`, 
                    background: isDisabled 
                      ? '#F9FAFB' 
                      : dragOverTarget === 'priority2' ? "#FEF3C7" : "#FFFBEB",
                    transition: "all 200ms ease",
                    opacity: isDisabled ? 0.4 : 1,
                    pointerEvents: isDisabled ? 'none' : 'auto'
                  }}
                  onDragOver={isDisabled ? undefined : (e) => handleDragOver(e, 'priority2')}
                  onDragLeave={isDisabled ? undefined : handleDragLeave}
                  onDrop={isDisabled ? undefined : (e) => handleDrop(e, 'priority2')}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <NumberBadge n={2} big />
                    <div style={{ display: "grid", gap: 6, flex: 1 }}>
                      <div style={{ 
                        fontSize: 12, 
                        color: isDisabled ? '#9CA3AF' : "#F59E0B", 
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                      }}>
                        BELANGRIJK
                        {isDisabled && <span style={{ fontSize: 10, fontStyle: 'italic' }}>💤 Niet beschikbaar bij lage energie</span>}
                      </div>
                      {top3[1] ? (
                        <TaskInline
                          task={top3[1]}
                          checked={top3[1].done}
                          onToggle={(c: boolean) => toggleDone(top3[1].id, c)}
                          onRemove={() => removeTask(top3[1].id)}
                          onDemote={() => clearPriority(top3[1].id)}
                          onEdit={updateTask}
                          onStart={startFocus}
                          onMarkStarted={markTaskAsStarted}
                          openTaskEditor={openTaskEditor}
                        />
                      ) : (
                        <EmptySlot text={isDisabled ? "Niet beschikbaar bij lage energie" : "Sleep hier je tweede prioriteit naartoe"} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Prioriteit 3 - Extra focus */}
            {(() => {
              const isLowEnergy = todayEnergyLevel === 'low';
              const isDisabled = isLowEnergy;
              return (
                <div 
                  style={{ 
                    ...spotlightWrap, 
                    border: `1px solid ${isDisabled ? '#D1D5DB' : '#4A90E2'}`, 
                    background: isDisabled 
                      ? '#F9FAFB' 
                      : dragOverTarget === 'priority3' ? "#DBEAFE" : "#F0F9FF",
                    transition: "all 200ms ease",
                    opacity: isDisabled ? 0.4 : 1,
                    pointerEvents: isDisabled ? 'none' : 'auto'
                  }}
                  onDragOver={isDisabled ? undefined : (e) => handleDragOver(e, 'priority3')}
                  onDragLeave={isDisabled ? undefined : handleDragLeave}
                  onDrop={isDisabled ? undefined : (e) => handleDrop(e, 'priority3')}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <NumberBadge n={3} big />
                    <div style={{ display: "grid", gap: 6, flex: 1 }}>
                      <div style={{ 
                        fontSize: 12, 
                        color: isDisabled ? '#9CA3AF' : "#4A90E2", 
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                      }}>
                        EXTRA FOCUS
                        {isDisabled && <span style={{ fontSize: 10, fontStyle: 'italic' }}>💤 Niet beschikbaar bij lage energie</span>}
                      </div>
                      {top3[2] ? (
                        <TaskInline
                          task={top3[2]}
                          checked={top3[2].done}
                          onToggle={(c: boolean) => toggleDone(top3[2].id, c)}
                          onRemove={() => removeTask(top3[2].id)}
                          onDemote={() => clearPriority(top3[2].id)}
                          onEdit={updateTask}
                          onStart={startFocus}
                          onMarkStarted={markTaskAsStarted}
                          openTaskEditor={openTaskEditor}
                        />
                      ) : (
                        <EmptySlot text={isDisabled ? "Niet beschikbaar bij lage energie" : "Sleep hier je derde prioriteit naartoe"} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Aanmoediging */}
          {top3.length === 0 && (
            <div style={{ marginTop: designSystem.spacing.md, ...designSystem.typography.body, color: theme.sub, textAlign: 'center' }}>
              Kies je eerste taak voor vandaag.
            </div>
          )}
        </section>

        {/* Geparkeerde Gedachten (van Focus Modus) - uitklapbaar */}
        <section style={designSystem.section}>
          <Collapsible title={`🧠 Geparkeerde gedachten (${parkedThoughts.length})`} defaultOpen={false}>
            <div 
              style={{ 
                display: "grid", 
                gap: designSystem.spacing.sm,
                minHeight: parkedThoughts.length === 0 ? 60 : 'auto',
                padding: dragOverTarget === 'parked' ? 8 : 0,
                borderRadius: dragOverTarget === 'parked' ? 8 : 0,
                background: dragOverTarget === 'parked' ? theme.soft : 'transparent',
                transition: 'all 200ms ease',
                marginTop: designSystem.spacing.md
              }}
              onDragOver={(e) => handleDragOver(e, 'parked')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'parked')}
            >
              {parkedThoughts.length === 0 ? (
                <div style={{ ...designSystem.typography.body, color: theme.sub, textAlign: 'center' as const, padding: '20px' }}>
                  Nog geen gedachten geparkeerd. Gebruik de Focus Modus om gedachten te parkeren.
                </div>
              ) : (
                parkedThoughts.map((thought: any) => (
                  <div
                    key={thought.id}
                    style={{
                      ...rowWrap,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: designSystem.spacing.sm,
                    }}
                  >
                    <div style={{ flex: 1, ...designSystem.typography.body }}>
                      🧠 {thought.title}
                    </div>
                    <div style={{ display: "flex", gap: designSystem.spacing.xs, alignItems: "center" }}>
                      <button
                        onClick={() => convertToTask(thought.id)}
                        style={{
                          ...chipBtn,
                          background: designSystem.colors.primary,
                          color: 'white',
                          borderColor: designSystem.colors.primary,
                        }}
                      >
                        Omzetten naar taak
                      </button>
                      <button
                        onClick={() => removeTask(thought.id)}
                        style={{
                          ...iconBtn,
                          padding: '6px 8px',
                        }}
                        title="Markeer als afgehandeld"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Collapsible>
        </section>

        {/* Openstaande taken (inklaps) */}
        <section style={designSystem.section}>
          <Collapsible title={`Openstaande taken (${regularTasks.length + remainderTasks.length})`}>
            <div style={{ display: "grid", gap: 10, marginTop: designSystem.spacing.md }}>
              {(regularTasks.length + remainderTasks.length) === 0 ? (
                <div style={{ ...designSystem.typography.body, color: theme.sub, textAlign: 'center' as const, padding: '20px' }}>
                  Alles gedaan. Nice!
            </div>
          ) : (
            <>
                  {/* Resterende tijd taken */}
                  {remainderTasks.length > 0 && (
                    <div style={{ marginBottom: designSystem.spacing.md }}>
                      <div style={{ ...designSystem.typography.body, fontWeight: 600, marginBottom: designSystem.spacing.sm }}>
                        Resterende tijd
                      </div>
                      <div style={{ display: "grid", gap: designSystem.spacing.xs }}>
                        {remainderTasks.map((t: any, idx: number) => (
                  <TaskRow
                    key={t.id || `remainder-${idx}`}
                    task={t}
                    isSelected={t.id === selectedTaskId}
                    onSelect={() => setSelectedTaskId(t.id)}
                    onToggle={(c: boolean) => toggleDone(t.id, c)}
                    onRemove={() => removeTask(t.id)}
                    onPromoteTo1={() => setPriority(t.id, 1)}
                    onPromoteTo2={() => setPriority(t.id, 2)}
                    onPromoteTo3={() => setPriority(t.id, 3)}
                    onEdit={updateTask}
                    onStart={startFocus}
                    onConvertToTask={convertToTask}
                    openTaskEditor={openTaskEditor}
                    onClearPriority={() => clearPriority(t.id)}
                            onToggleNotToday={(notToday: boolean) => toggleNotToday(t.id, notToday)}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                  />
                ))}
              </div>
                    </div>
                  )}

                  {/* Reguliere taken - in kolommen op basis van duur */}
                  <div
                    onDragOver={(e) => handleDragOver(e, 'others')}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, 'others')}
                    style={{
                      minHeight: regularTasks.length === 0 ? 60 : 'auto',
                      padding: dragOverTarget === 'others' ? 8 : 0,
                      borderRadius: dragOverTarget === 'others' ? 8 : 0,
                      background: dragOverTarget === 'others' ? theme.soft : 'transparent',
                      transition: 'all 200ms ease'
                    }}
                  >
                    {(() => {
                      // Groepeer taken op duur - exclusief: een taak kan maar in 1 categorie zitten
                      const tasksByDuration = {
                        // Kort: alleen taken MET duration <= 15 (geen duration = niet hier)
                        short: regularTasks.filter((t: any) => t.duration && t.duration <= 15),
                        // Medium: taken met duration tussen 15 en 60
                        medium: regularTasks.filter((t: any) => t.duration && t.duration > 15 && t.duration <= 60),
                        // Lang: taken met duration > 60
                        long: regularTasks.filter((t: any) => t.duration && t.duration > 60),
                        // Geen duur: alleen taken ZONDER duration
                        noDuration: regularTasks.filter((t: any) => !t.duration)
                      };
                      
                      return (
                        <div style={{ 
                          display: "grid", 
                          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", 
                          gap: designSystem.spacing.md 
                        }}>
                          {tasksByDuration.short.length > 0 && (
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: designSystem.spacing.xs, color: "#10B981" }}>
                                ⚡ Kort (≤15 min) - {tasksByDuration.short.length}
                              </div>
                              <div style={{ display: "grid", gap: designSystem.spacing.xs }}>
                                {tasksByDuration.short.map((t: any, idx: number) => (
                                  <TaskRow
                                    key={t.id || `short-${idx}`}
                                    task={t}
                                    isSelected={t.id === selectedTaskId}
                                    onSelect={() => setSelectedTaskId(t.id)}
                                    onToggle={(c: boolean) => toggleDone(t.id, c)}
                                    onRemove={() => removeTask(t.id)}
                                    onPromoteTo1={() => setPriority(t.id, 1)}
                                    onPromoteTo2={() => setPriority(t.id, 2)}
                                    onPromoteTo3={() => setPriority(t.id, 3)}
                                    onEdit={updateTask}
                                    onStart={startFocus}
                                    onConvertToTask={convertToTask}
                                    openTaskEditor={openTaskEditor}
                                    onClearPriority={() => clearPriority(t.id)}
                                    onToggleNotToday={(notToday: boolean) => toggleNotToday(t.id, notToday)}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {tasksByDuration.medium.length > 0 && (
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: designSystem.spacing.xs, color: "#4A90E2" }}>
                                📋 Medium (15-60 min) - {tasksByDuration.medium.length}
                              </div>
                              <div style={{ display: "grid", gap: designSystem.spacing.xs }}>
                                {tasksByDuration.medium.map((t: any, idx: number) => (
                                  <TaskRow
                                    key={t.id || `medium-${idx}`}
                                    task={t}
                                    isSelected={t.id === selectedTaskId}
                                    onSelect={() => setSelectedTaskId(t.id)}
                                    onToggle={(c: boolean) => toggleDone(t.id, c)}
                                    onRemove={() => removeTask(t.id)}
                                    onPromoteTo1={() => setPriority(t.id, 1)}
                                    onPromoteTo2={() => setPriority(t.id, 2)}
                                    onPromoteTo3={() => setPriority(t.id, 3)}
                                    onEdit={updateTask}
                                    onStart={startFocus}
                                    onConvertToTask={convertToTask}
                                    openTaskEditor={openTaskEditor}
                                    onClearPriority={() => clearPriority(t.id)}
                                    onToggleNotToday={(notToday: boolean) => toggleNotToday(t.id, notToday)}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {tasksByDuration.long.length > 0 && (
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: designSystem.spacing.xs, color: "#F59E0B" }}>
                                🎯 Lang (&gt;60 min) - {tasksByDuration.long.length}
                              </div>
                              <div style={{ display: "grid", gap: designSystem.spacing.xs }}>
                                {tasksByDuration.long.map((t: any, idx: number) => (
                                  <TaskRow
                                    key={t.id || `long-${idx}`}
                                    task={t}
                                    isSelected={t.id === selectedTaskId}
                                    onSelect={() => setSelectedTaskId(t.id)}
                                    onToggle={(c: boolean) => toggleDone(t.id, c)}
                                    onRemove={() => removeTask(t.id)}
                                    onPromoteTo1={() => setPriority(t.id, 1)}
                                    onPromoteTo2={() => setPriority(t.id, 2)}
                                    onPromoteTo3={() => setPriority(t.id, 3)}
                                    onEdit={updateTask}
                                    onStart={startFocus}
                                    onConvertToTask={convertToTask}
                                    openTaskEditor={openTaskEditor}
                                    onClearPriority={() => clearPriority(t.id)}
                                    onToggleNotToday={(notToday: boolean) => toggleNotToday(t.id, notToday)}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {tasksByDuration.noDuration.length > 0 && (
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: designSystem.spacing.xs, color: theme.sub }}>
                                📝 Geen duur - {tasksByDuration.noDuration.length}
                              </div>
                              <div style={{ display: "grid", gap: designSystem.spacing.xs }}>
                                {tasksByDuration.noDuration.map((t: any, idx: number) => (
                                  <TaskRow
                                    key={t.id || `nodur-${idx}`}
                                    task={t}
                                    isSelected={t.id === selectedTaskId}
                                    onSelect={() => setSelectedTaskId(t.id)}
                                    onToggle={(c: boolean) => toggleDone(t.id, c)}
                                    onRemove={() => removeTask(t.id)}
                                    onPromoteTo1={() => setPriority(t.id, 1)}
                                    onPromoteTo2={() => setPriority(t.id, 2)}
                                    onPromoteTo3={() => setPriority(t.id, 3)}
                                    onEdit={updateTask}
                                    onStart={startFocus}
                                    onConvertToTask={convertToTask}
                                    openTaskEditor={openTaskEditor}
                                    onClearPriority={() => clearPriority(t.id)}
                                    onToggleNotToday={(notToday: boolean) => toggleNotToday(t.id, notToday)}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
              </div>
            </>
          )}
            </div>
          </Collapsible>
        </section>

        {/* Niet vandaag lijst */}
        <section style={designSystem.section}>
          <Collapsible title={`Niet vandaag (${notTodayTasks.length})`} defaultOpen={false}>
            <div 
              style={{ 
                display: "grid", 
                gap: 10, 
                marginTop: designSystem.spacing.xs,
                minHeight: notTodayTasks.length === 0 ? 60 : 'auto',
                padding: dragOverTarget === 'notToday' ? 8 : 0,
                borderRadius: dragOverTarget === 'notToday' ? 8 : 0,
                background: dragOverTarget === 'notToday' ? theme.soft : 'transparent',
                transition: 'all 200ms ease'
              }}
              onDragOver={(e) => handleDragOver(e, 'notToday')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'notToday')}
            >
              {notTodayTasks.length === 0 ? (
                <div style={{ ...designSystem.typography.body, color: theme.sub, textAlign: 'center' as const, padding: '20px' }}>
                  Sleep hier taken naartoe die je vandaag niet hoeft te doen
                </div>
              ) : (
                notTodayTasks.map((t: any, idx: number) => (
                  <div key={t.id || `nottoday-${idx}`} style={{ border: '1px solid ' + theme.line, borderRadius: 8, padding: 12, background: theme.card }}>
                          <TaskRow
                            task={t}
                            isSelected={t.id === selectedTaskId}
                            onSelect={() => setSelectedTaskId(t.id)}
                            onToggle={(c: boolean) => toggleDone(t.id, c)}
                            onRemove={() => removeTask(t.id)}
                            onPromoteTo1={() => setPriority(t.id, 1)}
                            onPromoteTo2={() => setPriority(t.id, 2)}
                            onPromoteTo3={() => setPriority(t.id, 3)}
                            onEdit={updateTask}
                            onStart={startFocus}
                            onConvertToTask={convertToTask}
                            openTaskEditor={openTaskEditor}
                            onClearPriority={() => clearPriority(t.id)}
                      onToggleNotToday={(notToday: boolean) => toggleNotToday(t.id, notToday)}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                    />
                    {/* Verplaats opties */}
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid ' + theme.line, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => moveTaskToDate(t.id, 'tomorrow')}
                        style={{
                          fontSize: 12,
                          padding: '6px 12px',
                          background: '#F0F9FF',
                          color: theme.accent,
                          border: '1px solid ' + theme.accent,
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontWeight: 500
                        }}
                        title="Verplaats deze taak naar morgen"
                      >
                        📅 Morgen
                      </button>
                      <button
                        onClick={() => moveTaskToDate(t.id, 'thisWeek')}
                        style={{
                          fontSize: 12,
                          padding: '6px 12px',
                          background: '#F0F9FF',
                          color: theme.accent,
                          border: '1px solid ' + theme.accent,
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontWeight: 500
                        }}
                        title="Verplaats deze taak naar deze week"
                      >
                        📅 Deze week
                      </button>
                      <button
                        onClick={() => moveTaskToDate(t.id, 'thisMonth')}
                        style={{
                          fontSize: 12,
                          padding: '6px 12px',
                          background: '#F0F9FF',
                          color: theme.accent,
                          border: '1px solid ' + theme.accent,
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontWeight: 500
                        }}
                        title="Verplaats deze taak naar deze maand"
                      >
                        📅 Deze maand
                      </button>
                      <button
                        onClick={() => toggleNotToday(t.id, false)}
                        style={{
                          fontSize: 12,
                          padding: '6px 12px',
                          background: '#F3F4F6',
                          color: theme.sub,
                          border: '1px solid ' + theme.line,
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontWeight: 500
                        }}
                        title="Terug naar vandaag"
                      >
                        ✅ Terug naar vandaag
                      </button>
                      </div>
                    </div>
                ))
              )}
            </div>
          </Collapsible>
        </section>

        {/* Voltooid (altijd zichtbaar) */}
        <section style={designSystem.section}>
          <Collapsible title={`Voltooid (${completed.length})`} defaultOpen={false}>
            <div 
              style={{ 
                display: "grid", 
                gap: 10, 
                marginTop: designSystem.spacing.xs,
                minHeight: completed.length === 0 ? 60 : 'auto',
                padding: dragOverTarget === 'completed' ? 8 : 0,
                borderRadius: dragOverTarget === 'completed' ? 8 : 0,
                background: dragOverTarget === 'completed' ? theme.soft : 'transparent',
                transition: 'all 200ms ease'
              }}
              onDragOver={(e) => handleDragOver(e, 'completed')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'completed')}
            >
              {completed.length === 0 ? (
                <div style={{ ...designSystem.typography.body, color: theme.sub, textAlign: 'center' as const, padding: '20px' }}>
                  Nog geen taken voltooid vandaag. Sleep hier taken naartoe om ze als voltooid te markeren.
                </div>
              ) : (
                completed.map((t: any, idx: number) => (
                    <TaskRow
                      key={t.id || `completed-${idx}`}
                      task={t}
                      isSelected={t.id === selectedTaskId}
                      onSelect={() => setSelectedTaskId(t.id)}
                      onToggle={(c: boolean) => toggleDone(t.id, c)}
                      onRemove={() => removeTask(t.id)}
                      onPromoteTo1={() => setPriority(t.id, 1)}
                      onPromoteTo2={() => setPriority(t.id, 2)}
                      onPromoteTo3={() => setPriority(t.id, 3)}
                      onEdit={updateTask}
                      onStart={startFocus}
                      onConvertToTask={convertToTask}
                      openTaskEditor={openTaskEditor}
                      onClearPriority={() => clearPriority(t.id)}
                    onToggleNotToday={(notToday: boolean) => toggleNotToday(t.id, notToday)}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    />
                ))
              )}
            </div>
          </Collapsible>
        </section>

        {/* Schedule Editor Overlay */}
        {editing && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
            padding: "20px"
          }}>
            <TaskScheduleEditor
              task={editing}
              onSave={async (tNext: any) => {
                const next = tasks.map((t: any) => (t.id === tNext.id ? tNext : t));
                await update(next);
              }}
              onClose={() => setEditing(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** ---------- Subcomponenten ---------- */

function SpotlightCard({ number, label, task, onPromote, onDemote, onToggle, onRemove, onEdit, onStart }: any) {
  return (
    <div style={{ ...spotlightWrap }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <NumberBadge n={number} big />
        <div style={{ display: "grid", gap: 6, flex: 1 }}>
          <div style={{ fontSize: 12, color: theme.accent, fontWeight: 600 }}>{label}</div>
          {task ? (
            <TaskInline
              task={task}
              checked={task.done}
              onToggle={(c: boolean) => onToggle(task.id, c)}
              onRemove={() => onRemove(task.id)}
              onDemote={() => onDemote(task.id)}
              onEdit={onEdit}
              onStart={onStart}
            />
          ) : (
            <EmptySlot text="Sleep of promoot een taak naar 'Belangrijkst'" />
          )}
        </div>
      </div>
    </div>
  );
}

function PriorityRow({ number, label, task, onPromote, onDemote, onToggle, onRemove, onEdit, onStart }: any) {
  return (
    <div style={{ ...rowWrap }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <NumberBadge n={number} />
        <div style={{ display: "grid", gap: 6, flex: 1 }}>
          <div style={{ fontSize: 12, color: theme.sub, fontWeight: 600 }}>{label}</div>
          {task ? (
            <TaskInline
              task={task}
              checked={task.done}
              onToggle={(c: boolean) => onToggle(task.id, c)}
              onRemove={() => onRemove(task.id)}
              onDemote={() => onDemote(task.id)}
              onEdit={onEdit}
              onStart={onStart}
            />
          ) : (
            <EmptySlot text={`Voeg een taak toe aan #${number}`} />
          )}
        </div>
      </div>
    </div>
  );
}

function TaskRow({ task, onToggle, onRemove, onPromoteTo1, onPromoteTo2, onPromoteTo3, onEdit, onStart, onMarkStarted, onConvertToTask, openTaskEditor, onClearPriority, onToggleNotToday, onDragStart, onDragEnd }: any) {
  const [showMicroSteps, setShowMicroSteps] = useState(false);
  const [newMicroStep, setNewMicroStep] = useState('');
  
  const startButtonTitle = task.duration 
    ? 'Start Focus sessie voor deze taak (' + task.duration + ' minuten)' 
    : 'Start Focus sessie - stel eerst een duur in door op ⏱ te klikken';
  
  const getEnergyColor = (level: string) => {
    switch (level) {
      case 'low': return '#10B981'; // groen
      case 'medium': return '#F59E0B'; // oranje
      case 'high': return '#EF4444'; // rood
      default: return '#6B7280'; // grijs
    }
  };

  const getEnergyLabel = (level: string) => {
    switch (level) {
      case 'low': return 'Laag';
      case 'medium': return 'Medium';
      case 'high': return 'Hoog';
      default: return 'Onbekend';
    }
  };

  return (
    <div 
      style={{
        ...taskRow,
        cursor: 'grab',
      }}
      draggable={true}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', task.id);
        if (onDragStart) onDragStart(task.id);
      }}
      onDragEnd={() => {
        if (onDragEnd) onDragEnd();
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 500, fontSize: 15, color: theme.text }}>{task.title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          {/* Duur - klikbaar om te bewerken */}
        {task.duration ? (
            <button
              onClick={async () => {
                const newDuration = prompt(`Hoe lang duurt deze taak? (minuten)\nHuidige duur: ${task.duration} min`, task.duration.toString());
                if (newDuration && !isNaN(parseInt(newDuration))) {
                  try {
                    await onEdit({ ...task, duration: parseInt(newDuration), estimatedDuration: parseInt(newDuration) });
                  } catch (error) {
                    console.error('Error updating duration:', error);
                    toast('Fout bij bijwerken van duur. Probeer het opnieuw.');
                  }
                }
              }}
              style={{
                fontSize: 11,
                color: theme.sub,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px 4px',
                borderRadius: 4,
                textDecoration: 'none'
              }}
              title="Klik om duur aan te passen - schat in hoe lang deze taak gaat duren"
            >
              ⏱ {task.duration} min
            </button>
          ) : (
            <button
              onClick={async () => {
                const newDuration = prompt('Hoe lang duurt deze taak? (minuten)\n\nTip: Schat realistisch in. Je kunt dit later altijd aanpassen.', '');
                if (newDuration && !isNaN(parseInt(newDuration)) && parseInt(newDuration) > 0) {
                  try {
                    await onEdit({ ...task, duration: parseInt(newDuration), estimatedDuration: parseInt(newDuration) });
                    toast(`Duur ingesteld op ${newDuration} minuten`);
                  } catch (error) {
                    console.error('Error setting duration:', error);
                    toast('Fout bij instellen van duur. Probeer het opnieuw.');
                  }
                } else if (newDuration !== null) {
                  toast('Voer een geldig aantal minuten in (bijv. 15, 30, 60)');
                }
              }}
              style={{
                fontSize: 11,
                color: theme.accent,
                background: '#F0F9FF',
                border: '1px dashed ' + theme.accent,
                cursor: 'pointer',
                padding: '3px 6px',
                borderRadius: 4,
                fontWeight: 500
              }}
              title="Klik om duur in te stellen - schat in hoe lang deze taak gaat duren (bijv. 15, 30, 60 minuten)"
            >
              ⏱ Duur instellen
            </button>
          )}
            {task.energyLevel && (
              <div
                style={{
                  fontSize: 9,
                  padding: "2px 4px",
                  borderRadius: 4,
                  background: getEnergyColor(task.energyLevel),
                  color: "white",
                  fontWeight: 600
                }}
              title={'Energie-niveau: ' + getEnergyLabel(task.energyLevel)}
              >
                {getEnergyLabel(task.energyLevel).charAt(0)}
              </div>
            )}
            <TimeChip dueAt={task.dueAt} />
          </div>
        {task.source === 'interruption_hopper' && (
          <div style={{ fontSize: 12, color: theme.accent, marginTop: 4 }}>
            Geparkeerde gedachte
          </div>
        )}
        {/* Micro-stappen */}
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${theme.line}` }}>
          <div style={{ fontSize: 10, color: theme.sub, fontWeight: 600, marginBottom: 4 }}>
            Micro-stappen:
          </div>
          {(task.microSteps || task.micro_steps) && (task.microSteps || task.micro_steps || []).length > 0 ? (
            <>
              <button
                onClick={() => setShowMicroSteps(!showMicroSteps)}
                style={{
                  fontSize: 11,
                  color: theme.accent,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                  marginBottom: 4
                }}
                title="Klik om micro-stappen te tonen/verbergen - kleine stappen helpen om te beginnen"
              >
                {showMicroSteps ? '▼' : '▶'} {(task.microSteps || task.micro_steps || []).length} micro-stap{(task.microSteps || task.micro_steps || []).length !== 1 ? 'pen' : ''}
              </button>
              {showMicroSteps && (
                <div style={{ marginTop: 8, paddingLeft: 12, borderLeft: `2px solid ${theme.accent}` }}>
                  {(task.microSteps || task.micro_steps || []).map((step: string, idx: number) => (
                    <div key={idx} style={{ fontSize: 12, color: theme.sub, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>{idx + 1}. {step}</span>
                      <button
                        onClick={() => {
                          const currentSteps = task.microSteps || task.micro_steps || [];
                          const updatedSteps = currentSteps.filter((_: string, i: number) => i !== idx);
                          onEdit({ ...task, microSteps: updatedSteps, micro_steps: updatedSteps });
                        }}
                        style={{
                          fontSize: 10,
                          padding: '1px 4px',
                          background: '#EF4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: 3,
                          cursor: 'pointer'
                        }}
                        title="Verwijder deze micro-stap"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : null}
          {/* Toevoegen micro-stap */}
          <div style={{ marginTop: 4, display: 'flex', gap: 4, alignItems: 'center' }}>
            <input
              type="text"
              value={newMicroStep}
              onChange={(e) => setNewMicroStep(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newMicroStep.trim()) {
                  const currentSteps = task.microSteps || task.micro_steps || [];
                  const updatedSteps = [...currentSteps, newMicroStep.trim()];
                  onEdit({ ...task, microSteps: updatedSteps, micro_steps: updatedSteps });
                  setNewMicroStep('');
                }
              }}
              placeholder="Bijv: 'Open laptop', 'Pak pen', 'Bel mama'..."
              style={{
                fontSize: 11,
                padding: '4px 8px',
                border: '1px solid ' + theme.line,
                borderRadius: 4,
                flex: 1,
                maxWidth: 250
              }}
              title="Voeg een kleine eerste stap toe om te beginnen - dit helpt bij uitstel"
            />
            {newMicroStep.trim() && (
              <button
                onClick={() => {
                  const currentSteps = task.microSteps || task.micro_steps || [];
                  const updatedSteps = [...currentSteps, newMicroStep.trim()];
                  onEdit({ ...task, microSteps: updatedSteps, micro_steps: updatedSteps });
                  setNewMicroStep('');
                }}
                style={{
                  fontSize: 11,
                  padding: '4px 8px',
                  background: theme.accent,
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
                title="Micro-stap toevoegen"
              >
                +
              </button>
            )}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {(task.source === 'interruption_hopper' || task.source === 'parked_thought') ? (
          <>
            <button 
              title="Omzetten naar taak" 
              onClick={() => {
                if (onConvertToTask) {
                  onConvertToTask(task.id);
                } else if (onPromoteTo1) {
                  // Als er geen convert functie is, promoveer direct naar prioriteit 1
                  onPromoteTo1();
                }
              }} 
              style={{
                ...iconBtn,
                background: theme.accent,
                color: 'white',
                border: '1px solid ' + theme.accent,
                fontWeight: '600'
              }}
            >
              ✓
            </button>
            <button title="Verwijder" onClick={onRemove} style={iconBtn}>×</button>
          </>
        ) : (
          <>
            <button 
              title="Verwijder" 
              onClick={onRemove} 
              style={iconBtn}
            >
              ×
            </button>
            {/* "Ik ben begonnen" knop - alleen tonen als nog niet gestart */}
            {!task.started && onMarkStarted && (
              <button 
                title="Markeer als begonnen" 
                onClick={() => onMarkStarted(task)} 
                style={{
                  ...iconBtn,
                  background: '#10B981',
                  color: 'white',
                  border: '1px solid #10B981',
                  fontWeight: '600',
                  fontSize: 11,
                  padding: '4px 8px'
                }}
              >
                ✓ Begonnen
              </button>
            )}
            <button 
              title={startButtonTitle} 
              onClick={() => {
                if (!task.duration) {
                  toast('Stel eerst een duur in door op ⏱ te klikken');
                  return;
                }
                onStart(task);
              }} 
              style={{
                ...iconBtn,
                background: theme.accent,
                color: 'white',
                border: '1px solid ' + theme.accent,
                fontWeight: '600'
              }}
            >
              ▶ {task.duration ? task.duration + 'm' : '?'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function TaskInline({ task, checked, onToggle, onRemove, onDemote, onEdit, onStart, onMarkStarted, openTaskEditor }: any) {
  const [isEditingDuration, setIsEditingDuration] = useState(false);
  const [newDuration, setNewDuration] = useState(task.duration || 15);
  const [showHint, setShowHint] = useState(true);

  // Verberg hint na 3 keer gebruiken
  useEffect(() => {
    const hintCount = localStorage.getItem('duration_edit_hint_count') || '0';
    const count = parseInt(hintCount);
    if (count >= 3) {
      setShowHint(false);
    }
  }, []);

  const getEnergyColor = (level: string) => {
    switch (level) {
      case 'low': return '#10B981'; // groen
      case 'medium': return '#F59E0B'; // oranje
      case 'high': return '#EF4444'; // rood
      default: return '#6B7280'; // grijs
    }
  };

  const getEnergyLabel = (level: string) => {
    switch (level) {
      case 'low': return 'Laag';
      case 'medium': return 'Medium';
      case 'high': return 'Hoog';
      default: return 'Onbekend';
    }
  };

  const handleDurationChange = (newValue: number) => {
    // Update de taak met nieuwe duur
    const updatedTask = { ...task, duration: newValue };
    
    // Geef de bijgewerkte taak door aan de hoofdcomponent
    onEdit?.(updatedTask);
    
    setIsEditingDuration(false);
    
    // Verhoog hint counter
    const hintCount = localStorage.getItem('duration_edit_hint_count') || '0';
    const count = parseInt(hintCount) + 1;
    localStorage.setItem('duration_edit_hint_count', count.toString());
    
    if (count === 1) {
      toast("💡 Pro tip: Klik op de duur om deze aan te passen!");
    }
  };

  const getEnergyLevelFromDuration = (duration: number) => {
    if (duration <= 5) return 'low';
    if (duration <= 15) return 'medium';
    return 'high';
  };

  return (
    <div style={inlineTask(checked)}>
      <div style={{ flex: 1, display: "grid", gap: 4 }}>
        <div style={{ fontWeight: 500, fontSize: 15, color: theme.text, textDecoration: checked ? "line-through" : "none" }}>
          {task.title}
        </div>
        
        {/* Energie-tags en duur */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isEditingDuration ? (
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <input
                type="number"
                value={newDuration}
                onChange={(e) => setNewDuration(parseInt(e.target.value) || 5)}
                min="1"
                max="120"
                style={{
                  width: 50,
                  padding: "2px 4px",
                  borderRadius: 4,
                  border: "1px solid #D1D5DB",
                  fontSize: 10,
                  textAlign: "center"
                }}
              />
              <span style={{ fontSize: 10, color: "#6B7280" }}>min</span>
              <button
                onClick={() => handleDurationChange(newDuration)}
                style={{
                  fontSize: 10,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: "#10B981",
                  color: "white",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                ✓
              </button>
              <button
                onClick={() => setIsEditingDuration(false)}
                style={{
                  fontSize: 10,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: "#6B7280",
                  color: "white",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                ✕
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {/* Duur-tag */}
              <button
                onClick={() => setIsEditingDuration(true)}
                style={{
                  fontSize: 10,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: getEnergyColor(getEnergyLevelFromDuration(task.duration || 15)),
                  color: "white",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: showHint ? "0 2px 4px rgba(0,0,0,0.1)" : "none"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = showHint ? "0 2px 4px rgba(0,0,0,0.1)" : "none";
                }}
                title="Klik om duur aan te passen"
              >
                {task.duration || 15} min
              </button>

              {/* Energie-tag */}
              <div
                style={{
                  fontSize: 9,
                  padding: "2px 4px",
                  borderRadius: 3,
                  background: getEnergyColor(task.energyLevel || 'medium'),
                  color: "white",
                  fontWeight: 600,
                  border: "none",
                  opacity: '0.8'
                }}
                title={'Energie-niveau: ' + getEnergyLabel(task.energyLevel || 'medium')}
              >
                {getEnergyLabel(task.energyLevel || 'medium').charAt(0)}
              </div>
              
              {/* Hint icoon voor eerste keer gebruik */}
              {showHint && (
                <button
                  onClick={() => {
                    toast("💡 Klik op de duur-tag om deze aan te passen!");
                    // Verberg hint na klikken
                    setShowHint(false);
                    localStorage.setItem('duration_edit_hint_count', '3');
                  }}
                  style={{
                    fontSize: 8,
                    color: "#6B7280",
                    opacity: '0.8',
                    cursor: "pointer",
                    background: "none",
                    border: "none",
                    padding: 2,
                    borderRadius: 4,
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "1";
                    e.currentTarget.style.color = "#4A90E2";
                    e.currentTarget.style.transform = "scale(1.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "0.8";
                    e.currentTarget.style.color = "#6B7280";
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                  title="Klik hier voor uitleg over duur bewerken"
                >
                  💡
                </button>
              )}
            </div>
          )}
          
          {task.dueAt && (
            <TimeChip dueAt={task.dueAt} />
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {/* "Ik ben begonnen" knop - alleen tonen als nog niet gestart */}
        {!task.started && onMarkStarted && (
          <button
            title="Markeer als begonnen"
            onClick={() => onMarkStarted(task)}
            style={{
              ...iconBtn,
              background: '#10B981',
              color: 'white',
              border: '1px solid #10B981',
              fontWeight: '600',
              fontSize: '11px',
              padding: "6px 10px"
            }}
          >
            ✓ Begonnen
          </button>
        )}
        {/* Start-knop */}
        <button
          title="Start deze taak"
          onClick={() => onStart?.(task)}
          style={{
            ...iconBtn,
            background: theme.accent,
            color: 'white',
            border: '1px solid ' + theme.accent,
            fontWeight: '600',
            fontSize: '12px',
            padding: "6px 10px"
          }}
        >
          ▶ Start
        </button>

        {/* Bewerk-knop */}
        <button
          title="Bewerk deze taak (volledige editor)"
          onClick={() => openTaskEditor(task)}
          style={{
            ...iconBtn,
            background: "#F3F4F6",
            color: "#6B7280",
            border: "1px solid #D1D5DB"
          }}
        >
          ✏️
        </button>

        {/* Verwijder of terugzetten knop */}
        {onDemote ? (
          <button
            title="Terugzetten naar openstaande taken - verwijder prioriteit"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDemote();
            }}
            style={{
              ...iconBtn,
              background: '#6B7280',
              color: 'white',
              border: '1px solid #6B7280'
            }}
          >
            ×
          </button>
        ) : (
        <button
          title="Verwijder"
          onClick={onRemove}
          style={iconBtn}
        >
          ×
        </button>
        )}
      </div>
    </div>
  );
}

function TimeChip({ dueAt }: { dueAt: string | null }) {
  if (!dueAt) return null;
  
  const d = new Date(dueAt);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);
  
  let statusColor = theme.sub; // normaal - gebruik subtiele kleur
  let borderColor = theme.line; // subtiele border
  if (diffMins < 0) {
    statusColor = "#DC2626"; // iets zachter rood
    borderColor = "#FEE2E2"; // zeer lichte rode border
  } else if (diffMins < 60) {
    statusColor = "#D97706"; // iets zachter oranje
    borderColor = "#FEF3C7"; // zeer lichte oranje border
  }
  
  return (
    <span style={{ 
      fontSize: 11, 
      padding: "3px 8px", 
      border: '1px solid ' + borderColor, 
      borderRadius: 6,
      color: statusColor,
      background: diffMins < 0 ? "#FEF2F2" : diffMins < 60 ? "#FFFBEB" : "transparent"
    }}>
      {formatWhen(d)}
    </span>
  );
}
function NumberBadge({ n, big = false }: { n: number; big?: boolean }) {
  return (
    <div
      style={{
        width: big ? 36 : 28,
        height: big ? 36 : 28,
        borderRadius: 999,
        border: "2px solid " + theme.accent,
        display: "grid",
        placeItems: "center",
        color: theme.accent,
        fontWeight: 700,
        background: "#FFF",
      }}
    >
      {n}
    </div>
  );
}

function EmptySlot({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 12,
        border: "1px dashed " + theme.line,
        color: theme.sub,
        fontSize: 13,
      }}
    >
      {text}
    </div>
  );
}

function Collapsible({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={collapseBtn}
      >
        <span style={designSystem.typography.h3}>{title}</span>
        <span style={{ ...designSystem.typography.bodySmall, fontSize: 12 }}>{open ? "▴" : "▾"}</span>
      </button>
      <div
        style={{
          marginTop: open ? designSystem.spacing.sm : 0,
          maxHeight: open ? 1200 : 0,
          overflow: "hidden",
          transition: "max-height 260ms ease, margin-top 260ms ease",
        }}
      >
        {open && children}
      </div>
    </div>
  );
}
/** ---------- Stijlen ---------- */
// Gebruik designSystem.section in plaats van card
const card = designSystem.section;

const input = {
  flex: 1,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid " + theme.line,
  background: "#FFF",
  color: theme.text,
  outline: "none",
};

const buttonPrimary = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid " + theme.line,
  background: "#FFF",
  color: theme.text,
  cursor: "pointer",
  transition: "all 200ms ease",
  ":hover": {
    background: theme.soft,
    borderColor: theme.accent,
  }
};

// Eenvoudige, uniforme knopstijl voor ADHD-vriendelijke interface
const chipBtn = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid " + theme.line,
  background: "#FFF",
  color: theme.text,
  fontSize: 13,
  cursor: "pointer",
  transition: "all 200ms ease",
  fontWeight: 600,
  minWidth: "36px",
  height: "36px",
  textAlign: "center" as const,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const iconBtn = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid " + theme.line,
  background: "#FFF",
  color: theme.sub,
  fontSize: 14,
  cursor: "pointer",
  transition: "all 200ms ease",
  minWidth: "36px",
  height: "36px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const spotlightWrap = {
  border: "1px solid " + theme.line,
  borderRadius: 12,
  padding: 14,
  background: theme.soft, // zachte spotlight
};

const rowWrap = {
  border: "1px solid " + theme.line,
  borderRadius: 12,
  padding: 12,
  background: "#FFF",
};

const taskRow = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: 12,
  border: "1px solid " + theme.line,
  borderRadius: 12,
  background: "#FFF",
};

const inlineTask = (checked: boolean) => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: 10,
  borderRadius: 10,
  border: "1px solid " + theme.line,
  background: "#FFF",
  opacity: checked ? '0.6' : '1',
  transition: "opacity 220ms ease, background 220ms ease",
});

const collapseBtn = {
  width: "100%",
  textAlign: "left" as const,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: designSystem.spacing.xs,
  padding: designSystem.spacing.sm,
  borderRadius: 10,
  border: "1px solid " + theme.line,
  background: designSystem.colors.white,
  color: theme.text,
  cursor: "pointer",
};

const planningBtn = {
  padding: "6px 8px",
  borderRadius: 8,
  border: "1px solid " + theme.line,
  background: "#FFF",
  color: theme.accent,
  fontSize: 14,
  cursor: "pointer",
  transition: "all 200ms ease",
  ":hover": {
    background: theme.soft,
    borderColor: theme.accent,
  }
};

const modalOverlay = {
  position: "fixed" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: "20px",
};

const modalContent = {
  background: theme.card,
  borderRadius: 16,
  padding: 24,
  maxWidth: "500px",
  width: "100%",
  maxHeight: "90vh",
  overflow: "auto",
  boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
};


