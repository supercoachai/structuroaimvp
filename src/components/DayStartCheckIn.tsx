"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef, startTransition, useDeferredValue } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { toast } from './Toast';
import { track } from '../shared/track';
import {
  trackDagstartOpened,
  trackEnergyChecked,
  trackTaskSelected,
} from '@/utils/events';
import { registerPushSubscription } from '@/utils/pushNotifications';
import { yieldToMain } from '@/lib/yieldToMain';
import { useCheckIn } from '../hooks/useCheckIn';
import { markOnboardingCompleted } from '@/lib/onboardingProfile';
import { checkVoorzorgsmodus, resolveVoorzorgsmodus, type EnergyLevel, type VoorzorgsmodusOption } from '@/lib/voorzorgsmodus';
import VoorzorgsmodusModal from './VoorzorgsmodusModal';
import {
  addTaskToStorage,
  getTasksFromStorage,
  saveTasksToStorage,
  updateTaskInStorage,
} from '../lib/localStorageTasks';
import { getCalendarDateAmsterdam, setDagstartCookieOnClient } from '../lib/dagstartCookie';
import { useUser } from '../hooks/useUser';
import { updateProfileAfterDagstartComplete } from '@/lib/supabase/profileDagstartDb';
import {
  fetchDagafsluiterSuggestionsForDagstart,
  convertThoughtToTask,
  type DagafsluiterSuggestionRow,
} from '@/lib/supabase/parkedThoughtsDb';
import { useI18n } from '@/lib/i18n';
import { captureProductEvent } from '@/lib/posthog/track';
import { useCycleProfile } from '@/hooks/useCycleProfile';
import { cycleSuggestionsEnabled } from '@/lib/cycle/featureFlags';
import CyclePhaseHint from './cycle/CyclePhaseHint';

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

/** Taak bestaat en is kandidaat voor top3-opslag (open, niet "niet vandaag"). Geen filter op created_at: backlog moet mee. */
function isExistingOpenTaskForTop3Save(task: any): boolean {
  if (!task?.id || task?.done) return false;
  if (task.notToday || task.not_today) return false;
  return true;
}

interface DayStartCheckInProps {
  onComplete: () => void;
  existingCheckIn?: any; // Bestaande check-in data om te bewerken (overschreven door useCheckIn)
  /** Eerste dagstart ooit: subtiele coachingregels tot eerste interactie / afronding */
  firstTimeOnboarding?: boolean;
  /** Bij lunch-push: geen opgeslagen energie uit check-in tonen; gebruiker kiest zelf opnieuw. */
  ignoreStoredSessionEnergy?: boolean;
}

