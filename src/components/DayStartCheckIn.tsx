"use client";

import React, { useState, useEffect, useMemo, useCallback, startTransition } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { toast } from './Toast';
import { track } from '../shared/track';
import { useCheckIn } from '../hooks/useCheckIn';
import { markOnboardingCompleted } from '@/lib/onboardingProfile';
import {
  addTaskToStorage,
  getTasksFromStorage,
  saveTasksToStorage,
  updateTaskInStorage,
} from '../lib/localStorageTasks';
import { setDagstartCookieOnClient } from '../lib/dagstartCookie';

function localDayStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Taak is voor een kalenderdag na vandaag (lokale tijd) — hoort niet in dagstart-suggesties voor vandaag. */
function isDueDateStrictlyAfterToday(dueAt: string | null | undefined): boolean {
  if (!dueAt) return false;
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return false;
  return localDayStart(due).getTime() > localDayStart(new Date()).getTime();
}

interface DayStartCheckInProps {
  onComplete: () => void;
  existingCheckIn?: any; // Bestaande check-in data om te bewerken (overschreven door useCheckIn)
  /** Eerste dagstart ooit: subtiele coachingregels tot eerste interactie / afronding */
  firstTimeOnboarding?: boolean;
}

export default function DayStartCheckIn({
  onComplete,
  existingCheckIn,
  firstTimeOnboarding = false,
}: DayStartCheckInProps) {
  const { tasks, addTask, fetchTasks, updateTask, loading: tasksContextLoading } = useTaskContext();
  const { checkIn: checkInFromDb, saveCheckIn } = useCheckIn();
  const [energyLevel, setEnergyLevel] = useState<string | null>(existingCheckIn?.energy_level ?? checkInFromDb?.energy_level ?? null);
  const [hoveredEnergyLevel, setHoveredEnergyLevel] = useState<string | null>(null);
  const [top3Tasks, setTop3Tasks] = useState<{ [key: number]: any }>({ 1: null, 2: null, 3: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentlyAdded, setRecentlyAdded] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [energySelected, setEnergySelected] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAddBusy, setQuickAddBusy] = useState(false);
  const [energyOnboardingHintHidden, setEnergyOnboardingHintHidden] = useState(false);

  const MAX_DAYSTART_SUGGESTIONS = 40;
  const COLLAPSED_SUGGESTIONS = 5;

  // Helper: Get energie kleur (GELIJK AAN TasksOverview)
  const getEnergyColor = (level: string) => {
    switch (level) {
      case 'low': return '#10B981'; // groen
      case 'medium': return '#F59E0B'; // oranje
      case 'high': return '#EF4444'; // rood
      default: return '#6B7280';
    }
  };

  // Bereken complexiteit (1-5) en geef kleurgecodeerde indicator terug
  const getTaskComplexity = (task: any): { level: number; color: string; label: string } => {
    let complexity = 2; // default medium
    
    // Basis op energy_level
    if (task.energyLevel === 'low') complexity = 1;
    else if (task.energyLevel === 'high') complexity = 4;
    else if (task.energyLevel === 'medium') complexity = 2;
    
    // Aanpassen op basis van duration
    if (task.duration) {
      if (task.duration <= 15) complexity = Math.max(1, complexity - 1);
      else if (task.duration > 60) complexity = Math.min(5, complexity + 1);
      else if (task.duration > 90) complexity = 5;
    }
    
    const level = Math.max(1, Math.min(5, complexity));
    
    // Kleurgecodeerde indicator - matcht met prioriteitszones voor intuïtieve mapping
    if (level <= 2) {
      return { level, color: '#10B981', label: 'Laag' }; // Groen - past bij lage energie
    } else if (level === 3) {
      return { level, color: '#F59E0B', label: 'Normaal' };
    } else {
      return { level, color: '#EF4444', label: 'Hoog' };
    }
  };

  const taskMatchesDayEnergy = (task: any, day: string | null) => {
    if (!day) return true;
    const te = String(task.energyLevel || '').toLowerCase();
    if (te === 'low' || te === 'medium' || te === 'high') return te === day;
    const { label } = getTaskComplexity(task);
    if (day === 'low') return label === 'Laag';
    if (day === 'medium') return label === 'Normaal';
    if (day === 'high') return label === 'Hoog';
    return false;
  };

  /** Suggesties voor dagstart: laag = alleen makkelijk; normaal = makkelijk + normaal; hoog = alles. */
  const suggestionTaskAllowedForDayEnergy = (task: any, day: string | null) => {
    if (!day) return true;
    if (day === 'high') return true;
    if (day === 'low') return taskMatchesDayEnergy(task, 'low');
    return taskMatchesDayEnergy(task, 'low') || taskMatchesDayEnergy(task, 'medium');
  };

  // Filter taken op basis van energie-niveau (PRIMAIR op energy_level veld)
  // BELANGRIJK: Dit is ALLEEN voor UI weergave - taken worden NOOIT verwijderd uit de data!
  const getFilteredTasks = () => {
    if (!energyLevel) return [];
    
    // Filter: toon alleen taken ZONDER prioriteit (1, 2, 3) - taken met prioriteit staan al in de slots
    // Gebruik expliciete checks: !task.priority || task.priority === 0 || task.priority > 3
    const inFocusIds = new Set(
      [1, 2, 3].map((n) => top3Tasks[n]?.id).filter(Boolean) as string[]
    );

    const baseTasks = tasks.filter((t: any) => {
      if (!t || !t.id || !t.title) return false;
      if (t.done || t.notToday || t.source === 'medication' || t.source === 'event') return false;
      if (isDueDateStrictlyAfterToday(t.dueAt)) return false;

      const hasPriority =
        t.priority != null && t.priority != 0 && (t.priority == 1 || t.priority == 2 || t.priority == 3);
      if (hasPriority && !inFocusIds.has(t.id)) return false;

      if (!suggestionTaskAllowedForDayEnergy(t, energyLevel)) return false;

      return true;
    });

    // Alle taken zijn altijd zichtbaar en selecteerbaar – alleen de volgorde hangt af van energie
    const withComplexity = baseTasks.map((t: any) => ({
      task: t,
      complexity: getTaskComplexity(t),
    }));

    if (energyLevel === 'low') {
      // Lage energie: makkelijke eerst, moeilijke onderaan (allemaal selecteerbaar)
      const sorted = withComplexity.sort((a: any, b: any) => {
        if (a.complexity.level !== b.complexity.level) {
          return a.complexity.level - b.complexity.level;
        }
        const durA = a.task.duration || a.task.estimatedDuration || 999;
        const durB = b.task.duration || b.task.estimatedDuration || 999;
        return durA - durB;
      });
      return sorted.map((item) => item.task).slice(0, MAX_DAYSTART_SUGGESTIONS);
    }

    if (energyLevel === 'high') {
      // Hoge energie: moeilijk eerst, dan makkelijk
      const sorted = withComplexity.sort((a: any, b: any) => {
        if (a.complexity.level !== b.complexity.level) {
          return b.complexity.level - a.complexity.level;
        }
        const durA = a.task.duration || a.task.estimatedDuration || 0;
        const durB = b.task.duration || b.task.estimatedDuration || 0;
        return durB - durA;
      });
      return sorted.map((item) => item.task).slice(0, MAX_DAYSTART_SUGGESTIONS);
    }

    // Medium: eerst medium (oranje/geel), dan makkelijk (groen), dan moeilijk (rood) – allemaal zichtbaar
    const sortOrder = (level: string) => (level === 'medium' || !level ? 0 : level === 'low' ? 1 : 2);
    const sorted = withComplexity.sort((a: any, b: any) => {
      const orderA = sortOrder(a.task.energyLevel || '');
      const orderB = sortOrder(b.task.energyLevel || '');
      if (orderA !== orderB) return orderA - orderB;
      const durA = a.task.duration || a.task.estimatedDuration || 999;
      const durB = b.task.duration || b.task.estimatedDuration || 999;
      return durA - durB;
    });
    return sorted.map((item) => item.task).slice(0, MAX_DAYSTART_SUGGESTIONS);
  };

  const allRankedSuggestions = useMemo(
    () => getFilteredTasks(),
    [tasks, top3Tasks, energyLevel]
  );

  const collapsedSuggestions = useMemo(() => {
    if (!energyLevel || allRankedSuggestions.length === 0) return [];
    const selIds = [1, 2, 3].map((n) => top3Tasks[n]?.id).filter(Boolean) as string[];
    const selectedFirst = selIds
      .map((id) => allRankedSuggestions.find((t) => t.id === id))
      .filter(Boolean) as any[];
    const rest = allRankedSuggestions.filter((t) => !selIds.includes(t.id));
    const merged = [...selectedFirst, ...rest];
    return merged.slice(0, COLLAPSED_SUGGESTIONS);
  }, [allRankedSuggestions, energyLevel, top3Tasks]);

  const suggestionsToRender = showAllSuggestions ? allRankedSuggestions : collapsedSuggestions;
  const hasMoreSuggestions =
    allRankedSuggestions.length > collapsedSuggestions.length;

  useEffect(() => {
    setShowAllSuggestions(false);
  }, [energyLevel]);

  // KRITIEK: Bereken max slots op basis van energie niveau
  const maxSlots = useMemo(() => {
    if (!energyLevel) return 3; // Default tot energie is gekozen
    if (energyLevel === 'low') return 1; // Alleen slot 1
    if (energyLevel === 'medium') return 2; // Slot 1 en 2
    return 3; // Alle slots bij high
  }, [energyLevel]);

  /** Minstens één bruikbare taak (dagstart stap 2); anders leeg-staat i.p.v. lege vakjes. */
  const hasUsableTasksForDayStart = useMemo(() => {
    return tasks.some((t: any) => {
      if (!t?.id || !String(t.title ?? '').trim()) return false;
      if (t.done || t.notToday) return false;
      if (t.source === 'medication' || t.source === 'event') return false;
      if (isDueDateStrictlyAfterToday(t.dueAt)) return false;
      return true;
    });
  }, [tasks]);

  const showNoTasksDayStart = !tasksContextLoading && !hasUsableTasksForDayStart;
  /** Stap 2: tijdens fetch geen lege vakjes/suggesties tonen (voorkomt flitsende misleidende UI). */
  const isStep2LoadingTasks = Boolean(energyLevel && tasksContextLoading);

  /** Zelfde regel als in de UI: slot telt alleen mee met bruikbare id + titel (niet alleen `!== null`). */
  const slotHasUsableTask = useCallback((slotNum: number) => {
    const t = top3Tasks[slotNum];
    return Boolean(
      t &&
        t.id != null &&
        String(t.id).trim() !== '' &&
        String(t.title ?? '').trim() !== ''
    );
  }, [top3Tasks]);

  // Tel hoeveel slots gevuld zijn - ALLEEN beschikbare slots tellen
  const filledSlots = useMemo(() => {
    if (!energyLevel) {
      return [1, 2, 3].filter((n) => slotHasUsableTask(n)).length;
    }
    if (energyLevel === 'low') {
      return slotHasUsableTask(1) ? 1 : 0;
    }
    if (energyLevel === 'medium') {
      return (slotHasUsableTask(1) ? 1 : 0) + (slotHasUsableTask(2) ? 1 : 0);
    }
    return [1, 2, 3].filter((n) => slotHasUsableTask(n)).length;
  }, [top3Tasks, energyLevel, slotHasUsableTask]);

  const getFirstAvailableSlotNumber = useCallback((): number | null => {
    if (!energyLevel) return null;
    for (let n = 1; n <= maxSlots; n++) {
      const isLowEnergy = energyLevel === 'low';
      const isMediumEnergy = energyLevel === 'medium';
      const shouldDisable = (isLowEnergy && n !== 1) || (isMediumEnergy && n === 3);
      if (shouldDisable) continue;
      if (!top3Tasks[n]) return n;
    }
    return null;
  }, [energyLevel, maxSlots, top3Tasks]);

  // Haal gebruikersnaam op bij mount (uit localStorage)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedName = localStorage.getItem('structuro_user_name');
      if (storedName) {
        setUserName(storedName.split(' ')[0]);
      }
    }
  }, []);

  // Haal bestaande prioriteiten op bij mount en bij wijzigingen
  const [isUpdating, setIsUpdating] = useState(false);
  const updateTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const hasInitializedRef = React.useRef(false);
  const userHasInteractedRef = React.useRef(false); // Track of gebruiker heeft gesleept
  const lastReplacedTaskRef = React.useRef<any>(null); // Taak die uit een slot is vervangen (voor terugzetten naar suggesties)

  // Sync energyLevel wanneer check-in uit DB/lokalStorage binnenkomt
  useEffect(() => {
    const source = checkInFromDb ?? existingCheckIn;
    if (source?.energy_level && energyLevel === null) {
      setEnergyLevel(source.energy_level);
    }
  }, [checkInFromDb?.energy_level, existingCheckIn?.energy_level]);

  // Laad bestaande check-in data bij mount (uit useCheckIn of existingCheckIn)
  useEffect(() => {
    const source = checkInFromDb ?? existingCheckIn;
    if (!source?.top3_task_ids?.length || hasInitializedRef.current) return;
      // Taken uit context (Supabase of localStorage)
      const allTasks = tasks;
      
      const slots: { [key: number]: any } = { 1: null, 2: null, 3: null };
      // KRITIEK: Zorg dat taskIds een array is
      let taskIds = source.top3_task_ids;
      if (!Array.isArray(taskIds)) {
        // Als het een string is (oude format), converteer naar array
        if (typeof taskIds === 'string') {
          try {
            taskIds = JSON.parse(taskIds);
          } catch {
            taskIds = [taskIds];
          }
        } else {
          taskIds = [];
        }
      }
      
      console.log('🔍 Loading existing check-in tasks:', taskIds, 'Type:', typeof taskIds, 'IsArray:', Array.isArray(taskIds));
      
      // Zoek taken op basis van IDs - eerst in localStorage, dan in tasks state
      taskIds.forEach((taskId: string, index: number) => {
        // Eerst zoeken in localStorage (volledige dataset)
        let task = allTasks.find((t: any) => t.id === taskId);
        
        // Als niet gevonden in localStorage, zoek in tasks state
        if (!task) {
          task = tasks.find((t: any) => t.id === taskId);
        }
        
        if (task) {
          // KRITIEK: Gebruik de volgorde in top3_task_ids array als slot nummer
          // Dit zorgt ervoor dat taken worden getoond in de juiste volgorde, zelfs als priority is gereset
          const slotNumber = index + 1; // 1, 2, of 3 op basis van volgorde in check-in
          
          // Als de taak nog een priority heeft die matcht, gebruik die (maar alleen als het klopt)
          // Anders gebruik de volgorde uit de check-in
          const finalSlotNumber = (task.priority && task.priority >= 1 && task.priority <= 3 && task.priority === slotNumber)
            ? task.priority 
            : slotNumber;
          
          if (finalSlotNumber >= 1 && finalSlotNumber <= 3) {
            // KRITIEK: Zet de priority expliciet terug als die ontbreekt, zodat de taak correct wordt getoond
            if (!task.priority || task.priority !== finalSlotNumber) {
              task = { ...task, priority: finalSlotNumber };
            }
            slots[finalSlotNumber] = task;
            console.log(`✅ Loaded task ${task.id} (${task.title}) into slot ${finalSlotNumber}`, {
              originalPriority: task.priority,
              slotNumber: finalSlotNumber,
              done: task.done
            });
          }
        } else {
          console.warn(`⚠️ Task ${taskId} not found in localStorage or tasks state`);
        }
      });
      
      // KRITIEK: Forceer re-render door state te updaten
      setTop3Tasks(slots);
      hasInitializedRef.current = true;
      console.log('✅ Loaded existing check-in:', slots);
      console.log('✅ top3Tasks state after set:', Object.keys(slots).map(k => ({ slot: k, task: slots[Number(k)]?.title || 'null' })));
      
      // KRITIEK: Trigger een re-render door fetchTasks aan te roepen
      // Dit zorgt ervoor dat de tasks array wordt geüpdatet en de UI wordt gerefresht
      fetchTasks().then(() => {
        console.log('✅ fetchTasks completed after loading existing check-in');
      });
  }, [checkInFromDb, existingCheckIn, tasks, fetchTasks]);
  
  // BELANGRIJK: Sync top3Tasks met tasks array ALLEEN bij eerste load
  // Zodra de gebruiker een taak heeft gesleept, is top3Tasks de bron van waarheid
  // en wordt deze useEffect NIET MEER uitgevoerd
  useEffect(() => {
    // Skip als:
    // 1. We aan het updaten zijn (tijdens drag & drop operatie)
    // 2. De gebruiker heeft geïnterageerd (gesleept) - dan is top3Tasks de bron van waarheid
    // 3. Er is al een bestaande check-in geladen (die wordt in een andere useEffect geladen)
    // 4. We al geïnitialiseerd zijn
    if (isUpdating || userHasInteractedRef.current || existingCheckIn || checkInFromDb || hasInitializedRef.current) {
      return;
    }
    
    // Filter taken met prioriteit 1, 2 of 3
    const top3 = tasks
      .filter((t: any) => 
        t && 
        t.id &&
        t.title &&
        t.priority != null && 
        t.priority >= 1 &&
        t.priority <= 3 && 
        !t.done && 
        !t.notToday && 
        t.source !== 'medication'
      )
      .sort((a: any, b: any) => a.priority - b.priority);
    
    // Vul slots op basis van priority - ELKE slot krijgt alleen taken met exact die priority
    const slots: { [key: number]: any } = { 1: null, 2: null, 3: null };
    top3.forEach((task) => {
      if (task && task.priority && task.priority >= 1 && task.priority <= 3 && task.id && task.title) {
        // Prioriteit 1 zone: alleen task.priority === 1
        if (task.priority === 1) slots[1] = task;
        // Prioriteit 2 zone: alleen task.priority === 2
        if (task.priority === 2) slots[2] = task;
        // Prioriteit 3 zone: alleen task.priority === 3
        if (task.priority === 3) slots[3] = task;
      }
    });
    
    // Update top3Tasks ALLEEN bij eerste load (als nog niet geïnitialiseerd)
    // Dit voorkomt dat we top3Tasks overschrijven tijdens de sessie
    const hasTasks = Object.values(slots).some(t => t !== null);
    if (hasTasks) {
      setTop3Tasks(slots);
      hasInitializedRef.current = true;
    }
  }, [tasks, isUpdating, existingCheckIn]);

  const handleDrop = async (slotNumber: number, taskToUse: any) => {
    if (!taskToUse || !taskToUse.id) {
      console.warn('No task in handleDrop');
      return;
    }

    try {
      // STAP 1: Markeer dat gebruiker heeft geïnterageerd - VOORDAT we iets doen
      // Dit voorkomt dat useEffect top3Tasks nog update vanuit tasks array
      userHasInteractedRef.current = true;
      
      // STAP 2: Markeer dat we een optimistic update doen - VOORDAT we iets doen
      // Dit voorkomt dat useEffect interfereert
      setIsUpdating(true);
      
      // STAP 3: BELANGRIJK - Optimistic update EERST (zodat oude taak direct uit top3Tasks wordt verwijderd)
      // Dit zorgt ervoor dat getFilteredTasks de oude taak direct kan zien in suggesties
      setTop3Tasks((prevTop3Tasks) => {
        const taskToRemove =
          prevTop3Tasks[slotNumber] && prevTop3Tasks[slotNumber].id !== taskToUse.id
            ? prevTop3Tasks[slotNumber]
            : null;
        lastReplacedTaskRef.current = taskToRemove;

        const newTop3Tasks: { [key: number]: any } = { 1: null, 2: null, 3: null };
        
        // Kopieer bestaande taken (behalve de gesleepte taak EN de taak die uit deze slot wordt verwijderd)
        [1, 2, 3].forEach(num => {
          const existingTask = prevTop3Tasks[num];
          if (existingTask && existingTask.id && existingTask.id !== taskToUse.id) {
            // Als dit de slot is waar we een nieuwe taak in zetten, skip de oude taak
            if (num === slotNumber && taskToRemove && existingTask.id === taskToRemove.id) {
              return; // Skip - deze taak wordt verwijderd
            }
            newTop3Tasks[num] = existingTask;
          }
        });
        
        // Zet gesleepte taak in nieuwe slot - BEHOUD ALLE VELDEN, update alleen priority
        const taskWithPriority = { 
          ...taskToUse, // Behoud ALLE bestaande velden (title, duration, energyLevel, etc.)
          priority: slotNumber // Update ALLEEN priority
        };
        newTop3Tasks[slotNumber] = taskWithPriority;
        
        return newTop3Tasks;
      });
      
      // STAP 4: Verwijder de oude taak uit localStorage (priority = null) zodat deze terugkomt in suggesties
      // BELANGRIJK: Dit gebeurt NA de optimistic update, zodat getFilteredTasks de taak direct kan zien
      const taskToRemove = lastReplacedTaskRef.current;
      if (taskToRemove) {
        console.log(`🔄 Removing existing task from slot ${slotNumber}: ${taskToRemove.id} (${taskToRemove.title})`);
        
        try {
          // Check of taak bestaat in localStorage
          const tasksInStorage = getTasksFromStorage();
          const taskExists = tasksInStorage.find((t: any) => t.id === taskToRemove.id);
          
          if (taskExists) {
            // KRITIEK: Verifieer dat de taak nog bestaat VOORDAT we updaten
            console.log(`🔍 VOOR UPDATE - Task details:`, {
              id: taskExists.id,
              title: taskExists.title,
              priority: taskExists.priority,
              energyLevel: taskExists.energyLevel,
              duration: taskExists.duration,
              estimatedDuration: taskExists.estimatedDuration
            });
            
            // KRITIEK: Gebruik duration uit taskToRemove (state) als die bestaat, anders uit taskExists (localStorage)
            // Dit voorkomt dat duration verloren gaat
            const preservedDuration = taskToRemove.duration || taskToRemove.estimatedDuration || taskExists.duration || taskExists.estimatedDuration || null;
            const preservedEstimatedDuration = taskToRemove.estimatedDuration || taskExists.estimatedDuration || null;
            
            // Zet priority expliciet op null zodat taak terugkomt in suggesties
            // BELANGRIJK: Behoud ALLE andere velden (title, energyLevel, duration, etc.)
            // Expliciet duration en estimatedDuration behouden
            const updatedTask = updateTaskInStorage(taskToRemove.id, { 
              priority: null,
              duration: preservedDuration,
              estimatedDuration: preservedEstimatedDuration
            });
            
            if (updatedTask) {
              console.log(`✅ Task ${taskToRemove.id} teruggezet naar suggesties (priority = null)`, {
                id: updatedTask.id,
                title: updatedTask.title,
                priority: updatedTask.priority,
                energyLevel: updatedTask.energyLevel,
                duration: updatedTask.duration,
                estimatedDuration: updatedTask.estimatedDuration
              });
              
              // KRITIEK: Verifieer dat de taak nog steeds bestaat in localStorage NA update
              const tasksAfterUpdate = getTasksFromStorage();
              const taskStillExists = tasksAfterUpdate.find((t: any) => t.id === taskToRemove.id);
              if (!taskStillExists) {
                console.error(`❌ KRITIEKE FOUT: Task ${taskToRemove.id} verdwenen na update!`);
                // Probeer de taak terug te zetten met alle originele velden
                const taskToRestore = {
                  ...taskExists,
                  priority: null,
                  updated_at: new Date().toISOString()
                };
                const allTasks = getTasksFromStorage();
                allTasks.push(taskToRestore);
                saveTasksToStorage(allTasks);
                console.log(`✅ Task ${taskToRemove.id} hersteld in localStorage`);
              }
              
              // Geen fetchTasks hier: één sync aan het eind van handleDrop voorkomt dubbele lijst-refresh en hapering.
            } else {
              console.error(`❌ updateTaskInStorage returned null voor task ${taskToRemove.id}`);
            }
          } else {
            console.warn(`⚠️ Task ${taskToRemove.id} niet gevonden in localStorage, wordt overgeslagen`);
          }
        } catch (error) {
          console.error(`❌ Error removing task from slot ${slotNumber}:`, error);
          // Ga door - optimistic update is al gedaan
        }
      }
      
      // STAP 5: Verwijder oude prioriteit van de gesleepte taak als die in een andere slot zat
      const oldSlot = Object.entries(top3Tasks).find(([_, task]) => task?.id === taskToUse.id)?.[0];
      if (oldSlot && oldSlot !== slotNumber.toString()) {
        console.log(`🔄 Removing dragged task from old slot ${oldSlot}`);
        
        try {
          const tasksInStorage = getTasksFromStorage();
          const taskExists = tasksInStorage.find((t: any) => t.id === taskToUse.id);
          
          if (taskExists) {
            // KRITIEK: Behoud duration en estimatedDuration expliciet
            const preservedDuration = taskToUse.duration || taskToUse.estimatedDuration || taskExists.duration || taskExists.estimatedDuration || null;
            const preservedEstimatedDuration = taskToUse.estimatedDuration || taskExists.estimatedDuration || null;
            
            updateTaskInStorage(taskToUse.id, { 
              priority: null,
              duration: preservedDuration,
              estimatedDuration: preservedEstimatedDuration
            });
          } else {
            console.warn(`⚠️ Dragged task ${taskToUse.id} niet gevonden in localStorage`);
          }
        } catch (error) {
          console.error(`❌ Error removing dragged task from old slot:`, error);
        }
      }

      // STAP 6: VERIFICATIE - controleer of taak bestaat in localStorage
      // (getTasksFromStorage, updateTaskInStorage en addTaskToStorage zijn al geïmporteerd in STAP 2.5)
      const tasksInStorage = getTasksFromStorage();
      const taskExists = tasksInStorage.find((t: any) => t.id === taskToUse.id);
      
      if (!taskExists) {
        // Taak kan uit Supabase komen (niet in localStorage) – voeg lokaal toe zodat priority overal synct
        const taskToAdd = {
          id: taskToUse.id,
          title: taskToUse.title,
          done: false,
          started: false,
          priority: slotNumber,
          dueAt: taskToUse.dueAt || null,
          duration: taskToUse.duration || null,
          source: taskToUse.source || 'regular',
          completedAt: null,
          reminders: taskToUse.reminders || [],
          repeat: taskToUse.repeat || 'none',
          impact: taskToUse.impact || '🌱',
          energyLevel: taskToUse.energyLevel || 'medium',
          estimatedDuration: taskToUse.estimatedDuration || null,
          microSteps: taskToUse.microSteps || [],
          notToday: false,
          created_at: taskToUse.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        addTaskToStorage(taskToAdd);
        console.log('✅ Task added to localStorage:', taskToAdd);
      } else {
        console.log('✅ Task exists in localStorage, updating priority');
      }
      
      // STAP 7: Zet nieuwe prioriteit - gebruik updateTask(taskId, { priority: slotNumber })
      // BELANGRIJK: Dit update ALLEEN priority, alle andere velden (zoals energyLevel) blijven behouden
      // KRITIEK: Behoud energyLevel expliciet om te voorkomen dat deze verloren gaat
      const preservedEnergyLevel = taskToUse.energyLevel || 'medium';
      console.log(`🔄 DayStart: Updating task ${taskToUse.id} with priority ${slotNumber}, energyLevel: ${preservedEnergyLevel}`);
      await updateTask(taskToUse.id, { 
        priority: slotNumber,
        energyLevel: preservedEnergyLevel // Expliciet behouden
      });
      
      // STAP 8: VERIFICATIE - controleer of taak correct is opgeslagen
      const tasksAfterUpdate = getTasksFromStorage();
      const updatedTask = tasksAfterUpdate.find((t: any) => t.id === taskToUse.id);
      console.log('🔍 DayStart: Task after update in localStorage:', updatedTask ? {
        id: updatedTask.id,
        title: updatedTask.title,
        priority: updatedTask.priority,
        energyLevel: updatedTask.energyLevel
      } : 'NOT FOUND');
      
      // BELANGRIJK: Trigger expliciet een sync event zodat andere pagina's direct updaten
      // Dit zorgt ervoor dat TasksOverview en Focus Mode direct de nieuwe priority zien
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('structuro_tasks_updated'));
        console.log('🔄 DayStart: Sync event triggered');
      }
      
      // Eén fetch na paint: minder flitsen dan meerdere updates + sleeps.
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
      await fetchTasks();

      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      startTransition(() => {
        setIsUpdating(false);
      });

      setRecentlyAdded(taskToUse.id);
      setTimeout(() => setRecentlyAdded(null), 650);


    } catch (error) {
      console.error('❌ Error in handleDrop:', error);
      toast('Fout bij toevoegen van taak. Probeer het opnieuw.');
      
      // KRITIEK: Herstel state bij error - haal taken opnieuw op zodat niets verloren gaat
      try {
        await fetchTasks();
        
        // Herstel top3Tasks uit localStorage om te voorkomen dat taken verdwijnen
        const allTasks = getTasksFromStorage();
        const restoredTop3Tasks: { [key: number]: any } = { 1: null, 2: null, 3: null };
        
        for (let i = 1; i <= 3; i++) {
          const task = allTasks.find((t: any) => t.priority == i);
          if (task) {
            restoredTop3Tasks[i] = task;
          }
        }
        
        setTop3Tasks(restoredTop3Tasks);
        console.log('✅ State hersteld na error in handleDrop');
      } catch (restoreError) {
        console.error('❌ Error restoring state:', restoreError);
      }
      
      setIsUpdating(false);
    }
  };

  const assignTaskToFirstSlot = async (task: any) => {
    const slot = getFirstAvailableSlotNumber();
    if (slot == null) {
      toast('Alle focusplekken zijn al gevuld');
      return;
    }
    await handleDrop(slot, task);
  };

  const handleQuickAddSubmit = async () => {
    const trimmed = quickAddTitle.trim();
    if (!trimmed || quickAddBusy || !energyLevel) return;
    setQuickAddBusy(true);
    try {
      const created = await addTask({
        title: trimmed,
        done: false,
        started: false,
        priority: null,
        dueAt: null,
        duration: 15,
        source: 'regular',
        reminders: [],
        repeat: 'none',
        impact: '🌱',
        energyLevel,
        estimatedDuration: null,
        microSteps: [],
        notToday: false,
      });
      setQuickAddTitle('');
      const slot = getFirstAvailableSlotNumber();
      if (slot != null) {
        await handleDrop(slot, created);
      }
    } catch (e) {
      console.error('quick add daystart:', e);
      toast('Kon taak niet toevoegen');
    } finally {
      setQuickAddBusy(false);
    }
  };

  const handleRemoveFromSlot = async (slotNumber: number) => {
    const task = top3Tasks[slotNumber];

    if (!task || !task.id) {
      console.warn('No task to remove from slot', slotNumber);
      return;
    }

    try {
      // Eerst: slot leegmaken (optimistic) zodat de taak direct uit het vak verdwijnt
      const newTop3Tasks: { [key: number]: any } = { ...top3Tasks };
      newTop3Tasks[slotNumber] = null;
      setTop3Tasks(newTop3Tasks);
      setIsUpdating(true);

      // Context + Supabase: prioriteit op null zetten – dan komt de taak terug in suggesties
      await updateTask(task.id, { priority: null });

      // Ook localStorage bijwerken als de taak daar in staat (sync met lokaal)
      const tasksInStorage = getTasksFromStorage();
      const taskExists = tasksInStorage.find((t: any) => t.id === task.id);
      if (taskExists) {
        const preservedDuration = task.duration ?? task.estimatedDuration ?? taskExists.duration ?? taskExists.estimatedDuration ?? null;
        const preservedEstimatedDuration = task.estimatedDuration ?? taskExists.estimatedDuration ?? null;
        updateTaskInStorage(task.id, {
          priority: null,
          duration: preservedDuration,
          estimatedDuration: preservedEstimatedDuration,
        });
      }

      // Refresh zodat suggestielijst de taak weer toont
      await fetchTasks();

      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      updateTimeoutRef.current = setTimeout(() => {
        setIsUpdating(false);
        updateTimeoutRef.current = null;
      }, 500);
    } catch (error) {
      console.error('❌ Error in handleRemoveFromSlot:', error);
      toast('Fout bij verwijderen van prioriteit. Probeer het opnieuw.');
      // Herstel state bij error
      try {
        await fetchTasks();
      } catch (restoreError) {
        console.error('❌ Error restoring state:', restoreError);
      }
    }
  };

  const top3TasksRef = React.useRef(top3Tasks);
  top3TasksRef.current = top3Tasks;

  /** Verberg slots buiten max (energie): ruim state + DB op. Geen async-run bij elke klik als er geen overflow is. */
  useEffect(() => {
    if (!energyLevel) return;
    const max = energyLevel === 'low' ? 1 : energyLevel === 'medium' ? 2 : 3;
    let hasOverflow = false;
    for (let n = max + 1; n <= 3; n++) {
      if (top3Tasks[n]?.id) {
        hasOverflow = true;
        break;
      }
    }
    if (!hasOverflow) return;

    let cancelled = false;
    (async () => {
      for (let slotNum = 3; slotNum > max; slotNum--) {
        if (cancelled) break;
        if (top3TasksRef.current[slotNum]?.id) {
          await handleRemoveFromSlot(slotNum);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [energyLevel, top3Tasks[1]?.id, top3Tasks[2]?.id, top3Tasks[3]?.id]);

  const handleSubmit = async () => {
    if (!energyLevel) {
      toast('Kies eerst je energie niveau');
      return;
    }

    if (filledSlots === 0) {
      toast('Kies minimaal 1 focuspunt om door te gaan');
      return;
    }

    const submitMaxSlots = energyLevel === 'low' ? 1 : energyLevel === 'medium' ? 2 : 3;

    setIsSubmitting(true);

    const withTimeout = <T,>(promise: Promise<T>, ms: number, message: string): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error(message)), ms)
        ),
      ]);

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Eerst: VERIFICATIE - controleer of taken bestaan in localStorage
      const tasksBeforeUpdate = getTasksFromStorage();
      
      console.log('🔍 VOOR UPDATE - Taken in localStorage:', tasksBeforeUpdate.length);
      console.log('🔍 VOOR UPDATE - Top3Tasks state:', top3Tasks);
      console.log('🔍 VOOR UPDATE - Top3 tasks entries:', Object.entries(top3Tasks));
      
      // KRITIEK: Als top3Tasks leeg is, probeer taken uit localStorage te halen met priority 1-3
      let tasksToProcess: { [key: number]: any } = { ...top3Tasks };
      for (let n = submitMaxSlots + 1; n <= 3; n++) {
        tasksToProcess[n] = null;
      }

      // Check of top3Tasks leeg is
      const hasTasksInState = Object.values(top3Tasks).some(t => t !== null && t !== undefined);
      
      if (!hasTasksInState && tasksBeforeUpdate.length > 0) {
        console.warn('⚠️ top3Tasks is leeg, probeer taken uit localStorage te halen met priority 1-3');
        // Haal taken uit localStorage met priority 1-3
        const tasksWithPriority = tasksBeforeUpdate.filter((t: any) => {
          const priorityNum = Number(t.priority);
          return !isNaN(priorityNum) && priorityNum >= 1 && priorityNum <= 3;
        });
        
        // Vul tasksToProcess met taken uit localStorage
        tasksWithPriority.forEach((task: any) => {
          const priorityNum = Number(task.priority);
          if (priorityNum >= 1 && priorityNum <= submitMaxSlots) {
            tasksToProcess[priorityNum] = task;
          }
        });
        
        console.log('🔍 Herstelde tasksToProcess uit localStorage:', tasksToProcess);
      }
      
      // KRITIEK: Filter null values en check dat we alleen task IDs hebben, geen slot numbers
      const top3Ids = Object.entries(tasksToProcess)
        .filter(([slotKey]) => {
          const slot = parseInt(slotKey, 10);
          return !isNaN(slot) && slot >= 1 && slot <= submitMaxSlots;
        })
        .map(([, t]) => t)
        .filter((t: any) => {
          if (!t || typeof t !== 'object') return false;
          const idStr = t.id != null ? String(t.id).trim() : '';
          if (!idStr) return false;
          if (/^[1-3]$/.test(idStr)) return false;
          return true;
        })
        .map((t: any) => String(t.id).trim());
      
      console.log('[DayStart] Top3 task IDs:', top3Ids);

      if (top3Ids.length === 0 && filledSlots > 0) {
        toast('Je focus kon niet worden gelezen. Kies de taken opnieuw of vernieuw de pagina.');
        return;
      }
      
      // Check of alle taken bestaan - als ze niet bestaan, voeg ze toe
      const missingTasks = top3Ids.filter(
        (id) => !tasksBeforeUpdate.find((t: any) => String(t.id) === id)
      );
      if (missingTasks.length > 0) {
        console.warn('⚠️ MISSING TASKS in localStorage, voeg ze toe:', missingTasks);
        
        // Voeg ontbrekende taken toe aan localStorage via directe manipulatie
        // KRITIEK: Gebruik saveTasksToStorage in plaats van addTaskToStorage om bestaande IDs te behouden
        const tasksToAdd: any[] = [];
        
        for (const missingId of missingTasks) {
          const taskInState = Object.values(tasksToProcess).find((t: any) => t && t.id === missingId);
          if (taskInState) {
            // Vind de slot number voor deze taak
            const slotEntry = Object.entries(tasksToProcess).find(([_, task]: any) => task && task.id === missingId);
            const slotNumber = slotEntry ? parseInt(String(slotEntry[0]), 10) : null;
            
            // KRITIEK: Behoud de bestaande ID - maak een volledige LocalTask
            const taskToAdd: any = {
              id: taskInState.id, // Behoud bestaande ID
              title: taskInState.title || 'Untitled Task',
              done: false,
              started: false,
              priority: slotNumber || taskInState.priority || null,
              dueAt: taskInState.dueAt || null,
              duration: taskInState.duration || null,
              source: taskInState.source || 'regular',
              completedAt: null,
              reminders: taskInState.reminders || [],
              repeat: taskInState.repeat || 'none',
              impact: taskInState.impact || '🌱',
              energyLevel: taskInState.energyLevel || 'medium',
              estimatedDuration: taskInState.estimatedDuration || null,
              microSteps: taskInState.microSteps || [],
              notToday: false,
              created_at: taskInState.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            tasksToAdd.push(taskToAdd);
            console.log('📝 Preparing to add missing task:', taskToAdd.id, taskToAdd.title);
          }
        }
        
        // Voeg alle ontbrekende taken toe via directe localStorage manipulatie
        if (tasksToAdd.length > 0) {
          try {
            const currentTasks = getTasksFromStorage();
            // Filter duplicaten (als een taak al bestaat, skip)
            const newTasks = tasksToAdd.filter(newTask => 
              !currentTasks.find((existing: any) => existing.id === newTask.id)
            );
            
            if (newTasks.length > 0) {
              const allTasksCombined = [...currentTasks, ...newTasks];
              saveTasksToStorage(allTasksCombined);
              console.log('✅ Added', newTasks.length, 'missing tasks to localStorage');
            } else {
              console.log('ℹ️ All tasks already exist in localStorage');
            }
          } catch (error) {
            console.error('❌ Error adding missing tasks to localStorage:', error);
            // Ga door - misschien bestaan de taken al
          }
        }
        
        // Herlaad taken na toevoegen
        const tasksAfterAdd = getTasksFromStorage();
        const stillMissing = missingTasks.filter(id => !tasksAfterAdd.find((t: any) => t.id === id));
        
        if (stillMissing.length > 0) {
          console.warn('⚠️ Kon sommige ontbrekende taken niet toevoegen:', stillMissing);
          console.warn('⚠️ Maar we gaan door met de beschikbare taken');
          // Filter top3Ids om alleen bestaande taken te gebruiken
          const existingTop3Ids = top3Ids.filter(id => tasksAfterAdd.find((t: any) => t.id === id));
          console.log('🔍 Using only existing tasks:', existingTop3Ids);
          // Update top3Ids om alleen bestaande taken te gebruiken
          top3Ids.length = 0;
          top3Ids.push(...existingTop3Ids);
        }
      }
      
      // KRITIEK: DIRECTE OPSLAG in localStorage - dit is de ENIGE manier om zeker te zijn dat taken blijven bestaan
      // Gebruik NIET updateTask omdat die async is en race conditions kan veroorzaken
      const allTasks = getTasksFromStorage();
      
      console.log('🔍 handleSubmit: Starting direct save. Total tasks in storage:', allTasks.length);
      console.log('🔍 handleSubmit: Top3 tasks to save:', top3Ids);
      
      // KRITIEK: Debug - toon top3Tasks met ALLE details
      console.log('🔍 handleSubmit: top3Tasks FULL:', top3Tasks);
      console.log('🔍 handleSubmit: top3Tasks entries:', Object.entries(top3Tasks).map(([slot, task]: any) => ({
        slot,
        slotType: typeof slot,
        taskId: task?.id,
        taskTitle: task?.title,
        taskPriority: task?.priority,
        taskPriorityType: typeof task?.priority,
        taskFull: task
      })));
      
      // KRITIEK: Check specifiek slot 1
      console.log('🔍 handleSubmit: top3Tasks[1] specifically:', {
        exists: top3Tasks[1] !== null && top3Tasks[1] !== undefined,
        task: top3Tasks[1],
        taskId: top3Tasks[1]?.id,
        taskTitle: top3Tasks[1]?.title
      });
      
      // DIRECTE UPDATE: Update elke taak direct in de array
      // Gebruik tasksToProcess in plaats van top3Tasks (kan leeg zijn)
      const updatedTasks = allTasks.map((t: any) => {
        // Zoek of deze taak in tasksToProcess staat
        const top3Entry = Object.entries(tasksToProcess).find(([_, task]: any) => task && task.id === t.id);
        
        // DEBUG: Log elke taak die we checken
        if (top3Entry) {
          console.log(`🔍 Checking task ${t.id} (${t.title}) - FOUND in top3Tasks at slot ${top3Entry[0]}`);
        }
        
        if (top3Entry) {
          const [slotNumber, taskFromState] = top3Entry;
          // KRITIEK: Forceer integer met parseInt(value, 10) - NUCLEAIRE fix
          const priorityStr = String(slotNumber);
          const priority = parseInt(priorityStr, 10);
          
          // KRITIEK: Verifieer dat priority een geldig nummer is
          if (isNaN(priority) || priority < 1 || priority > 3) {
            console.error(`❌ INVALID PRIORITY: slotNumber=${slotNumber}, priority=${priority}`);
            return t; // Return unchanged if invalid
          }
          
          console.log(`📝 DIRECT SAVE: Task ${t.id} (${t.title}) -> priority ${priority} (integer)`);
          console.log(`📝 EnergyLevel check: t.energyLevel=${t.energyLevel}, taskFromState.energyLevel=${taskFromState?.energyLevel}`);
          
          // KRITIEK: Gebruik energyLevel uit taskFromState (state) als die bestaat, anders uit t (localStorage)
          // Dit voorkomt dat energyLevel verloren gaat
          const preservedEnergyLevel = taskFromState?.energyLevel || t.energyLevel || 'medium';
          const preservedDuration = taskFromState?.duration || t.duration || null;
          
          // Behoud ALLE bestaande velden, update alleen priority, notToday en done
          // KRITIEK: Forceer integer met parseInt
          const updated = {
            ...t, // Behoud ALLES (title, duration, etc.)
            energyLevel: preservedEnergyLevel, // Behoud energyLevel expliciet
            duration: preservedDuration, // Behoud duration expliciet
            priority: priority, // ALTIJD integer
            notToday: false,
            done: false,
            updated_at: new Date().toISOString()
          };
          
          console.log(`✅ Updated task priority: ${updated.priority} (type: ${typeof updated.priority}), energyLevel: ${updated.energyLevel}, duration: ${updated.duration}`);
          return updated;
        }
        
        // Als taak NIET in top3Tasks staat maar WEL een priority 1-3 heeft, reset priority
        // Dit voorkomt dat oude prioriteiten blijven staan
        if (t.priority && t.priority >= 1 && t.priority <= 3 && !top3Ids.includes(t.id)) {
          console.log(`🔄 RESET: Task ${t.id} (${t.title}) priority ${t.priority} -> null (niet meer in top3)`);
          return {
            ...t,
            priority: null,
            updated_at: new Date().toISOString()
          };
        }
        
        return t;
      });
      
      // Voeg taken toe die nog niet bestaan (fallback)
      // Gebruik tasksToProcess in plaats van top3Tasks
      for (const [slotNumber, task] of Object.entries(tasksToProcess)) {
        if (task && task.id) {
          const exists = updatedTasks.find((t: any) => t.id === task.id);
          if (!exists) {
            // KRITIEK: Forceer integer met parseInt(value, 10) - NUCLEAIRE fix
            const priorityStr = String(slotNumber);
            const priority = parseInt(priorityStr, 10);
            console.log(`➕ ADD MISSING: Task ${task.id} (${task.title}) -> priority ${priority} (integer)`);
            updatedTasks.push({
              id: task.id,
              title: task.title || 'Untitled Task',
              done: false,
              started: false,
              priority: priority, // ALTIJD integer
              dueAt: task.dueAt || null,
              duration: task.duration || null,
              source: task.source || 'regular',
              completedAt: null,
              reminders: task.reminders || [],
              repeat: task.repeat || 'none',
              impact: task.impact || '🌱',
              energyLevel: task.energyLevel || 'medium',
              estimatedDuration: task.estimatedDuration || null,
              microSteps: task.microSteps || [],
              notToday: false,
              created_at: task.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          }
        }
      }
      
      // SLA DIRECT OP - dit is synchroon en gegarandeerd
      saveTasksToStorage(updatedTasks);
      console.log('💾 DIRECT SAVE COMPLETE: Saved', updatedTasks.length, 'tasks to localStorage');
      
      // VERIFICATIE: Controleer DIRECT of taken correct zijn opgeslagen
      const tasksAfterSave = getTasksFromStorage();
      const tasksWithPriority = tasksAfterSave.filter((t: any) => {
        if (!t.priority) return false;
        // KRITIEK: Gebruik losse vergelijking (==) voor type-flexibiliteit
        return t.priority == 1 || t.priority == 2 || t.priority == 3;
      });
      
      // KRITIEK: Check specifiek voor priority 1 (gebruik losse vergelijking ==)
      const priority1Task = tasksAfterSave.find((t: any) => {
        return t.priority == 1; // Losse vergelijking vangt "1" == 1 op
      });
      const priority1TaskStrict = tasksAfterSave.find((t: any) => t.priority === 1 && typeof t.priority === 'number');
      
      console.log('✅ VERIFICATION: Tasks in localStorage:', tasksAfterSave.length);
      console.log('✅ VERIFICATION: Tasks with priority 1-3:', tasksWithPriority.map((t: any) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        priorityType: typeof t.priority,
        energyLevel: t.energyLevel
      })));
      console.log('🔍 VERIFICATION: Priority 1 task (loose):', priority1Task ? {
        id: priority1Task.id,
        title: priority1Task.title,
        priority: priority1Task.priority,
        priorityType: typeof priority1Task.priority
      } : 'NOT FOUND');
      console.log('🔍 VERIFICATION: Priority 1 task (strict number):', priority1TaskStrict ? {
        id: priority1TaskStrict.id,
        title: priority1TaskStrict.title,
        priority: priority1TaskStrict.priority
      } : 'NOT FOUND');
      
      // Toon ALLE taken met hun priority voor debugging
      console.log('🔍 VERIFICATION: ALL tasks with their priorities:', tasksAfterSave.map((t: any) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        priorityType: typeof t.priority
      })));
      
      // Check of alle taken nog steeds bestaan
      const stillMissing = top3Ids.filter(
        (id) => !tasksAfterSave.find((t: any) => String(t.id) === String(id))
      );
      if (stillMissing.length > 0) {
        console.error('❌ KRITIEKE FOUT: Taken verdwenen na directe opslag:', stillMissing);
        toast(`Fout: ${stillMissing.length} ta(a)k(en) verdwenen na opslaan`);
        return;
      }
      
      // Wacht even zodat localStorage volledig is doorgevoerd
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Haal taken opnieuw op via fetchTasks om state te synchroniseren
      await fetchTasks();
      
      // Wacht nog even zodat fetchTasks volledig is doorgevoerd
      await new Promise(resolve => setTimeout(resolve, 200));

      // Sla check-in op (Supabase bij ingelogde user, anders localStorage) — met timeout tegen eeuwig hangen
      await withTimeout(
        saveCheckIn({
          energy_level: energyLevel,
          top3_task_ids: top3Ids.length > 0 ? top3Ids : null,
        }),
        25_000,
        'Opslaan duurt te lang. Controleer je verbinding en probeer opnieuw.'
      );

      setDagstartCookieOnClient();

      // BELANGRIJK: Trigger expliciet een sync event zodat alle pagina's direct updaten
      // Dit zorgt ervoor dat TasksOverview en Focus Mode direct de nieuwe prioriteiten zien
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('structuro_tasks_updated'));
        console.log('🔄 DayStart: Final sync event triggered');
      }

      // Pas dagindeling aan op basis van energie
      if (energyLevel === 'low') {
        toast('💚 Rustige dag vandaag - focus op kleine taken');
      } else if (energyLevel === 'high') {
        toast('⚡ Hoge energie! Perfect voor uitdagende taken');
      } else {
        toast('🙂 Goede balans vandaag');
      }

      track('day_start_checkin', { energyLevel, top3Count: filledSlots });
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('structuro_tasks_updated'));
      }

      if (firstTimeOnboarding) {
        await markOnboardingCompleted();
      }

      onComplete();
      
    } catch (error: any) {
      console.error('Error saving check-in:', error);
      toast(`Fout bij opslaan: ${error?.message || 'Onbekende fout'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const energyLevels = [
    { emoji: "😴", label: "Laag", value: "low", description: "Rustige taken vandaag", hoverClass: "hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700", activeClass: "bg-blue-50 border-blue-200 text-blue-700" },
    { emoji: "🙂", label: "Normaal", value: "medium", description: "Gewone taken", hoverClass: "hover:bg-green-50 hover:border-green-200 hover:text-green-700", activeClass: "bg-green-50 border-green-200 text-green-700" },
    { emoji: "⚡", label: "Hoog", value: "high", description: "Uitdagende taken", hoverClass: "hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700", activeClass: "bg-orange-50 border-orange-200 text-orange-700" }
  ];

  const getEnergyIntensity = (value: string) => {
    if (value === 'low') return 1;
    if (value === 'medium') return 2;
    return 3;
  };

  const slotConfig = [
    { number: 1, label: "KERNFOCUS", description: "De absolute basislijn voor vandaag", color: "#3B82F6", bgColor: "#EFF6FF", borderColor: "#BFDBFE" },
    { number: 2, label: "VERVOLGSTAP", description: "Zodra de motor draait", color: "#14B8A6", bgColor: "#F0FDFA", borderColor: "#99F6E4" },
    { number: 3, label: "BONUSACTIE", description: "Beschikbaar bij hoge energie", color: "#8B5CF6", bgColor: "#F5F3FF", borderColor: "#DDD6FE" }
  ];

  // Als energie nog niet is gekozen, toon alleen energie-selectie
  if (!energyLevel) {
    return (
      <div className="w-full max-w-xl mx-auto bg-white rounded-3xl shadow-sm p-5 sm:p-6 mb-4 border border-gray-100">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full w-1/2 rounded-full bg-amber-300/80 transition-all duration-300" />
          </div>
          <span className="text-xs font-medium text-gray-400 flex-shrink-0 tabular-nums">Stap 1 van 2</span>
        </div>

        <div className="space-y-4">
          <div className="text-center space-y-1.5">
            <h2 className="text-xl font-bold text-gray-900">
              {userName ? `Hoe zit je vandaag qua energie, ${userName}?` : existingCheckIn ? 'Pas je energie aan' : 'Hoe zit je vandaag qua energie?'}
            </h2>
            <p className="text-sm text-gray-500 max-w-xs mx-auto text-balance leading-relaxed">
              Op basis van je energie kiezen we de juiste taken om je dag soepel te starten
            </p>
          </div>

          {firstTimeOnboarding && !energyOnboardingHintHidden ? (
            <p className="text-sm text-gray-500 text-center max-w-xs mx-auto leading-snug text-balance">
              Kies hoe je je vandaag voelt. De app kiest mee.
            </p>
          ) : null}

          <div className="grid grid-cols-3 gap-3 w-full">
            {energyLevels.map((level) => (
              <button
                key={level.value}
                onClick={() => {
                  if (firstTimeOnboarding) setEnergyOnboardingHintHidden(true);
                  setEnergyLevel(level.value);
                  setEnergySelected(true);
                  setShowConfirmation(true);
                  const messages: { [key: string]: string } = {
                    low: '😴 Tijd voor een rustige start',
                    medium: '🙂 Goede balans vandaag',
                    high: '⚡ Energie geladen!'
                  };
                  toast(messages[level.value] || 'Energie gekozen');
                  setTimeout(() => setEnergySelected(false), 1000);
                  setTimeout(() => setShowConfirmation(false), 2000);
                }}
                className={`rounded-2xl flex flex-col items-center justify-center p-3 sm:p-4 min-h-[120px] sm:min-h-[140px] border-2 transition-all duration-300 ${
                  energyLevel === level.value ? level.activeClass : `bg-gray-50 border-transparent ${level.hoverClass}`
                } ${energySelected && energyLevel === level.value ? 'scale-[1.02]' : 'scale-100'}`}
                onMouseEnter={() => setHoveredEnergyLevel(level.value)}
                onMouseLeave={() => setHoveredEnergyLevel(null)}
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/80 flex items-center justify-center shadow-sm mb-1.5">
                  <span className="text-3xl sm:text-4xl">{level.emoji}</span>
                </div>
                <div className="flex flex-col items-center gap-0.5 text-center">
                  <span className={`text-base sm:text-lg font-bold ${energyLevel === level.value ? '' : 'text-gray-900'}`}>{level.label}</span>
                  <span className="text-[10px] sm:text-xs text-gray-500">{level.description}</span>
                </div>
              </button>
            ))}
          </div>

          {showConfirmation && energyLevel && (
            <p className="text-center text-sm text-blue-600/90 transition-opacity duration-300">
              ✔️ Helder. We stemmen je dag hierop af.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Als energie is gekozen, toon de taken-selectie
  const energyInfo = energyLevels.find((l) => l.value === energyLevel);
  const focusTaskIds = new Set(
    [1, 2, 3]
      .filter((n) => n <= maxSlots)
      .map((n) => top3Tasks[n]?.id)
      .filter(Boolean) as string[]
  );

  const visibleFocusSlots = slotConfig.filter((s) => s.number <= maxSlots);

  return (
    <div className="w-full max-w-xl mx-auto rounded-3xl bg-white text-gray-900 shadow-sm border border-gray-100 p-4 sm:p-6 mb-4 [contain:layout]">
      <div className="min-w-0">
      {/* Energie: motiverende feedback na keuze */}
      <div className="mb-4 rounded-2xl p-3 sm:p-4" style={{ backgroundColor: `${energyInfo?.value === 'low' ? '#EFF6FF' : energyInfo?.value === 'high' ? '#F0FDF4' : '#FFFBEB'}` }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="text-2xl leading-none mt-0.5" aria-hidden>
              {energyInfo?.emoji}
            </span>
            <div>
              <p className="text-sm font-bold text-gray-900">
                {energyLevel === 'low' && 'Rustig aan vandaag, en dat is helemaal prima.'}
                {energyLevel === 'medium' && 'Lekker stabiel vandaag. Goed moment om focus te pakken.'}
                {energyLevel === 'high' && 'Je knalt vandaag de dag door met hoge energie!'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {energyLevel === 'low' && 'We houden het licht: 1 focuspunt.'}
                {energyLevel === 'medium' && 'Mooie balans: 2 focuspunten.'}
                {energyLevel === 'high' && 'Volle kracht vooruit: 3 focuspunten.'}
              </p>
              {isStep2LoadingTasks ? (
                <span className="text-xs text-gray-400 mt-1 block">Taken laden…</span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEnergyLevel(null)}
            className="shrink-0 text-xs text-gray-500 hover:text-gray-900 underline underline-offset-2 mt-0.5"
          >
            Wijzigen
          </button>
        </div>
      </div>

      {/* Jouw focuspunten per slot (aantal afhankelijk van energie) */}
      <div className="mb-4">
        {firstTimeOnboarding && filledSlots === 0 ? (
          <p className="text-sm text-gray-500 mb-3 leading-snug">
            Tik één taak aan om te beginnen.
          </p>
        ) : null}
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-3">
          Jouw focuspunten
        </p>
        <div className="flex flex-col gap-3">
          {visibleFocusSlots.map((slot) => {
            const task = top3Tasks[slot.number];
            const hasTask = Boolean(task?.id && task?.title);

            return (
              <div
                key={slot.number}
                className="rounded-2xl border-[1.5px] border-dashed border-gray-200 bg-white px-3 py-3 sm:px-4 sm:py-4"
              >
                {hasTask ? (
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm"
                      style={{ backgroundColor: slot.color }}
                    >
                      {slot.number}
                    </div>
                    <div className="min-w-0 flex-1 flex h-10 items-center gap-2 rounded-lg border border-gray-200/90 border-l-[3px] border-l-[#3B82F6] bg-[#EFF6FF] px-3 text-sm text-gray-900">
                      <span className="min-w-0 flex-1 truncate font-medium">{task.title}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromSlot(slot.number)}
                        className="shrink-0 flex h-8 w-8 items-center justify-center rounded-md text-lg leading-none text-gray-600 opacity-80 hover:opacity-100 hover:bg-black/5"
                        aria-label="Verwijder uit focus"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm"
                        style={{ backgroundColor: slot.color }}
                      >
                        {slot.number}
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="text-sm font-bold uppercase tracking-wide text-gray-900">{slot.label}</p>
                        <p className="text-xs text-gray-600 mt-0.5 leading-snug">{slot.description}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-center text-sm text-gray-500">Selecteer een taak hieronder</p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Taak toevoegen */}
      <div className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
          Taak toevoegen
        </p>
        <div className="flex gap-2 items-stretch">
          <input
            type="text"
            value={quickAddTitle}
            onChange={(e) => setQuickAddTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleQuickAddSubmit();
              }
            }}
            placeholder="Nieuwe taak voor vandaag..."
            className="flex-1 min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
          />
          <button
            type="button"
            onClick={handleQuickAddSubmit}
            disabled={quickAddBusy || !quickAddTitle.trim() || !energyLevel}
            className="shrink-0 h-10 w-10 rounded-lg bg-gray-900 text-white text-lg font-light leading-none hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Taak toevoegen"
          >
            +
          </button>
        </div>
      </div>

      {showNoTasksDayStart && !isStep2LoadingTasks && (
        <p className="text-sm text-gray-600 mb-4">Je hebt nog geen taken. Voeg er hierboven één toe.</p>
      )}

      {/* Suggesties voor vandaag */}
      {isStep2LoadingTasks ? (
        <p className="text-sm text-gray-500 mb-6">Taken laden…</p>
      ) : !showNoTasksDayStart ? (
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
            Suggesties voor vandaag
          </p>
          {allRankedSuggestions.length > 0 ? (
            <>
              <ul className="divide-y divide-gray-100">
                {suggestionsToRender.map((task) => {
                  const isPicked = focusTaskIds.has(task.id);
                  const dur = task.duration || task.estimatedDuration;

                  return (
                    <li key={task.id}>
                      <button
                        type="button"
                        disabled={isPicked}
                        onClick={() => {
                          if (isPicked) return;
                          void assignTaskToFirstSlot(task);
                        }}
                        className={`flex w-full items-center gap-3 py-2.5 text-left rounded-lg ${
                          isPicked
                            ? 'cursor-default opacity-40 text-gray-500'
                            : 'hover:bg-gray-50 active:bg-gray-100/80'
                        }`}
                      >
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: getEnergyColor(task.energyLevel || 'medium') }}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 text-sm text-gray-900 truncate">{task.title}</span>
                        <span className="text-xs text-gray-500 tabular-nums w-10 text-right shrink-0">
                          {dur ? `${dur}m` : '-'}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {hasMoreSuggestions ? (
                <button
                  type="button"
                  onClick={() => setShowAllSuggestions((v) => !v)}
                  className="mt-2 text-xs text-gray-500 hover:text-gray-700"
                >
                  {showAllSuggestions ? 'Minder tonen' : 'Toon alle taken'}
                </button>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-gray-500">Geen suggesties. Voeg een taak toe hierboven.</p>
          )}
        </div>
      ) : null}

      </div>

      <div className="mt-4 pt-3 border-t border-gray-100">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!energyLevel || isSubmitting || filledSlots === 0}
          className={`w-full py-3.5 px-6 rounded-xl font-semibold text-base ${
            energyLevel && filledSlots > 0 && !isSubmitting
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isSubmitting
            ? 'Opslaan...'
            : existingCheckIn
              ? 'Wijzigingen opslaan'
              : 'Start mijn dag'}
        </button>
      </div>
    </div>
  );
}