export default function DayStartCheckIn({
  onComplete,
  existingCheckIn,
  firstTimeOnboarding = false,
  ignoreStoredSessionEnergy = false,
}: DayStartCheckInProps) {
  const { t: tr } = useI18n();
  const { tasks, addTask, fetchTasks, updateTask, loading: tasksContextLoading } = useTaskContext();
  const deferredTasksForSuggestions = useDeferredValue(tasks);
  const { checkIn: checkInFromDb, saveCheckIn } = useCheckIn();
  const { user: authUser } = useUser();
  const { consentOn: cycleConsentOn, computePhaseToday: computeCyclePhaseToday } =
    useCycleProfile();
  const cycleHintsEnabled = useMemo(() => cycleSuggestionsEnabled(), []);
  const [energyLevel, setEnergyLevel] = useState<string | null>(() =>
    ignoreStoredSessionEnergy
      ? null
      : existingCheckIn?.energy_level ?? checkInFromDb?.energy_level ?? null
  );
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
  /** Energie specifiek voor deze snel-toegevoegde taak (niet de dag-energie). */
  const [quickAddTaskEnergy, setQuickAddTaskEnergy] = useState<'low' | 'medium' | 'high' | null>(null);
  /** Alleen voor 15/30/45-knoppen; vult het vrije minutenveld niet. */
  const [quickAddPresetMinutes, setQuickAddPresetMinutes] = useState<15 | 30 | 45 | null>(null);
  /** Alleen handmatige invoer; leeg betekent: gebruik preset als die gezet is. */
  const [quickAddCustomMinutesStr, setQuickAddCustomMinutesStr] = useState('');
  const [top3SanitizeNotice, setTop3SanitizeNotice] = useState<string | null>(null);
  /** Herinneringen uit dagafsluiter (parked_thoughts), max 7 dagen, gefilterd op energie in useMemo. */
  const [dagafsluiterRows, setDagafsluiterRows] = useState<DagafsluiterSuggestionRow[]>([]);
  /** Na klik op herinnering: koppel nieuwe taak aan parked thought bij snel toevoegen. */
  const [pendingDagafsluiterThoughtId, setPendingDagafsluiterThoughtId] = useState<string | null>(null);
  const dagstartGaOpenedRef = useRef(false);
  /** Scroll-doel + animatie na kiezen uit suggesties */
  const focusSlotElRef = useRef<Record<number, HTMLDivElement | null>>({});
  const [suggestionPickingId, setSuggestionPickingId] = useState<string | null>(null);
  const [slotPickAnim, setSlotPickAnim] = useState<number | null>(null);

  const quickAddResolvedMinutes = useMemo(() => {
    const t = quickAddCustomMinutesStr.trim();
    if (t !== '') {
      const n = parseInt(t, 10);
      if (!Number.isFinite(n)) return null;
      return Math.min(480, Math.max(1, n));
    }
    return quickAddPresetMinutes;
  }, [quickAddCustomMinutesStr, quickAddPresetMinutes]);

  useEffect(() => {
    if (quickAddTitle.trim().length <= 2) {
      setQuickAddTaskEnergy(null);
      setQuickAddPresetMinutes(null);
      setQuickAddCustomMinutesStr('');
      setPendingDagafsluiterThoughtId(null);
    }
  }, [quickAddTitle]);

  useEffect(() => {
    if (!authUser?.id) {
      setDagafsluiterRows([]);
      return;
    }
    let cancelled = false;
    fetchDagafsluiterSuggestionsForDagstart(authUser.id)
      .then((rows) => {
        if (!cancelled) setDagafsluiterRows(rows);
      })
      .catch(() => {
        if (!cancelled) setDagafsluiterRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [authUser?.id]);

  useEffect(() => {
    if (dagstartGaOpenedRef.current) return;
    dagstartGaOpenedRef.current = true;
    trackDagstartOpened();
    captureProductEvent("dagstart_started");
  }, []);

  const [energyOnboardingHintHidden, setEnergyOnboardingHintHidden] = useState(false);
  const [voorzorgsmodusState, setVoorzorgsmodusState] = useState<ReturnType<typeof checkVoorzorgsmodus> | null>(null);
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

  const getEnergyRankForSuggestions = (task: any): number => {
    const e = String(task?.energyLevel || "").toLowerCase();
    if (e === "high") return 0;
    if (e === "medium") return 1;
    if (e === "low") return 2;
    return 3;
  };

  const getImpactRankForSuggestions = (task: any): number => {
    const impact = String(task?.impact || "").trim();
    // Hoge impact eerst
    if (impact === "🚀" || impact === "🔥" || impact === "🎯") return 0;
    if (impact === "💪" || impact === "⚡" || impact === "✅") return 1;
    if (impact === "🌱" || impact === "🧩" || impact === "📝") return 2;
    return 3;
  };

  // Filter taken op basis van energie-niveau (PRIMAIR op energy_level veld)
  // BELANGRIJK: Dit is ALLEEN voor UI weergave - taken worden NOOIT verwijderd uit de data!
  const getFilteredTasks = () => {
    if (!energyLevel) return [];
    // Alleen open + actieve taken. Sluit alleen taken uit die al in today's focus-slots zitten.
    const selectedIds = new Set(
      [1, 2, 3].map((n) => top3Tasks[n]?.id).filter(Boolean) as string[]
    );

    const baseTasks = deferredTasksForSuggestions.filter((t: any) => {
      if (!t || !t.id || !t.title) return false;
      if (t.done || t.notToday || t.not_today) return false;
      if (t.source === "medication" || t.source === "event") return false;
      if (isDueDateStrictlyAfterToday(t.dueAt)) return false;
      if (selectedIds.has(t.id)) return false;
      return true;
    });

    const sorted = [...baseTasks].sort((a: any, b: any) => {
      const energyDiff = getEnergyRankForSuggestions(a) - getEnergyRankForSuggestions(b);
      if (energyDiff !== 0) return energyDiff;
      const impactDiff = getImpactRankForSuggestions(a) - getImpactRankForSuggestions(b);
      if (impactDiff !== 0) return impactDiff;
      const durA = a.duration || a.estimatedDuration || 999;
      const durB = b.duration || b.estimatedDuration || 999;
      if (durA !== durB) return durA - durB;
      return String(a.title || "").localeCompare(String(b.title || ""));
    });
    return sorted.slice(0, MAX_DAYSTART_SUGGESTIONS);
  };

  const allRankedSuggestions = useMemo(
    () => getFilteredTasks(),
    [deferredTasksForSuggestions, top3Tasks, energyLevel]
  );

  type MergedSuggestionItem =
    | { kind: 'task'; task: any }
    | { kind: 'dagafsluiter'; row: DagafsluiterSuggestionRow };

  const mergedSuggestionItems = useMemo((): MergedSuggestionItem[] => {
    if (!energyLevel) return [];
    const dagTitles = new Set(
      dagafsluiterRows.map((d) => String(d.content || "").trim().toLowerCase())
    );
    const tasksPart = allRankedSuggestions.filter(
      (t) => !dagTitles.has(String(t.title ?? '').trim().toLowerCase())
    );
    const items: MergedSuggestionItem[] = [
      ...dagafsluiterRows.map((row) => ({ kind: 'dagafsluiter' as const, row })),
      ...tasksPart.map((task) => ({ kind: 'task' as const, task })),
    ];
    return items.slice(0, MAX_DAYSTART_SUGGESTIONS);
  }, [energyLevel, dagafsluiterRows, allRankedSuggestions]);

  const collapsedSuggestions = useMemo(() => {
    if (!energyLevel || mergedSuggestionItems.length === 0) return [] as MergedSuggestionItem[];
    const selIds = [1, 2, 3].map((n) => top3Tasks[n]?.id).filter(Boolean) as string[];
    const selectedFirst = selIds
      .map((id) => mergedSuggestionItems.find((u) => u.kind === 'task' && u.task.id === id))
      .filter(Boolean) as MergedSuggestionItem[];
    const rest = mergedSuggestionItems.filter(
      (u) => !(u.kind === 'task' && selIds.includes(u.task.id))
    );
    return [...selectedFirst, ...rest].slice(0, COLLAPSED_SUGGESTIONS);
  }, [mergedSuggestionItems, energyLevel, top3Tasks]);

  const suggestionsToRender = showAllSuggestions ? mergedSuggestionItems : collapsedSuggestions;
  const hasMoreSuggestions =
    mergedSuggestionItems.length > collapsedSuggestions.length;

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

  const showNoTasksDayStart =
    !tasksContextLoading && !hasUsableTasksForDayStart && dagafsluiterRows.length === 0;
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

  // Sync energyLevel wanneer check-in uit DB/lokalStorage binnenkomt (niet bij lunch-heropen zonder keuze)
  useEffect(() => {
    if (ignoreStoredSessionEnergy) return;
    const source = checkInFromDb ?? existingCheckIn;
    if (source?.energy_level && energyLevel === null) {
      setEnergyLevel(source.energy_level);
    }
  }, [checkInFromDb?.energy_level, existingCheckIn?.energy_level, ignoreStoredSessionEnergy]);

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
        
        // Top3 na dagstart is bevroren: toon elke id in arrayvolgorde, ook afgerond (grijs in taken-overzicht).
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

      await yieldToMain();
      
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

      trackTaskSelected(slotNumber);

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
      toast(tr('dayStart.toastAddFail'));
      
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
      toast(tr('dayStart.toastSlotsFull'));
      return;
    }
    await handleDrop(slot, task);
  };

  const pickTaskFromSuggestions = async (task: any) => {
    if (!task?.id) return;
    const alreadyFocused = [1, 2, 3].some((n) => top3Tasks[n]?.id === task.id);
    if (alreadyFocused) return;
    const slot = getFirstAvailableSlotNumber();
    if (slot == null) {
      toast(tr('dayStart.toastSlotsFull'));
      return;
    }
    setSuggestionPickingId(task.id);
    await new Promise<void>((r) => setTimeout(r, 300));
    focusSlotElRef.current[slot]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    try {
      await handleDrop(slot, task);
    } catch (e) {
      console.error('pickTaskFromSuggestions:', e);
    } finally {
      setSuggestionPickingId(null);
      setSlotPickAnim(slot);
      window.setTimeout(() => setSlotPickAnim(null), 320);
    }
  };

  const quickAddMinutesOk =
    quickAddResolvedMinutes != null &&
    quickAddResolvedMinutes >= 1 &&
    quickAddResolvedMinutes <= 480;
  const quickAddFormReady =
    Boolean(quickAddTaskEnergy) &&
    quickAddMinutesOk &&
    quickAddTitle.trim().length >= 2;
  const noAvailableSlot = Boolean(energyLevel) && getFirstAvailableSlotNumber() == null;

  const handleQuickAddSubmit = async () => {
    const trimmed = quickAddTitle.trim();
    if (!trimmed || quickAddBusy || !energyLevel || !quickAddFormReady || !quickAddTaskEnergy) return;
    setQuickAddBusy(true);
    try {
      const mins = quickAddResolvedMinutes!;
      const created = await addTask({
        title: trimmed,
        done: false,
        started: false,
        priority: null,
        dueAt: null,
        duration: mins,
        source: 'regular',
        reminders: [],
        repeat: 'none',
        impact: '🌱',
        energyLevel: quickAddTaskEnergy,
        estimatedDuration: mins,
        microSteps: [],
        notToday: false,
      });
      const parkedFromShutdown = pendingDagafsluiterThoughtId;
      if (parkedFromShutdown) {
        try {
          await convertThoughtToTask(parkedFromShutdown, created.id);
        } catch (e) {
          console.warn('convertThoughtToTask (dagafsluiter):', e);
        }
        setDagafsluiterRows((prev) => prev.filter((r) => r.id !== parkedFromShutdown));
      }
      setPendingDagafsluiterThoughtId(null);
      setQuickAddTitle('');
      setQuickAddTaskEnergy(null);
      setQuickAddPresetMinutes(null);
      setQuickAddCustomMinutesStr('');
      const slot = getFirstAvailableSlotNumber();
      if (slot != null) {
        await handleDrop(slot, created);
      }
    } catch (e) {
      console.error('quick add daystart:', e);
      toast(tr('dayStart.toastCantAdd'));
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

      await yieldToMain();

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
      toast(tr('dayStart.toastRemoveFail'));
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
      toast(tr('dayStart.toastPickEnergy'));
      return;
    }

    if (filledSlots < maxSlots) {
      if (filledSlots === 0) {
        toast(tr('dayStart.toastPickOne'));
      } else if (energyLevel === 'medium') {
        toast(tr('dayStart.toastNeedTwo'));
      } else if (energyLevel === 'high') {
        toast(tr('dayStart.toastNeedThree'));
      } else {
        toast(tr('dayStart.toastFillAll'));
      }
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
      // Merge localStorage + Supabase-context: ingelogde users hebben vaak geen lokale kopie;
      // zonder merge worden alle top3 als "missing" gezien en dubbel in localStorage gezet.
      const tasksBeforeUpdate = (() => {
        const merged = new Map<string, any>();
        for (const lt of getTasksFromStorage()) {
          if (lt?.id) merged.set(String(lt.id), lt);
        }
        if (authUser?.id) {
          for (const t of tasks) {
            const id = String(t.id);
            if (!id || merged.has(id)) continue;
            merged.set(id, {
              id: t.id,
              title: t.title,
              done: t.done,
              started: t.started ?? false,
              priority: t.priority ?? null,
              dueAt: t.dueAt ?? null,
              duration: t.duration ?? null,
              source: t.source ?? "regular",
              postponedTo: t.postponedTo ?? null,
              focusStartedAt: t.focusStartedAt ?? null,
              focusExitedAt: t.focusExitedAt ?? null,
              focusAttempts: t.focusAttempts ?? 0,
              completedAt: t.completedAt ?? null,
              reminders: t.reminders ?? [],
              repeat: t.repeat ?? "none",
              repeatUntil: t.repeatUntil ?? null,
              repeatWeekdays: t.repeatWeekdays ?? "all",
              repeatExcludeDates: t.repeatExcludeDates ?? undefined,
              impact: t.impact ?? "🌱",
              energyLevel: t.energyLevel ?? "medium",
              estimatedDuration: t.estimatedDuration ?? null,
              microSteps: t.microSteps ?? [],
              notToday: t.notToday ?? false,
              isDeadline: t.isDeadline,
              category: t.category,
              created_at: t.created_at || new Date().toISOString(),
              updated_at: t.updated_at || new Date().toISOString(),
            });
          }
        }
        return Array.from(merged.values());
      })();
      
      console.log('🔍 VOOR UPDATE - Taken in localStorage:', tasksBeforeUpdate.length);
      console.log('🔍 VOOR UPDATE - Top3Tasks state:', top3Tasks);
      console.log('🔍 VOOR UPDATE - Top3 tasks entries:', Object.entries(top3Tasks));
      
      // KRITIEK: Als top3Tasks leeg is, probeer taken uit localStorage te halen met priority 1-3
      let tasksToProcess: { [key: number]: any } = { ...top3Tasks };
      for (let n = submitMaxSlots + 1; n <= 3; n++) {
        tasksToProcess[n] = null;
      }

      // Exacte slotvolgorde 1..max: nooit Object.entries-volgorde of backfill uit andere priority-taken
      const selectedIdsBeforeSanitize: string[] = [];
      for (let slot = 1; slot <= submitMaxSlots; slot++) {
        const t = tasksToProcess[slot];
        if (!t || typeof t !== "object") continue;
        const idStr = t.id != null ? String(t.id).trim() : "";
        if (!idStr || /^[1-3]$/.test(idStr)) continue;
        selectedIdsBeforeSanitize.push(idStr);
      }
      const top3Ids = [...selectedIdsBeforeSanitize];

      const eligibleTop3Ids = top3Ids.filter((id) => {
        const task =
          tasksBeforeUpdate.find((t: any) => String(t.id) === id) ??
          tasks.find((t: any) => String(t.id) === id) ??
          Object.values(tasksToProcess).find((t: any) => String(t?.id) === id);
        return isExistingOpenTaskForTop3Save(task);
      });
      top3Ids.length = 0;
      top3Ids.push(...eligibleTop3Ids);
      if (selectedIdsBeforeSanitize.length > eligibleTop3Ids.length) {
        const removed = selectedIdsBeforeSanitize.length - eligibleTop3Ids.length;
        const msg =
          removed === 1
            ? "1 taak bestaat niet meer of is afgerond en is uit je selectie gehaald."
            : `${removed} taken bestaan niet meer of zijn afgerond en zijn uit je selectie gehaald.`;
        setTop3SanitizeNotice(msg);
        toast(msg);
      } else {
        setTop3SanitizeNotice(null);
      }
      
      console.log('[DayStart] Top3 task IDs:', top3Ids);

      if (top3Ids.length === 0 && filledSlots > 0) {
        toast(tr('dayStart.toastFocusReadError'));
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
      // Gebruik merge-bron (niet alleen getTasksFromStorage): ingelogde users hebben taken vooral in Supabase-context.
      const allTasks = tasksBeforeUpdate;
      
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
        toast(tr('dayStart.toastTasksMissing', { n: String(stillMissing.length) }));
        return;
      }
      
      // Wacht even zodat localStorage volledig is doorgevoerd
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Haal taken opnieuw op via fetchTasks om state te synchroniseren
      await fetchTasks();
      
      // Wacht nog even zodat fetchTasks volledig is doorgevoerd
      await new Promise(resolve => setTimeout(resolve, 200));

      // Sla check-in op (Supabase bij ingelogde user, anders localStorage) — met timeout tegen eeuwig hangen.
      // Stille opslag van cyclus-fase als gebruiker consent heeft (geen UI-impact in fase 1).
      const cyclePhaseToday = cycleConsentOn ? computeCyclePhaseToday() : null;
      await withTimeout(
        saveCheckIn({
          energy_level: energyLevel,
          top3_task_ids: top3Ids.length > 0 ? top3Ids : null,
          cycle_phase: cyclePhaseToday,
        }),
        25_000,
        tr('dayStart.saveTimeout')
      );

      setDagstartCookieOnClient();

      if (authUser?.id && (energyLevel === 'low' || energyLevel === 'medium' || energyLevel === 'high')) {
        try {
          await updateProfileAfterDagstartComplete(authUser.id, energyLevel);
        } catch (e) {
          console.warn('Profiel dagstart niet bijgewerkt:', e);
        }
      }

      // BELANGRIJK: Trigger expliciet een sync event zodat alle pagina's direct updaten
      // Dit zorgt ervoor dat TasksOverview en Focus Mode direct de nieuwe prioriteiten zien
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('structuro_tasks_updated'));
        console.log('🔄 DayStart: Final sync event triggered');
      }

      // Pas dagindeling aan op basis van energie
      if (energyLevel === 'low') {
        toast(tr('dayStart.toastSaveLow'));
      } else if (energyLevel === 'high') {
        toast(tr('dayStart.toastSaveHigh'));
      } else {
        toast(tr('dayStart.toastSaveMed'));
      }

      track('day_start_checkin', { energyLevel, top3Count: filledSlots });

      captureProductEvent("dagstart_completed", {
        tasks_selected_count: filledSlots,
      });
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('structuro_tasks_updated'));
      }

      if (firstTimeOnboarding) {
        await markOnboardingCompleted();
      }

      if (authUser?.id) {
        try {
          await registerPushSubscription(authUser.id);
        } catch (e) {
          console.warn("Push registratie overgeslagen:", e);
        }
      }

      onComplete();
      
    } catch (error: any) {
      console.error('Error saving check-in:', error);
      const detail = String(error?.message || tr('passwordSetup.errUnknown'));
      const invalidTop3Error =
        detail.includes('niet geldig voor top3') ||
        detail.includes('top3_task_ids bevat') ||
        (detail.includes('Max ') && detail.includes('taken toegestaan voor energy level'));
      if (invalidTop3Error) {
        const msg =
          "Een taak uit je selectie voldeed niet meer aan vandaag.\n" +
          "Dit gebeurde automatisch om je te beschermen tegen chaos van gisteren.\n" +
          "Herlaad je dagstart om je keuzes opnieuw te maken.";
        setTop3SanitizeNotice(msg);
        toast(msg);
        return;
      }
      toast(
        tr('dayStart.toastSaveErr', {
          detail,
        })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const energyLevels = useMemo(
    () => [
      {
        label: tr("dayStart.labelLow"),
        value: "low" as const,
        sub: tr("dayStart.subLow"),
        emoji: "🌙",
        idleBorder: "border-[var(--structuro-border)]",
        selectedBg: "bg-slate-50",
        selectedBorder: "border-slate-400",
        selectedRing: "shadow-[0_0_0_3px_rgba(148,163,184,0.25)]",
        textSel: "text-slate-700",
      },
      {
        label: tr("dayStart.labelMed"),
        value: "medium" as const,
        sub: tr("dayStart.subMed"),
        emoji: "🙂",
        idleBorder: "border-[var(--structuro-border)]",
        selectedBg: "bg-amber-50",
        selectedBorder: "border-amber-300",
        selectedRing: "shadow-[0_0_0_3px_rgba(245,158,11,0.2)]",
        textSel: "text-amber-900",
      },
      {
        label: tr("dayStart.labelHigh"),
        value: "high" as const,
        sub: tr("dayStart.subHigh"),
        emoji: "⚡",
        idleBorder: "border-[var(--structuro-border)]",
        selectedBg: "bg-violet-50",
        selectedBorder: "border-violet-300",
        selectedRing: "shadow-[0_0_0_3px_rgba(139,92,246,0.2)]",
        textSel: "text-violet-900",
      },
    ],
    [tr]
  );

  const getEnergyIntensity = (value: string) => {
    if (value === 'low') return 1;
    if (value === 'medium') return 2;
    return 3;
  };

  const slotConfig = useMemo(
    () => [
      {
        number: 1,
        label: tr("dayStart.slot1Label"),
        description: tr("dayStart.slot1Desc"),
        color: "#3B82F6",
        bgColor: "#EFF6FF",
        borderColor: "#BFDBFE",
      },
      {
        number: 2,
        label: tr("dayStart.slot2Label"),
        description: tr("dayStart.slot2Desc"),
        color: "#14B8A6",
        bgColor: "#F0FDFA",
        borderColor: "#99F6E4",
      },
      {
        number: 3,
        label: tr("dayStart.slot3Label"),
        description: tr("dayStart.slot3Desc"),
        color: "#8B5CF6",
        bgColor: "#F5F3FF",
        borderColor: "#DDD6FE",
      },
    ],
    [tr]
  );

  const dagstartHeaderBar = (
    <div className="flex items-center justify-center gap-2.5" role="banner">
      <img
        src="/logo-structuro.png"
        alt="Structuro"
        className="h-8 w-8 shrink-0 rounded-2xl object-contain sm:h-9 sm:w-9"
        width={36}
        height={36}
      />
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--structuro-sub)]">
        {tr("dagstart.title")}
      </span>
    </div>
  );

  // Als energie nog niet is gekozen, toon alleen energie-selectie
  if (!energyLevel) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col items-center justify-center px-4">
        <div className="mb-3 flex w-full max-w-lg shrink-0 justify-center">
          {dagstartHeaderBar}
        </div>
        <div className="w-full max-w-lg space-y-8 rounded-2xl border border-[var(--structuro-border)] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--structuro-border-soft)]">
              <div className="h-full w-1/2 rounded-full bg-amber-400/90 transition-all duration-300" />
            </div>
            <span className="shrink-0 text-xs font-medium tabular-nums text-[var(--structuro-sub)]">
              {tr("dayStart.stepProgress")}
            </span>
          </div>

          <div className="space-y-6 text-center">
            <div className="mx-auto mb-3.5 flex h-[52px] w-[52px] items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-[26px]">
              ☀️
            </div>
            <h2 className="text-[21px] font-bold tracking-tight text-[var(--structuro-text)]">
              {tr("dayStart.h2Energy")}
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[var(--structuro-sub)]">
              {tr("dayStart.pEnergy")}
            </p>
          </div>

          {firstTimeOnboarding && !energyOnboardingHintHidden ? (
            <p className="text-center text-sm leading-snug text-[var(--structuro-sub)]">
              {tr("dayStart.hintOnboarding")}
            </p>
          ) : null}

          <div className="grid w-full grid-cols-3 gap-2.5">
            {energyLevels.map((level) => {
              const highlighted = hoveredEnergyLevel === level.value;
              return (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => {
                    if (firstTimeOnboarding) setEnergyOnboardingHintHidden(true);
                    setEnergyLevel(level.value);
                    startTransition(() => {
                      setEnergySelected(true);
                      setShowConfirmation(true);
                      const vzCheck = checkVoorzorgsmodus(
                        tasks,
                        level.value as EnergyLevel
                      );
                      setVoorzorgsmodusState(
                        vzCheck.shouldShow ? vzCheck : null
                      );
                    });
                    queueMicrotask(() => {
                      trackEnergyChecked(
                        level.value === "low"
                          ? "laag"
                          : level.value === "high"
                            ? "hoog"
                            : "middel"
                      );
                      const messages: Record<string, string> = {
                        low: tr("dayStart.toastPickLow"),
                        medium: tr("dayStart.toastPickMed"),
                        high: tr("dayStart.toastPickHigh"),
                      };
                      toast(messages[level.value] || tr("dayStart.toastPickDefault"));
                    });
                    setTimeout(() => setEnergySelected(false), 1000);
                    setTimeout(() => setShowConfirmation(false), 2000);
                  }}
                  className={`flex min-h-[118px] flex-col items-center justify-center rounded-2xl border-[1.5px] px-2.5 pb-3.5 pt-4 text-center transition-all duration-200 ${
                    highlighted
                      ? `${level.selectedBg} ${level.selectedBorder} ${level.selectedRing} -translate-y-px`
                      : `border bg-white ${level.idleBorder} shadow-sm hover:bg-[var(--structuro-bg)]`
                  }`}
                  onMouseEnter={() => setHoveredEnergyLevel(level.value)}
                  onMouseLeave={() => setHoveredEnergyLevel(null)}
                >
                  <span className="text-2xl leading-none">{level.emoji}</span>
                  <span
                    className={`mt-2 text-sm font-bold ${highlighted ? level.textSel : 'text-[var(--structuro-text)]'}`}
                  >
                    {level.label}
                  </span>
                  <span className="mt-0.5 text-[11.5px] text-[var(--structuro-sub)]">{level.sub}</span>
                </button>
              );
            })}
          </div>

          {showConfirmation && energyLevel ? (
            <p className="text-center text-sm text-[var(--structuro-blue)] transition-opacity duration-300">
              {tr("dayStart.confirmLine")}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  // Voorzorgsmodus modal (te veel deadlines voor gekozen energie)
  if (voorzorgsmodusState) {
    const handleVoorzorgsmodusResolve = (option: VoorzorgsmodusOption) => {
      const result = resolveVoorzorgsmodus(
        voorzorgsmodusState.deadlineTasks,
        voorzorgsmodusState.capacity,
        option
      );

      if (result.deferredTaskIds.length > 0) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString();
        result.deferredTaskIds.forEach((id) => {
          updateTask(id, { dueAt: tomorrowStr, notToday: true }).catch(console.error);
        });
        toast(
          result.deferredTaskIds.length === 1
            ? tr("dayStart.movedOne")
            : tr("dayStart.movedMany", {
                n: String(result.deferredTaskIds.length),
              })
        );
      }

      if (option === "push") {
        toast(tr("dayStart.toastPush"));
      }

      setVoorzorgsmodusState(null);
    };

    return (
      <VoorzorgsmodusModal
        deadlineTasks={voorzorgsmodusState.deadlineTasks}
        capacity={voorzorgsmodusState.capacity}
        excess={voorzorgsmodusState.excess}
        onResolve={handleVoorzorgsmodusResolve}
      />
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
    <div className="flex w-full max-h-[min(720px,88dvh)] min-h-0 flex-col items-center">
      <div className="mb-3 flex w-full max-w-lg shrink-0 justify-center">
        {dagstartHeaderBar}
      </div>
      <div className="flex min-h-0 w-full max-w-lg flex-1 flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white text-gray-900 shadow-sm [contain:layout]">
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
      <style>{`
        @keyframes daystart-slot-bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        .daystart-slot-bounce {
          animation: daystart-slot-bounce 150ms ease-out;
        }
        @keyframes daystart-slot-task-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .daystart-slot-task-fade-in {
          animation: daystart-slot-task-fade-in 300ms ease-out;
        }
      `}</style>
      {/* Energie-banner met titel + subtitel (compact, max 60px) */}
      <div
        className="mb-3 max-h-[60px] overflow-hidden rounded-2xl px-3 py-2 sm:px-3 sm:py-2"
        style={{
          backgroundColor:
            energyInfo?.value === "low"
              ? "#EFF6FF"
              : energyInfo?.value === "high"
                ? "#F0FDF4"
                : "#FFFBEB",
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <span className="shrink-0 text-xl leading-none" aria-hidden>
              {energyInfo?.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-xs font-bold leading-snug text-gray-900 sm:text-[13px]">
                {energyLevel === "low" && tr("dayStart.bannerLowTitle")}
                {energyLevel === "medium" && tr("dayStart.bannerMedTitle")}
                {energyLevel === "high" && tr("dayStart.bannerHighTitle")}
              </p>
              <p className="line-clamp-1 text-[11px] text-gray-500">
                {energyLevel === "low" && tr("dayStart.bannerLowSub")}
                {energyLevel === "medium" && tr("dayStart.bannerMedSub")}
                {energyLevel === "high" && tr("dayStart.bannerHighSub")}
              </p>
              {isStep2LoadingTasks ? (
                <span className="mt-0.5 block text-[10px] text-gray-400">
                  {tr("dayStart.tasksLoading")}
                </span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEnergyLevel(null)}
            className="shrink-0 text-[11px] text-gray-500 underline underline-offset-2 hover:text-gray-900"
          >
            {tr("dayStart.changeEnergy")}
          </button>
        </div>
      </div>

      {cycleHintsEnabled && cycleConsentOn ? (
        <CyclePhaseHint phase={computeCyclePhaseToday()} />
      ) : null}

      {/* Jouw focuspunten per slot (aantal afhankelijk van energie) */}
      <div className="mb-4">
        {firstTimeOnboarding && filledSlots === 0 ? (
          <p className="text-sm text-gray-500 mb-3 leading-snug">
            {tr("dayStart.hintTapTask")}
          </p>
        ) : null}
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-3">
          {tr("dayStart.focusPoints")}
        </p>
        {top3SanitizeNotice ? (
          <div className="mb-3 flex items-start justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <span>{top3SanitizeNotice}</span>
            <button
              type="button"
              onClick={() => setTop3SanitizeNotice(null)}
              className="shrink-0 rounded px-1 text-amber-700 hover:bg-amber-100"
              aria-label="Melding sluiten"
            >
              ×
            </button>
          </div>
        ) : null}
        <div className="flex flex-col gap-3">
          {visibleFocusSlots.map((slot) => {
            const task = top3Tasks[slot.number];
            const hasTask = Boolean(task?.id && task?.title);
            const runSlotAnim = slotPickAnim === slot.number;

            return (
              <div
                key={slot.number}
                ref={(el) => {
                  focusSlotElRef.current[slot.number] = el;
                }}
                className={`rounded-2xl border-[1.5px] border-dashed border-gray-200 bg-white px-3 py-3 sm:px-4 sm:py-4 ${runSlotAnim ? "daystart-slot-bounce" : ""}`}
              >
                {hasTask ? (
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm"
                      style={{ backgroundColor: slot.color }}
                    >
                      {slot.number}
                    </div>
                    <div
                      className={`min-w-0 flex-1 flex h-10 items-center gap-2 rounded-lg border border-gray-200/90 border-l-[3px] border-l-[#3B82F6] bg-[#EFF6FF] px-3 text-sm text-gray-900 ${runSlotAnim ? "daystart-slot-task-fade-in" : ""}`}
                    >
                      <span className="min-w-0 flex-1 truncate font-medium">{task.title}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromSlot(slot.number)}
                        className="shrink-0 flex h-8 w-8 items-center justify-center rounded-md text-lg leading-none text-gray-600 opacity-80 hover:opacity-100 hover:bg-black/5"
                        aria-label={tr("dayStart.removeFocusAria")}
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
                        <p className="text-xs leading-snug text-gray-600">{slot.description}</p>
                      </div>
                    </div>
                    <p className="mt-1.5 text-center text-sm text-gray-500">
                      {tr("dayStart.selectBelow")}
                    </p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Suggesties voor vandaag (direct onder focus-slots, geen scroll nodig voor eerste suggesties) */}
      {isStep2LoadingTasks ? (
        <p className="mb-4 text-sm text-gray-500">{tr("dayStart.tasksLoading")}</p>
      ) : showNoTasksDayStart ? (
        <p className="mb-4 text-sm text-gray-600">{tr("dayStart.noTasksYet")}</p>
      ) : (
        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            {tr("dayStart.suggestionsTitle")}
          </p>
          {mergedSuggestionItems.length > 0 ? (
            <>
              <ul className="space-y-2">
                {suggestionsToRender.map((item) => {
                  if (item.kind === 'dagafsluiter') {
                    const row = item.row;
                    const e = row.suggestedTaskEnergy || 'medium';
                    return (
                      <li key={`dagafsluiter-${row.id}`}>
                        <button
                          type="button"
                          onClick={() => {
                            setQuickAddTitle(row.content);
                            setQuickAddTaskEnergy(
                              e === 'low' || e === 'medium' || e === 'high' ? e : 'medium'
                            );
                            setQuickAddPresetMinutes(15);
                            setQuickAddCustomMinutesStr('');
                            setPendingDagafsluiterThoughtId(row.id);
                          }}
                          className="flex w-full items-center gap-3 rounded-lg border border-[#E5E7EB] bg-white p-3 text-left transition-colors hover:bg-[#F9FAFB] active:bg-[#F3F4F6]"
                        >
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ background: getEnergyColor(e) }}
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1 text-sm text-gray-900 truncate">
                            {row.content}
                          </span>
                          <span className="text-[10px] text-gray-400 uppercase tracking-wide shrink-0">
                            {tr("dayStart.reminderBadge")}
                          </span>
                          <span className="text-xs text-gray-500 tabular-nums w-10 text-right shrink-0">
                            -
                          </span>
                          <span className="shrink-0 text-sm text-gray-400" aria-hidden>
                            ›
                          </span>
                        </button>
                      </li>
                    );
                  }
                  const task = item.task;
                  const isPicked = focusTaskIds.has(task.id);
                  const dur = task.duration || task.estimatedDuration;

                  return (
                    <li key={task.id}>
                      <button
                        type="button"
                        disabled={isPicked}
                        onClick={() => {
                          if (isPicked) return;
                          void pickTaskFromSuggestions(task);
                        }}
                        className={`flex w-full items-center gap-3 rounded-lg border border-[#E5E7EB] bg-white p-3 text-left transition-colors ${
                          isPicked
                            ? 'cursor-default opacity-40 text-gray-500'
                            : 'hover:bg-[#F9FAFB] active:bg-[#F3F4F6]'
                        } ${
                          suggestionPickingId === task.id ? 'opacity-0' : 'opacity-100'
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
                        <span className="shrink-0 text-sm text-gray-400" aria-hidden>
                          ›
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
                  {showAllSuggestions ? tr("dayStart.showLess") : tr("dayStart.showAll")}
                </button>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-gray-500">{tr("dayStart.noSuggestions")}</p>
          )}
        </div>
      )}

      {/* Taak toevoegen (eigen energie + duur per taak) */}
      <div className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
          {tr("dayStart.addTaskSection")}
        </p>
        <div className="flex gap-2 items-stretch">
          <input
            type="text"
            value={quickAddTitle}
            onChange={(e) => setQuickAddTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (quickAddFormReady && !noAvailableSlot) void handleQuickAddSubmit();
              }
            }}
            placeholder={tr("dayStart.quickAddPh")}
            className="flex-1 min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
          />
          <button
            type="button"
            onClick={handleQuickAddSubmit}
            disabled={quickAddBusy || !energyLevel || !quickAddFormReady || noAvailableSlot}
            className="shrink-0 h-10 w-10 rounded-lg bg-gray-900 text-white text-lg font-light leading-none hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label={tr("dayStart.quickAddAria")}
          >
            +
          </button>
        </div>
        {noAvailableSlot && quickAddTitle.trim().length > 2 ? (
          <p className="mt-2 text-xs text-amber-700">{tr("dayStart.capacityReached")}</p>
        ) : null}

        {quickAddTitle.trim().length > 2 ? (
          <div className="mt-3 space-y-3 animate-fade-in">
            <div>
              <p className="mb-1.5 text-xs font-medium text-gray-600">
                {tr("dayStart.quickEnergy")}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: tr("dayStart.quickRustig"), emoji: "🌙", value: "low" as const },
                  { label: tr("dayStart.quickNormaal"), emoji: "🙂", value: "medium" as const },
                  { label: tr("dayStart.quickIntensief"), emoji: "⚡", value: "high" as const },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setQuickAddTaskEnergy(opt.value)}
                    className={`flex flex-col items-center gap-0.5 rounded-xl border py-2 text-xs font-medium transition-colors ${
                      quickAddTaskEnergy === opt.value
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-base leading-none" aria-hidden>
                      {opt.emoji}
                    </span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {quickAddTaskEnergy ? (
              <div className="space-y-2 animate-fade-in">
                <p className="text-xs font-medium text-gray-600">{tr("dayStart.quickTime")}</p>
                <div className="flex gap-2">
                  {([15, 30, 45] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setQuickAddPresetMinutes(m);
                        setQuickAddCustomMinutesStr('');
                      }}
                      className={`min-w-0 flex-1 rounded-lg border py-2 text-xs font-semibold transition-colors ${
                        quickAddPresetMinutes === m
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {m} min
                    </button>
                  ))}
                </div>
                <div>
                  <label htmlFor="daystart-quick-minutes" className="sr-only">
                    {tr("dayStart.quickOtherMinutesSr")}
                  </label>
                  <input
                    id="daystart-quick-minutes"
                    type="number"
                    min={1}
                    max={480}
                    inputMode="numeric"
                    value={quickAddCustomMinutesStr}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setQuickAddCustomMinutesStr(raw);
                      if (raw.trim() !== '') {
                        setQuickAddPresetMinutes(null);
                      }
                    }}
                    onBlur={() => {
                      setQuickAddCustomMinutesStr((prev) => {
                        const t = prev.trim();
                        if (t === '') return '';
                        const n = parseInt(t, 10);
                        if (!Number.isFinite(n)) return '';
                        const clamped = Math.min(480, Math.max(1, n));
                        return String(clamped);
                      });
                    }}
                    placeholder={tr("dayStart.quickMinPh")}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      </div>

      <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3 sm:px-6">
        {(() => {
          const hasAtLeastOne = filledSlots > 0;
          const hasAllRequired = filledSlots >= maxSlots;
          const canSubmit = Boolean(energyLevel) && !isSubmitting && hasAllRequired;
          const ctaText = hasAtLeastOne
            ? (existingCheckIn ? tr("dayStart.saveChanges") : tr("dayStart.startDay"))
            : tr("dayStart.pickTasksFirst");
          return (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full rounded-xl px-6 py-3.5 text-base font-semibold transition-colors ${
            hasAtLeastOne
              ? "bg-[#3B82F6] text-white shadow-sm hover:bg-blue-700"
              : "cursor-not-allowed bg-gray-200 text-gray-500"
          }`}
        >
          {isSubmitting ? tr("dayStart.saving") : ctaText}
        </button>
          );
        })()}
      </div>
      </div>
    </div>
  );
}

