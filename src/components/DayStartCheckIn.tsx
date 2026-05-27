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
import {
  addTaskToStorage,
  getTasksFromStorage,
  saveTasksToStorage,
  updateTaskInStorage,
} from '../lib/localStorageTasks';
import { getCalendarDateAmsterdam, getTomorrowCalendarDateAmsterdam, setDagstartCookieOnClient } from '../lib/dagstartCookie';
import { useUser } from '../hooks/useUser';
import { updateProfileAfterDagstartComplete } from '@/lib/supabase/profileDagstartDb';
import {
  fetchDagafsluiterSuggestionsForDagstart,
  convertThoughtToTask,
  type DagafsluiterSuggestionRow,
} from '@/lib/supabase/parkedThoughtsDb';
import { createClient } from '@/lib/supabase/client';
import {
  getDayStartTimeOfDay,
  resolveDayStartFirstName,
} from '@/lib/dayStartGreeting';
import { captureProductEvent } from '@/lib/posthog/track';
import { useCycleProfile } from '@/hooks/useCycleProfile';
import { useI18n } from '@/lib/i18n';
import CycleEnergyContext from './cycle/CycleEnergyContext';
import InfoButton from '@/components/info/InfoButton';
import EnergyIcon, { type EnergyIconKind } from '@/components/structuro/EnergyIcon';
import DagstartEnergyCards, {
  energyBannerStyle,
  energyBannerCopy,
} from '@/components/dagstart/DagstartEnergyCards';
import DagstartStep1Card from '@/components/dagstart/DagstartStep1Card';
import DagstartCardStack, {
  taskToDagstartCard,
  type DagstartCardTask,
} from '@/components/dagstart/DagstartCardStack';
import VandaagDock from '@/components/dagstart/VandaagDock';
import DagstartPickModeSwipeCard from '@/components/dagstart/DagstartPickModeSwipeCard';
import DagstartFocusSlots from '@/components/dagstart/DagstartFocusSlots';
import DagstartSuggestionsList, {
  type SuggestionListItem,
} from '@/components/dagstart/DagstartSuggestionsList';
import { appEnergyToSt } from '@/lib/structuro/energyTokens';
import {
  type DayEnergy,
} from '@/lib/dagstart/structuroPick';

/**
 * Dev-only logger: alleen actief in development, no-op in productie.
 * Voorkomt console-spam, geheugendruk en data-lekken bij eindgebruikers.
 */
const debugLog: typeof console.log =
  process.env.NODE_ENV === 'production' ? () => {} : console.log.bind(console);

const FOCUS_SLOT_NUMBERS = [1, 2, 3, 4] as const;
const MAX_FOCUS_SLOTS = 4;

import {
  isDueStrictlyAfterToday,
  compareDeadlineTasks,
  calendarDayToDueAt,
  maxSlotsForDayEnergy,
} from '@/lib/dagstart/deadlineToday';
import { buildDagstartTaskPlan, rankTaskForDagstartSuggestions } from '@/lib/dagstart/buildDagstartTaskPlan';
import { buildTaskFromFlowPayload } from '@/lib/newTask/buildTaskFromFlowPayload';
import type { NewTaskFlowPayload } from '@/lib/newTask/newTaskFlowTypes';
import DagstartDeadlineOverflowModal from '@/components/dagstart/DagstartDeadlineOverflowModal';

/** Taak bestaat en is kandidaat voor top3-opslag (open, niet "niet vandaag"). Geen filter op created_at: backlog moet mee. */
function isExistingOpenTaskForTop3Save(task: any): boolean {
  if (!task?.id || task?.done) return false;
  if (task.notToday || task.not_today) return false;
  if (!String(task.title ?? '').trim()) return false;
  return true;
}

function collectTop3TaskIdsFromSlots(
  slots: { [key: number]: any },
  maxSlots: number
): string[] {
  const ids: string[] = [];
  for (let slot = 1; slot <= maxSlots; slot++) {
    const task = slots[slot];
    if (!isExistingOpenTaskForTop3Save(task)) continue;
    const idStr = String(task.id).trim();
    if (!idStr) continue;
    ids.push(idStr);
  }
  return ids;
}

interface DayStartCheckInProps {
  onComplete: () => void;
  existingCheckIn?: any; // Bestaande check-in data om te bewerken (overschreven door useCheckIn)
  /** Eerste dagstart ooit: subtiele coachingregels tot eerste interactie / afronding */
  firstTimeOnboarding?: boolean;
  /** Bij lunch-push: geen opgeslagen energie uit check-in tonen; gebruiker kiest zelf opnieuw. */
  ignoreStoredSessionEnergy?: boolean;
  /** Sync dagstart-stap naar app-shell (bijv. topbar-logo verbergen op stap 1). */
  onPhaseChange?: (phase: 'energy' | 'tasks' | null) => void;
}

export default function DayStartCheckIn({
  onComplete,
  existingCheckIn,
  firstTimeOnboarding = false,
  ignoreStoredSessionEnergy = false,
  onPhaseChange,
}: DayStartCheckInProps) {
  const { t: tr, locale } = useI18n();
  const { tasks, addTask, fetchTasks, updateTask, loading: tasksContextLoading } = useTaskContext();
  const deferredTasksForSuggestions = useDeferredValue(tasks);
  const { checkIn: checkInFromDb, saveCheckIn } = useCheckIn();
  const { user: authUser } = useUser();
  const { consentOn: cycleConsentOn, profile: cycleProfile, computePhaseToday } =
    useCycleProfile();
  const [energyLevel, setEnergyLevel] = useState<string | null>(() =>
    ignoreStoredSessionEnergy
      ? null
      : existingCheckIn?.energy_level ?? checkInFromDb?.energy_level ?? null
  );
  const [top3Tasks, setTop3Tasks] = useState<{ [key: number]: any }>({
    1: null,
    2: null,
    3: null,
    4: null,
  });
  const top3TasksRef = useRef(top3Tasks);
  top3TasksRef.current = top3Tasks;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentlyAdded, setRecentlyAdded] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [skippedCardIds, setSkippedCardIds] = useState<Set<string>>(() => new Set());
  const [stackAddOpen, setStackAddOpen] = useState(false);
  const [stackAddBusy, setStackAddBusy] = useState(false);
  /** Nieuwe taken via empty-state staan vooraan in de kaartenstapel. */
  const [stackInjectedTaskIds, setStackInjectedTaskIds] = useState<string[]>([]);
  const [dateTimeLine, setDateTimeLine] = useState('');
  const [dagstartPhase, setDagstartPhase] = useState<'energy' | 'tasks'>('energy');

  useEffect(() => {
    onPhaseChange?.(dagstartPhase);
    return () => onPhaseChange?.(null);
  }, [dagstartPhase, onPhaseChange]);

  const [taskPickMode, setTaskPickMode] = useState<'choosing' | 'self' | 'structuro'>('choosing');
  const [structuroPickBusy, setStructuroPickBusy] = useState(false);
  const [structuroSwapSlot, setStructuroSwapSlot] = useState<number | null>(null);
  const [extraFocusSlots, setExtraFocusSlots] = useState(0);
  const [deadlineOverflowQueue, setDeadlineOverflowQueue] = useState<any[]>([]);
  const [deadlineOverflowBusy, setDeadlineOverflowBusy] = useState(false);
  const [energyStepExiting, setEnergyStepExiting] = useState(false);
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
  const energyAdvanceTimerRef = useRef<number | null>(null);
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
  const MAX_DAYSTART_SUGGESTIONS = 40;
  const COLLAPSED_SUGGESTIONS = 4;

  /** Sorteervolgorde: taken die passen bij het gekozen dag-energieniveau eerst. */
  const getEnergyRankForTaskEnergy = useCallback(
    (taskEnergy: string): number => {
      const e = String(taskEnergy || "medium").toLowerCase();
      if (!energyLevel) return 3;
      if (energyLevel === "low") {
        if (e === "low") return 0;
        if (e === "medium") return 1;
        if (e === "high") return 2;
      } else if (energyLevel === "medium") {
        if (e === "medium") return 0;
        if (e === "low") return 1;
        if (e === "high") return 2;
      } else if (energyLevel === "high") {
        if (e === "high") return 0;
        if (e === "medium") return 1;
        if (e === "low") return 2;
      }
      return 3;
    },
    [energyLevel]
  );

  const getEnergyRankForSuggestions = useCallback(
    (task: any): number => getEnergyRankForTaskEnergy(task?.energyLevel),
    [getEnergyRankForTaskEnergy]
  );

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
      FOCUS_SLOT_NUMBERS.map((n) => top3Tasks[n]?.id).filter(Boolean) as string[]
    );

    const baseTasks = deferredTasksForSuggestions.filter((t: any) => {
      if (!t || !t.id || !t.title) return false;
      if (t.done || t.notToday || t.not_today) return false;
      if (t.source === "medication" || t.source === "event") return false;
      if (isDueStrictlyAfterToday(t.dueAt)) return false;
      if (selectedIds.has(t.id)) return false;
      return true;
    });

    const sorted = [...baseTasks].sort((a: any, b: any) => {
      const deadlineRank =
        rankTaskForDagstartSuggestions(a) - rankTaskForDagstartSuggestions(b);
      if (deadlineRank !== 0) return deadlineRank;
      if (
        rankTaskForDagstartSuggestions(a) === 0 &&
        rankTaskForDagstartSuggestions(b) === 0
      ) {
        const dueDiff = compareDeadlineTasks(a, b);
        if (dueDiff !== 0) return dueDiff;
      }
      const welcomeA = a.source === "onboarding_welcome" ? 0 : 1;
      const welcomeB = b.source === "onboarding_welcome" ? 0 : 1;
      if (welcomeA !== welcomeB) return welcomeA - welcomeB;
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
    [deferredTasksForSuggestions, top3Tasks, energyLevel, getEnergyRankForSuggestions]
  );

  type MergedSuggestionItem =
    | { kind: 'task'; task: any }
    | { kind: 'dagafsluiter'; row: DagafsluiterSuggestionRow };

  const mergedSuggestionItemsRaw = useMemo((): MergedSuggestionItem[] => {
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

    const rankItem = (item: MergedSuggestionItem) =>
      item.kind === 'task'
        ? getEnergyRankForSuggestions(item.task)
        : getEnergyRankForTaskEnergy(item.row.suggestedTaskEnergy || 'medium');

    const isDeadlineItem = (item: MergedSuggestionItem) =>
      item.kind === 'task' && rankTaskForDagstartSuggestions(item.task) === 0;

    items.sort((a, b) => {
      const deadlineFirst = Number(isDeadlineItem(b)) - Number(isDeadlineItem(a));
      if (deadlineFirst !== 0) return deadlineFirst;

      if (a.kind === 'task' && b.kind === 'task') {
        const deadlineRank =
          rankTaskForDagstartSuggestions(a.task) -
          rankTaskForDagstartSuggestions(b.task);
        if (deadlineRank !== 0) return deadlineRank;
        if (
          rankTaskForDagstartSuggestions(a.task) === 0 &&
          rankTaskForDagstartSuggestions(b.task) === 0
        ) {
          const dueDiff = compareDeadlineTasks(a.task, b.task);
          if (dueDiff !== 0) return dueDiff;
        }
      }
      const energyDiff = rankItem(a) - rankItem(b);
      if (energyDiff !== 0) return energyDiff;
      if (a.kind === 'task' && b.kind === 'task') {
        const welcomeA = a.task.source === "onboarding_welcome" ? 0 : 1;
        const welcomeB = b.task.source === "onboarding_welcome" ? 0 : 1;
        if (welcomeA !== welcomeB) return welcomeA - welcomeB;
        const impactDiff =
          getImpactRankForSuggestions(a.task) - getImpactRankForSuggestions(b.task);
        if (impactDiff !== 0) return impactDiff;
        const durA = a.task.duration || a.task.estimatedDuration || 999;
        const durB = b.task.duration || b.task.estimatedDuration || 999;
        if (durA !== durB) return durA - durB;
        return String(a.task.title || "").localeCompare(String(b.task.title || ""));
      }
      if (a.kind === 'dagafsluiter' && b.kind === 'dagafsluiter') {
        return String(a.row.content || "").localeCompare(String(b.row.content || ""));
      }
      return a.kind === 'dagafsluiter' ? -1 : 1;
    });

    return items.slice(0, MAX_DAYSTART_SUGGESTIONS);
  }, [
    energyLevel,
    dagafsluiterRows,
    allRankedSuggestions,
    getEnergyRankForSuggestions,
    getEnergyRankForTaskEnergy,
  ]);

  const mergedSuggestionItems = useDeferredValue(mergedSuggestionItemsRaw);

  const structuroCandidateTasks = useMemo(() => {
    return mergedSuggestionItems
      .filter((item): item is { kind: 'task'; task: any } => item.kind === 'task')
      .map((item) => item.task);
  }, [mergedSuggestionItems]);

  const collapsedSuggestions = useMemo(() => {
    if (!energyLevel || mergedSuggestionItems.length === 0) return [] as MergedSuggestionItem[];
    const selIds = FOCUS_SLOT_NUMBERS.map((n) => top3Tasks[n]?.id).filter(Boolean) as string[];
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
    setSkippedCardIds(new Set());
  }, [energyLevel]);

  useEffect(() => {
    const format = () => {
      const now = new Date();
      const loc = locale === 'en' ? 'en-GB' : 'nl-NL';
      const datePart = now.toLocaleDateString(loc, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'Europe/Amsterdam',
      });
      const timePart = now.toLocaleTimeString(loc, {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Amsterdam',
      });
      const cap = datePart.charAt(0).toUpperCase() + datePart.slice(1);
      setDateTimeLine(`${cap} · ${timePart}`);
    };
    format();
    const id = window.setInterval(format, 30_000);
    return () => window.clearInterval(id);
  }, [locale]);

  // KRITIEK: Bereken max slots op basis van energie niveau
  const maxSlots = useMemo(() => {
    if (!energyLevel) return 3;
    if (energyLevel === 'low' || energyLevel === 'medium' || energyLevel === 'high') {
      return maxSlotsForDayEnergy(energyLevel);
    }
    return 3;
  }, [energyLevel]);

  const effectiveMaxSlots = Math.min(maxSlots + extraFocusSlots, MAX_FOCUS_SLOTS);

  const dagstartTaskPool = useMemo(() => {
    return deferredTasksForSuggestions.filter((t: any) => {
      if (!t?.id || !String(t.title ?? '').trim()) return false;
      if (t.done || t.notToday || t.not_today) return false;
      if (t.source === 'medication' || t.source === 'event') return false;
      if (isDueStrictlyAfterToday(t.dueAt)) return false;
      return true;
    });
  }, [deferredTasksForSuggestions]);

  /** Minstens één bruikbare taak (dagstart stap 2); anders leeg-staat i.p.v. lege vakjes. */
  const hasUsableTasksForDayStart = useMemo(() => {
    return tasks.some((t: any) => {
      if (!t?.id || !String(t.title ?? '').trim()) return false;
      if (t.done || t.notToday) return false;
      if (t.source === 'medication' || t.source === 'event') return false;
      if (isDueStrictlyAfterToday(t.dueAt)) return false;
      return true;
    });
  }, [tasks]);

  const showNoTasksDayStart =
    !tasksContextLoading && !hasUsableTasksForDayStart && dagafsluiterRows.length === 0;
  /** Stap 2: tijdens fetch geen lege vakjes/suggesties tonen (voorkomt flitsende misleidende UI). */
  const isStep2LoadingTasks = Boolean(energyLevel && tasksContextLoading);

  /** Zelfde regel als bij opslaan: slot telt alleen mee met open taak (id + titel, niet done/niet vandaag). */
  const slotHasUsableTask = useCallback((slotNum: number) => {
    return isExistingOpenTaskForTop3Save(top3Tasks[slotNum]);
  }, [top3Tasks]);

  const filledSlots = useMemo(() => {
    if (!energyLevel) {
      return FOCUS_SLOT_NUMBERS.filter((n) => slotHasUsableTask(n)).length;
    }
    return FOCUS_SLOT_NUMBERS.filter(
      (n) => n <= effectiveMaxSlots && slotHasUsableTask(n)
    ).length;
  }, [top3Tasks, energyLevel, slotHasUsableTask, effectiveMaxSlots]);

  const getFirstAvailableSlotNumber = useCallback((): number | null => {
    if (!energyLevel) return null;
    for (let n = 1; n <= effectiveMaxSlots; n++) {
      if (!slotHasUsableTask(n)) return n;
    }
    return null;
  }, [energyLevel, effectiveMaxSlots, slotHasUsableTask]);

  // Naam: preferred_name → display_name → e-mail (Europe/Amsterdam begroeting)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const emailFallback = authUser?.email
        ? resolveDayStartFirstName({ email: authUser.email })
        : "";

      if (!authUser?.id) {
        if (typeof window !== "undefined") {
          const storedName = localStorage.getItem("structuro_user_name");
          if (storedName && !cancelled) {
            setUserName(resolveDayStartFirstName({ preferredName: storedName }));
          } else if (emailFallback && !cancelled) {
            setUserName(emailFallback);
          }
        }
        return;
      }

      try {
        const supabase = createClient();
        const { data: profile } = await supabase
          .from("profiles")
          .select("preferred_name, display_name")
          .eq("id", authUser.id)
          .maybeSingle();

        if (cancelled) return;

        const resolved = resolveDayStartFirstName({
          preferredName: profile?.preferred_name,
          displayName: profile?.display_name,
          email: authUser.email,
        });

        if (resolved) {
          setUserName(resolved);
          const fullName =
            profile?.preferred_name?.trim() ||
            profile?.display_name?.trim() ||
            null;
          if (fullName) {
            try {
              localStorage.setItem("structuro_user_name", fullName);
            } catch {
              /* ignore */
            }
          }
        } else if (emailFallback) {
          setUserName(emailFallback);
        }
      } catch {
        if (!cancelled && emailFallback) setUserName(emailFallback);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authUser?.id, authUser?.email]);

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
      
      debugLog('🔍 Loading existing check-in tasks:', taskIds, 'Type:', typeof taskIds, 'IsArray:', Array.isArray(taskIds));
      
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
            debugLog(`✅ Loaded task ${task.id} (${task.title}) into slot ${finalSlotNumber}`, {
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
      debugLog('✅ Loaded existing check-in:', slots);
      debugLog('✅ top3Tasks state after set:', Object.keys(slots).map(k => ({ slot: k, task: slots[Number(k)]?.title || 'null' })));
      
      // KRITIEK: Trigger een re-render door fetchTasks aan te roepen
      // Dit zorgt ervoor dat de tasks array wordt geüpdatet en de UI wordt gerefresht
      fetchTasks().then(() => {
        debugLog('✅ fetchTasks completed after loading existing check-in');
      });
  }, [checkInFromDb, existingCheckIn, tasks, fetchTasks]);

  const handleDrop = async (
    slotNumber: number,
    taskToUse: any,
    options?: { fromCardSwipe?: boolean }
  ) => {
    if (!taskToUse || !taskToUse.id) {
      console.warn('No task in handleDrop');
      return;
    }

    const fromCardSwipe = options?.fromCardSwipe === true;

    try {
      userHasInteractedRef.current = true;

      const applyTop3Update = () => {
        setTop3Tasks((prevTop3Tasks) => {
          const taskToRemove =
            prevTop3Tasks[slotNumber] && prevTop3Tasks[slotNumber].id !== taskToUse.id
              ? prevTop3Tasks[slotNumber]
              : null;
          lastReplacedTaskRef.current = taskToRemove;

          const newTop3Tasks: { [key: number]: any } = {
            1: null,
            2: null,
            3: null,
            4: null,
          };

          FOCUS_SLOT_NUMBERS.forEach((num) => {
            const existingTask = prevTop3Tasks[num];
            if (existingTask && existingTask.id && existingTask.id !== taskToUse.id) {
              if (num === slotNumber && taskToRemove && existingTask.id === taskToRemove.id) {
                return;
              }
              newTop3Tasks[num] = existingTask;
            }
          });

          const taskWithPriority = {
            ...taskToUse,
            priority: slotNumber,
          };
          newTop3Tasks[slotNumber] = taskWithPriority;

          top3TasksRef.current = newTop3Tasks;
          return newTop3Tasks;
        });
      };

      if (fromCardSwipe) {
        startTransition(applyTop3Update);
      } else {
        setIsUpdating(true);
        applyTop3Update();
        await yieldToMain();
      }

      const runDeferred = () => {
        void (async () => {
        try {
      // STAP 4: Verwijder de oude taak uit localStorage (priority = null) zodat deze terugkomt in suggesties
      // BELANGRIJK: Dit gebeurt NA de optimistic update, zodat getFilteredTasks de taak direct kan zien
      const taskToRemove = lastReplacedTaskRef.current;
      if (taskToRemove) {
        debugLog(`🔄 Removing existing task from slot ${slotNumber}: ${taskToRemove.id} (${taskToRemove.title})`);
        
        try {
          // Check of taak bestaat in localStorage
          const tasksInStorage = getTasksFromStorage();
          const taskExists = tasksInStorage.find((t: any) => t.id === taskToRemove.id);
          
          if (taskExists) {
            // KRITIEK: Verifieer dat de taak nog bestaat VOORDAT we updaten
            debugLog(`🔍 VOOR UPDATE - Task details:`, {
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
              debugLog(`✅ Task ${taskToRemove.id} teruggezet naar suggesties (priority = null)`, {
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
                debugLog(`✅ Task ${taskToRemove.id} hersteld in localStorage`);
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
        debugLog(`🔄 Removing dragged task from old slot ${oldSlot}`);
        
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
        debugLog('✅ Task added to localStorage:', taskToAdd);
      } else {
        debugLog('✅ Task exists in localStorage, updating priority');
      }
      
      // STAP 7: Zet nieuwe prioriteit - gebruik updateTask(taskId, { priority: slotNumber })
      // BELANGRIJK: Dit update ALLEEN priority, alle andere velden (zoals energyLevel) blijven behouden
      // KRITIEK: Behoud energyLevel expliciet om te voorkomen dat deze verloren gaat
      const preservedEnergyLevel = taskToUse.energyLevel || 'medium';
      debugLog(`🔄 DayStart: Updating task ${taskToUse.id} with priority ${slotNumber}, energyLevel: ${preservedEnergyLevel}`);
      await updateTask(taskToUse.id, { 
        priority: slotNumber,
        energyLevel: preservedEnergyLevel // Expliciet behouden
      });
      
      // STAP 8: VERIFICATIE - controleer of taak correct is opgeslagen
      const tasksAfterUpdate = getTasksFromStorage();
      const updatedTask = tasksAfterUpdate.find((t: any) => t.id === taskToUse.id);
      debugLog('🔍 DayStart: Task after update in localStorage:', updatedTask ? {
        id: updatedTask.id,
        title: updatedTask.title,
        priority: updatedTask.priority,
        energyLevel: updatedTask.energyLevel
      } : 'NOT FOUND');
      
      // Sync event alleen buiten card-swipe: updateTask triggert al een sync voor Supabase-users.
      if (!fromCardSwipe && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('structuro_tasks_updated'));
        debugLog('🔄 DayStart: Sync event triggered');
      }
      
      // Eén fetch na paint: minder flitsen dan meerdere updates + sleeps.
      if (!fromCardSwipe) {
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
        await fetchTasks();
      }

      trackTaskSelected(slotNumber);

      if (!fromCardSwipe) {
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
        startTransition(() => {
          setIsUpdating(false);
        });
      }

      setRecentlyAdded(taskToUse.id);
      setTimeout(() => setRecentlyAdded(null), 650);

        } catch (error) {
          console.error('❌ Error in handleDrop (deferred):', error);
          toast(tr('dayStart.toastAddFail'));

          try {
            await fetchTasks();

            const allTasks = getTasksFromStorage();
            const restoredTop3Tasks: { [key: number]: any } = { 1: null, 2: null, 3: null };

            for (let i = 1; i <= 3; i++) {
              const task = allTasks.find((t: any) => t.priority == i);
              if (task) {
                restoredTop3Tasks[i] = task;
              }
            }

            setTop3Tasks(restoredTop3Tasks);
            debugLog('✅ State hersteld na error in handleDrop');
          } catch (restoreError) {
            console.error('❌ Error restoring state:', restoreError);
          }

          setIsUpdating(false);
        }
      })();
      };

      if (fromCardSwipe) {
        if (typeof window.requestIdleCallback === 'function') {
          window.requestIdleCallback(() => runDeferred(), { timeout: 1200 });
        } else {
          window.setTimeout(runDeferred, 48);
        }
      } else {
        runDeferred();
      }

    } catch (error) {
      console.error('❌ Error in handleDrop:', error);
      toast(tr('dayStart.toastAddFail'));
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
    const alreadyFocused = FOCUS_SLOT_NUMBERS.some((n) => top3Tasks[n]?.id === task.id);
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
      top3TasksRef.current = newTop3Tasks;
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

  /** Verberg slots buiten energielimiet (extra deadline-slots blijven staan). */
  useEffect(() => {
    if (!energyLevel) return;
    setExtraFocusSlots(0);
    let hasOverflow = false;
    for (let n = maxSlots + 1; n <= MAX_FOCUS_SLOTS; n++) {
      if (top3Tasks[n]?.id) {
        hasOverflow = true;
        break;
      }
    }
    if (!hasOverflow) return;

    let cancelled = false;
    (async () => {
      for (let slotNum = MAX_FOCUS_SLOTS; slotNum > maxSlots; slotNum--) {
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
  }, [energyLevel, maxSlots]);

  const handleSubmit = async () => {
    if (!energyLevel) {
      toast(tr('dayStart.toastPickEnergy'));
      return;
    }

    if (filledSlots < 1) {
      toast(tr('dayStart.toastPickOne'));
      return;
    }

    const submitMaxSlots = effectiveMaxSlots;

    setIsSubmitting(true);
    await yieldToMain();

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
      
      // KRITIEK: Als top3Tasks leeg is, probeer taken uit localStorage te halen met priority 1-3
      let tasksToProcess: { [key: number]: any } = { ...top3TasksRef.current };
      for (let n = submitMaxSlots + 1; n <= MAX_FOCUS_SLOTS; n++) {
        tasksToProcess[n] = null;
      }

      let top3Ids = collectTop3TaskIdsFromSlots(tasksToProcess, submitMaxSlots);

      const eligibleTop3Ids = top3Ids.filter((id) => {
        const slotTask = Object.values(tasksToProcess).find(
          (t: any) => t && String(t.id) === id
        );
        if (slotTask && isExistingOpenTaskForTop3Save(slotTask)) return true;
        const task =
          tasksBeforeUpdate.find((t: any) => String(t.id) === id) ??
          tasks.find((t: any) => String(t.id) === id);
        return isExistingOpenTaskForTop3Save(task);
      });

      const selectedIdsBeforeSanitize = [...top3Ids];
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
      
      if (top3Ids.length < submitMaxSlots && filledSlots >= submitMaxSlots) {
        console.error('[DayStart] Focus read mismatch', {
          top3Ids,
          filledSlots,
          tasksToProcess: top3TasksRef.current,
        });
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
            debugLog('📝 Preparing to add missing task:', taskToAdd.id, taskToAdd.title);
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
              debugLog('✅ Added', newTasks.length, 'missing tasks to localStorage');
            } else {
              debugLog('ℹ️ All tasks already exist in localStorage');
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
          debugLog('🔍 Using only existing tasks:', existingTop3Ids);
          // Update top3Ids om alleen bestaande taken te gebruiken
          top3Ids.length = 0;
          top3Ids.push(...existingTop3Ids);
        }
      }
      
      // KRITIEK: DIRECTE OPSLAG in localStorage - dit is de ENIGE manier om zeker te zijn dat taken blijven bestaan
      // Gebruik NIET updateTask omdat die async is en race conditions kan veroorzaken
      // Gebruik merge-bron (niet alleen getTasksFromStorage): ingelogde users hebben taken vooral in Supabase-context.
      const allTasks = tasksBeforeUpdate;
      
      const top3ByTaskId = new Map<
        string,
        { slotNumber: string; taskFromState: { energyLevel?: string; duration?: number | null } }
      >();
      for (const [slotNumber, task] of Object.entries(tasksToProcess)) {
        if (task?.id) {
          top3ByTaskId.set(String(task.id), { slotNumber, taskFromState: task });
        }
      }
      const top3IdSet = new Set(top3Ids.map(String));

      const updatedTasks = allTasks.map((t: any) => {
        const top3Entry = top3ByTaskId.get(String(t.id));

        if (top3Entry) {
          const { slotNumber, taskFromState } = top3Entry;
          const priority = parseInt(String(slotNumber), 10);

          if (Number.isNaN(priority) || priority < 1 || priority > 3) {
            console.error(`❌ INVALID PRIORITY: slotNumber=${slotNumber}, priority=${priority}`);
            return t;
          }

          const preservedEnergyLevel = taskFromState?.energyLevel || t.energyLevel || 'medium';
          const preservedDuration = taskFromState?.duration ?? t.duration ?? null;

          return {
            ...t,
            energyLevel: preservedEnergyLevel,
            duration: preservedDuration,
            priority,
            notToday: false,
            done: false,
            updated_at: new Date().toISOString(),
          };
        }

        if (t.priority && t.priority >= 1 && t.priority <= 3 && !top3IdSet.has(String(t.id))) {
          return {
            ...t,
            priority: null,
            updated_at: new Date().toISOString(),
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
      
      saveTasksToStorage(updatedTasks);

      const tasksAfterSave = getTasksFromStorage();
      const stillMissing = top3Ids.filter(
        (id) => !tasksAfterSave.some((t: any) => String(t.id) === String(id))
      );
      if (stillMissing.length > 0) {
        console.error('❌ KRITIEKE FOUT: Taken verdwenen na directe opslag:', stillMissing);
        toast(tr('dayStart.toastTasksMissing', { n: String(stillMissing.length) }));
        return;
      }
      
      await yieldToMain();
      await fetchTasks();
      await yieldToMain();

      // Sla check-in op (Supabase bij ingelogde user, anders localStorage) — met timeout tegen eeuwig hangen.
      // Stille opslag van cyclus-fase als gebruiker consent heeft (geen UI-impact in fase 1).
      const cyclePhaseToday = cycleConsentOn ? computePhaseToday() : null;
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

      await yieldToMain();
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

  const handleEnergyPick = useCallback(
    (value: 'low' | 'medium' | 'high') => {
      if (energyAdvanceTimerRef.current) {
        clearTimeout(energyAdvanceTimerRef.current);
        energyAdvanceTimerRef.current = null;
      }
      if (firstTimeOnboarding) setEnergyOnboardingHintHidden(true);
      setEnergyLevel(value);
      setEnergyStepExiting(true);
      queueMicrotask(() => {
        trackEnergyChecked(
          value === 'low' ? 'laag' : value === 'high' ? 'hoog' : 'normaal'
        );
      });
      energyAdvanceTimerRef.current = window.setTimeout(() => {
        energyAdvanceTimerRef.current = null;
        startTransition(() => {
          setTaskPickMode('choosing');
          setStructuroSwapSlot(null);
          setDagstartPhase('tasks');
          setEnergyStepExiting(false);
        });
      }, 220);
    },
    [firstTimeOnboarding]
  );

  useEffect(() => {
    return () => {
      if (energyAdvanceTimerRef.current) {
        clearTimeout(energyAdvanceTimerRef.current);
      }
    };
  }, []);

  const handleCardDecide = useCallback(
    async (id: string, action: 'keep' | 'skip') => {
      if (action === 'skip') {
        setSkippedCardIds((prev) => new Set(prev).add(id));
        return;
      }
      const slot = getFirstAvailableSlotNumber();
      if (slot == null) {
        toast(tr('dayStart.toastSlotsFull'));
        return;
      }
      const dagRow = dagafsluiterRows.find((r) => r.id === id);
      if (dagRow) {
        const e = dagRow.suggestedTaskEnergy || 'medium';
        const taskEnergy =
          e === 'low' || e === 'medium' || e === 'high' ? e : 'medium';
        try {
          const created = await addTask({
            title: dagRow.content,
            done: false,
            started: false,
            priority: null,
            dueAt: null,
            duration: 15,
            source: 'regular',
            reminders: [],
            repeat: 'none',
            impact: '🌱',
            energyLevel: taskEnergy,
            estimatedDuration: 15,
            microSteps: [],
            notToday: false,
          });
          await convertThoughtToTask(dagRow.id, created.id);
          setDagafsluiterRows((prev) => prev.filter((r) => r.id !== dagRow.id));
          await handleDrop(slot, created);
        } catch (e) {
          console.error('dagafsluiter card keep:', e);
          toast(tr('dayStart.toastCantAdd'));
        }
        return;
      }
      const task =
        tasks.find((t: any) => String(t.id) === id) ??
        deferredTasksForSuggestions.find((t: any) => String(t.id) === id);
      if (!task) {
        console.warn('dagstart card keep: task not found', id);
        toast(tr('dayStart.toastFocusReadError'));
        return;
      }
      try {
        void handleDrop(slot, task, { fromCardSwipe: true });
      } catch (e) {
        console.error('dagstart card keep:', e);
        toast(tr('dayStart.toastAddFail'));
      }
    },
    [
      getFirstAvailableSlotNumber,
      dagafsluiterRows,
      addTask,
      handleDrop,
      tasks,
      deferredTasksForSuggestions,
      tr,
    ]
  );

  const handleReviewStackAgain = useCallback(() => {
    setSkippedCardIds(new Set());
    setStackAddOpen(false);
  }, []);

  const handleStackAddFromFlow = useCallback(
    async (payload: NewTaskFlowPayload) => {
      if (stackAddBusy || !energyLevel) {
        throw new Error("daystart_stack_add_unavailable");
      }
      setStackAddBusy(true);
      try {
        const created = await addTask(buildTaskFromFlowPayload(payload));
        setStackInjectedTaskIds((prev) => [
          created.id,
          ...prev.filter((id) => id !== created.id),
        ]);
        setSkippedCardIds((prev) => {
          const next = new Set(prev);
          next.delete(created.id);
          return next;
        });
        setStackAddOpen(false);
        await fetchTasks();
      } catch (e) {
        console.error('stack add daystart:', e);
        toast(tr('dayStart.toastCantAdd'));
        throw e;
      } finally {
        setStackAddBusy(false);
      }
    },
    [stackAddBusy, energyLevel, addTask, fetchTasks, tr]
  );

  const handleDockRemove = useCallback(
    (id: string) => {
      const slot = FOCUS_SLOT_NUMBERS.find((n) => top3Tasks[n]?.id === id);
      if (slot != null) void handleRemoveFromSlot(slot);
    },
    [top3Tasks, handleRemoveFromSlot]
  );

  const resetTaskPickState = useCallback(() => {
    setTaskPickMode('choosing');
    setStructuroSwapSlot(null);
    setStructuroPickBusy(false);
    setTop3Tasks({ 1: null, 2: null, 3: null, 4: null });
    setSkippedCardIds(new Set());
    setExtraFocusSlots(0);
    setDeadlineOverflowQueue([]);
  }, []);

  const applyDeadlinePrefill = useCallback(
    async (mode: 'self' | 'structuro') => {
      if (
        !energyLevel ||
        (energyLevel !== 'low' && energyLevel !== 'medium' && energyLevel !== 'high')
      ) {
        return;
      }
      const dayEnergy = energyLevel as DayEnergy;
      const plan = buildDagstartTaskPlan(
        dagstartTaskPool,
        structuroCandidateTasks,
        dayEnergy,
        maxSlots,
        getCalendarDateAmsterdam(),
        getImpactRankForSuggestions
      );

      setTop3Tasks({ 1: null, 2: null, 3: null, 4: null });
      setSkippedCardIds(new Set());
      setExtraFocusSlots(0);
      setDeadlineOverflowQueue([]);

      let slot = 1;
      for (const task of plan.deadlineAutoFill) {
        await handleDrop(slot, task);
        slot += 1;
      }

      if (mode === 'structuro') {
        for (const task of plan.structuroFill) {
          await handleDrop(slot, task);
          slot += 1;
        }
        if (
          plan.deadlineAutoFill.length === 0 &&
          plan.structuroFill.length === 0 &&
          plan.deadlineOverflow.length === 0
        ) {
          toast(tr('dayStart.structuroNoTasks'));
          return;
        }
        setTaskPickMode('structuro');
      }

      if (plan.deadlineOverflow.length > 0) {
        setDeadlineOverflowQueue(plan.deadlineOverflow);
      }
    },
    [
      energyLevel,
      dagstartTaskPool,
      structuroCandidateTasks,
      maxSlots,
      getImpactRankForSuggestions,
      handleDrop,
      tr,
    ]
  );

  const handlePickSelf = useCallback(() => {
    setTaskPickMode('self');
    void applyDeadlinePrefill('self');
  }, [applyDeadlinePrefill]);

  const handleDeadlineOverflowPostpone = useCallback(async () => {
    const task = deadlineOverflowQueue[0];
    if (!task?.id || deadlineOverflowBusy) return;
    setDeadlineOverflowBusy(true);
    try {
      await updateTask(String(task.id), {
        dueAt: calendarDayToDueAt(getTomorrowCalendarDateAmsterdam()),
      });
      await fetchTasks();
      setDeadlineOverflowQueue((queue) => queue.slice(1));
    } catch (e) {
      console.error('deadline overflow postpone:', e);
      toast(tr('dayStart.toastAddFail'));
    } finally {
      setDeadlineOverflowBusy(false);
    }
  }, [deadlineOverflowQueue, deadlineOverflowBusy, updateTask, fetchTasks, tr]);

  const handleDeadlineOverflowAdd = useCallback(async () => {
    const task = deadlineOverflowQueue[0];
    if (!task?.id || deadlineOverflowBusy) return;
    const nextSlot = maxSlots + extraFocusSlots + 1;
    if (nextSlot > MAX_FOCUS_SLOTS) {
      setDeadlineOverflowQueue((queue) => queue.slice(1));
      return;
    }
    setDeadlineOverflowBusy(true);
    try {
      setExtraFocusSlots((prev) => prev + 1);
      await handleDrop(nextSlot, task);
      setDeadlineOverflowQueue((queue) => queue.slice(1));
    } catch (e) {
      console.error('deadline overflow add:', e);
      toast(tr('dayStart.toastAddFail'));
    } finally {
      setDeadlineOverflowBusy(false);
    }
  }, [
    deadlineOverflowQueue,
    deadlineOverflowBusy,
    maxSlots,
    extraFocusSlots,
    handleDrop,
    tr,
  ]);

  const handlePickStructuro = useCallback(async () => {
    if (
      structuroPickBusy ||
      !energyLevel ||
      (energyLevel !== 'low' && energyLevel !== 'medium' && energyLevel !== 'high')
    ) {
      return;
    }
    setStructuroPickBusy(true);
    try {
      await applyDeadlinePrefill('structuro');
    } catch (e) {
      console.error('structuro pick:', e);
      toast(tr('dayStart.toastAddFail'));
    } finally {
      setStructuroPickBusy(false);
    }
  }, [structuroPickBusy, energyLevel, applyDeadlinePrefill, tr]);

  const handleStructuroSwapSlot = useCallback(
    async (slot: number, replacementTask: any) => {
      if (taskPickMode !== 'structuro') return;
      try {
        await handleDrop(slot, replacementTask);
        setStructuroSwapSlot(null);
        toast(tr('dayStart.toastSwapDone'));
      } catch (e) {
        console.error('structuro swap:', e);
        toast(tr('dayStart.toastAddFail'));
      }
    },
    [taskPickMode, handleDrop, tr]
  );

  const handleSuggestionItemPick = useCallback(
    async (item: SuggestionListItem) => {
      const targetSlot =
        taskPickMode === 'structuro' && structuroSwapSlot != null
          ? structuroSwapSlot
          : getFirstAvailableSlotNumber();
      if (targetSlot == null) {
        toast(tr('dayStart.toastSlotsFull'));
        return;
      }

      if (item.kind === 'reminder') {
        const dagRow = dagafsluiterRows.find((r) => r.id === item.id);
        if (!dagRow) return;
        const e = dagRow.suggestedTaskEnergy || 'medium';
        const taskEnergy =
          e === 'low' || e === 'medium' || e === 'high' ? e : 'medium';
        try {
          const created = await addTask({
            title: dagRow.content,
            done: false,
            started: false,
            priority: null,
            dueAt: null,
            duration: 15,
            source: 'regular',
            reminders: [],
            repeat: 'none',
            impact: '🌱',
            energyLevel: taskEnergy,
            estimatedDuration: 15,
            microSteps: [],
            notToday: false,
          });
          await convertThoughtToTask(dagRow.id, created.id);
          setDagafsluiterRows((prev) => prev.filter((r) => r.id !== dagRow.id));
          if (taskPickMode === 'structuro' && structuroSwapSlot != null) {
            await handleStructuroSwapSlot(structuroSwapSlot, created);
          } else {
            await handleDrop(targetSlot, created);
          }
        } catch (e) {
          console.error('suggestion reminder pick:', e);
          toast(tr('dayStart.toastCantAdd'));
        }
        return;
      }

      const task =
        tasks.find((t: any) => String(t.id) === item.id) ??
        deferredTasksForSuggestions.find((t: any) => String(t.id) === item.id);
      if (!task) {
        toast(tr('dayStart.toastFocusReadError'));
        return;
      }

      setSuggestionPickingId(item.id);
      try {
        if (taskPickMode === 'structuro' && structuroSwapSlot != null) {
          await handleStructuroSwapSlot(structuroSwapSlot, task);
        } else {
          await handleDrop(targetSlot, task);
          setStructuroSwapSlot(null);
        }
      } catch (e) {
        console.error('suggestion pick:', e);
        toast(tr('dayStart.toastAddFail'));
      } finally {
        setSuggestionPickingId(null);
      }
    },
    [
      taskPickMode,
      structuroSwapSlot,
      getFirstAvailableSlotNumber,
      dagafsluiterRows,
      addTask,
      handleStructuroSwapSlot,
      handleDrop,
      tasks,
      deferredTasksForSuggestions,
      tr,
    ]
  );

  const dayStartGreetingLine = useMemo(() => {
    const name = userName?.trim();
    if (!name) return null;
    const period = getDayStartTimeOfDay();
    if (period === "morning") return tr("dayStart.greetingMorning", { name });
    if (period === "afternoon") return tr("dayStart.greetingAfternoon", { name });
    return tr("dayStart.greetingEvening", { name });
  }, [userName, tr]);

  const keptCardTasks = useMemo((): DagstartCardTask[] => {
    return FOCUS_SLOT_NUMBERS.filter((n) => n <= effectiveMaxSlots)
      .map((n) => top3Tasks[n])
      .filter(Boolean)
      .map((task) => taskToDagstartCard(task, locale === 'en' ? 'en' : 'nl'));
  }, [top3Tasks, effectiveMaxSlots, locale]);

  const keptTotalMinutes = useMemo(
    () => keptCardTasks.reduce((sum, t) => sum + t.minutes, 0),
    [keptCardTasks]
  );

  const cardQueue = useMemo((): DagstartCardTask[] => {
    if (!energyLevel) return [];
    const keptIds = new Set(
      FOCUS_SLOT_NUMBERS.map((n) => top3Tasks[n]?.id).filter(Boolean) as string[]
    );
    const cardLocale = locale === 'en' ? 'en' : 'nl';
    const items: DagstartCardTask[] = [];
    for (const item of mergedSuggestionItems) {
      if (item.kind === 'task') {
        if (keptIds.has(item.task.id) || skippedCardIds.has(item.task.id)) continue;
        items.push(taskToDagstartCard(item.task, cardLocale));
      } else {
        if (keptIds.has(item.row.id) || skippedCardIds.has(item.row.id)) continue;
        items.push({
          id: item.row.id,
          title: item.row.content,
          minutes: 15,
          energy: appEnergyToSt(item.row.suggestedTaskEnergy),
          tone: tr('dayStart.reminderTone'),
        });
      }
    }

    const seen = new Set(items.map((c) => c.id));
    const injectedFront: DagstartCardTask[] = [];
    for (const id of stackInjectedTaskIds) {
      if (keptIds.has(id) || skippedCardIds.has(id) || seen.has(id)) continue;
      const task =
        tasks.find((t: any) => String(t.id) === id) ??
        deferredTasksForSuggestions.find((t: any) => String(t.id) === id);
      if (task?.title) {
        injectedFront.push(taskToDagstartCard(task, cardLocale));
        seen.add(id);
      }
    }

    const merged = [
      ...injectedFront,
      ...items.filter((c) => !injectedFront.some((f) => f.id === c.id)),
    ];

    const findPoolTask = (id: string) =>
      tasks.find((t: any) => String(t.id) === id) ??
      deferredTasksForSuggestions.find((t: any) => String(t.id) === id);

    const deadlineCards: DagstartCardTask[] = [];
    const otherCards: DagstartCardTask[] = [];
    for (const card of merged) {
      const poolTask = findPoolTask(card.id);
      if (poolTask && rankTaskForDagstartSuggestions(poolTask) === 0) {
        deadlineCards.push(card);
      } else {
        otherCards.push(card);
      }
    }

    deadlineCards.sort((a, b) => {
      const ta = findPoolTask(a.id);
      const tb = findPoolTask(b.id);
      if (ta && tb) return compareDeadlineTasks(ta, tb);
      return 0;
    });

    return [...deadlineCards, ...otherCards];
  }, [
    energyLevel,
    mergedSuggestionItems,
    top3Tasks,
    skippedCardIds,
    stackInjectedTaskIds,
    tasks,
    deferredTasksForSuggestions,
    tr,
    locale,
  ]);

  const isSwipeExhausted =
    !isStep2LoadingTasks &&
    cardQueue.length === 0 &&
    keptCardTasks.length === 0 &&
    skippedCardIds.size > 0;

  const allTasksSelectedInDock =
    !isStep2LoadingTasks &&
    Boolean(energyLevel) &&
    filledSlots >= maxSlots &&
    filledSlots > 0;

  const greetingParts = dayStartGreetingLine?.split(',') ?? [];
  const greetingLead = dayStartGreetingLine
    ? `${greetingParts[0]?.trim() || tr('dayStart.greetingMorning')},`
    : null;
  const greetingName =
    greetingParts[1]?.trim().replace(/\.$/, '') || userName?.trim() || null;

  const energyPillLabel =
    energyLevel === 'low'
      ? tr('dayStart.energyPillLow')
      : energyLevel === 'high'
        ? tr('dayStart.energyPillHigh')
        : energyLevel === 'medium'
          ? tr('dayStart.energyPillMed')
          : '';

  const energyIconKind: EnergyIconKind =
    energyLevel === 'low' ? 'low' : energyLevel === 'high' ? 'high' : 'medium';

  const hasMinFocus = filledSlots >= 1;
  const canSubmit = Boolean(energyLevel) && !isSubmitting && hasMinFocus;
  const ctaText = hasMinFocus
    ? existingCheckIn
      ? tr('dayStart.saveChanges')
      : tr('dayStart.startDay')
    : tr('dayStart.pickTasksFirst');
  const dockUnit =
    keptCardTasks.length === 1 ? tr('dayStart.dockUnitOne') : tr('dayStart.dockUnitMany');

  const focusedTaskIds = useMemo(() => {
    return new Set(
      FOCUS_SLOT_NUMBERS.map((n) => top3Tasks[n]?.id).filter(Boolean) as string[]
    );
  }, [top3Tasks]);

  const suggestionListItems = useMemo((): SuggestionListItem[] => {
    return mergedSuggestionItems.map((item) => {
      if (item.kind === 'task') {
        return {
          kind: 'task' as const,
          id: String(item.task.id),
          title: String(item.task.title ?? ''),
          energyLevel: item.task.energyLevel,
          minutes: item.task.duration || item.task.estimatedDuration || 15,
        };
      }
      return {
        kind: 'reminder' as const,
        id: item.row.id,
        title: item.row.content,
        energyLevel: item.row.suggestedTaskEnergy,
        badge: tr('dayStart.reminderBadge'),
      };
    });
  }, [mergedSuggestionItems, tr]);

  const focusSlotConfigs = useMemo(() => {
    const defs = [
      { label: tr('dayStart.slot1Label'), description: tr('dayStart.slot1Desc') },
      { label: tr('dayStart.slot2Label'), description: tr('dayStart.slot2Desc') },
      { label: tr('dayStart.slot3Label'), description: tr('dayStart.slot3Desc') },
      { label: tr('dayStart.slot4Label'), description: tr('dayStart.slot4Desc') },
    ];
    return FOCUS_SLOT_NUMBERS.filter((n) => n <= effectiveMaxSlots).map((slot) => ({
      slot,
      label: defs[slot - 1].label,
      description: defs[slot - 1].description,
      task: top3Tasks[slot],
    }));
  }, [effectiveMaxSlots, top3Tasks, tr]);

  const energyBanner =
    energyLevel === 'low' || energyLevel === 'medium' || energyLevel === 'high'
      ? energyBannerCopy(energyLevel, tr)
      : null;

  if (dagstartPhase === 'energy') {
    const cycleContext =
      cycleConsentOn ? (
        <CycleEnergyContext consentOn={cycleConsentOn} profile={cycleProfile} />
      ) : null;

    return (
      <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-y-auto bg-[#F1F3F8]">
        <div className="mx-auto flex min-h-full w-full max-w-sm flex-col items-center justify-center px-4 py-6 pb-20 sm:py-8">
          <div className="mb-4 flex items-center justify-center gap-2">
            <img
              src="/logo-structuro.png"
              alt=""
              className="h-6 w-6 shrink-0 rounded-lg object-contain"
              width={24}
              height={24}
              aria-hidden
            />
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--st-muted-2)]">
              {tr('dagstart.title').toUpperCase()}
            </span>
          </div>

          <DagstartStep1Card
            userName={userName}
            stepLabel={tr('dayStart.stepProgress')}
            question={tr('dayStart.pEnergy')}
            locale={locale}
            greetingMorning={tr('dayStart.greetingMorning')}
            greetingAfternoon={tr('dayStart.greetingAfternoon')}
            greetingEvening={tr('dayStart.greetingEvening')}
            greetingFallbackName={tr('dayStart.greetingFallbackName')}
            exiting={energyStepExiting}
            value={
              energyLevel === 'low' || energyLevel === 'medium' || energyLevel === 'high'
                ? energyLevel
                : null
            }
            onChange={handleEnergyPick}
            labels={{
              low: tr('dayStart.labelLow'),
              medium: tr('dayStart.labelMed'),
              high: tr('dayStart.labelHigh'),
            }}
            sublabels={{
              low: tr('dayStart.subLow'),
              medium: tr('dayStart.subMed'),
              high: tr('dayStart.subHigh'),
            }}
            questionExtra={<InfoButton infoId="energie" />}
            footer={cycleContext}
          />
        </div>
      </div>
    );
  }

  const pillTone =
    energyLevel === 'low' || energyLevel === 'medium' || energyLevel === 'high'
      ? energyBannerStyle(energyLevel)
      : null;

  return (
    <div className="dagstart-step2 flex h-dvh min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pt-3 max-[380px]:px-3 md:px-12">
        <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col overflow-hidden">
          <div className="mb-3 shrink-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (energyAdvanceTimerRef.current) {
                    clearTimeout(energyAdvanceTimerRef.current);
                    energyAdvanceTimerRef.current = null;
                  }
                  setEnergyStepExiting(false);
                  if (taskPickMode !== 'choosing') {
                    resetTaskPickState();
                  } else {
                    setDagstartPhase('energy');
                  }
                }}
                className="inline-flex items-center gap-1 rounded-xl border border-[var(--st-line)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--st-muted)] hover:bg-[var(--st-surface-2)] sm:text-sm"
              >
                <span aria-hidden>←</span>
                {tr('dayStart.back')}
              </button>
              {energyLevel && pillTone ? (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium sm:text-sm"
                  style={{ background: pillTone.background, color: pillTone.color }}
                >
                  <EnergyIcon kind={energyIconKind} size={13} color={pillTone.color} />
                  {energyPillLabel}
                </span>
              ) : null}
              {taskPickMode === 'structuro' ? (
                <button
                  type="button"
                  onClick={() => {
                    resetTaskPickState();
                    setDagstartPhase('energy');
                  }}
                  className="ml-auto text-xs font-medium text-[var(--st-blue)] hover:underline"
                >
                  {tr('dayStart.changeEnergy')}
                </button>
              ) : null}
            </div>
          </div>

          {taskPickMode === 'structuro' && energyBanner ? (
            <div className="mb-3 shrink-0 rounded-xl border border-[var(--st-line)] bg-white px-3 py-2.5 shadow-sm">
              <p className="text-sm font-semibold text-[var(--st-ink)]">{energyBanner.title}</p>
              <p className="mt-0.5 text-xs text-[var(--st-muted)]">{energyBanner.sub}</p>
            </div>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto">
            {isStep2LoadingTasks ? (
              <p className="py-8 text-center text-sm text-[var(--st-muted)]">
                {tr('dayStart.tasksLoading')}
              </p>
            ) : taskPickMode === 'structuro' ? (
              <div className="flex flex-col gap-4 pb-2">
                <DagstartFocusSlots
                  title={tr('dayStart.focusPoints')}
                  titleExtra={<InfoButton infoId="max3taken" />}
                  slots={focusSlotConfigs}
                  swapLabel={tr('dayStart.swapTask')}
                  swapAria={tr('dayStart.swapTaskAria')}
                  swapSlotTarget={structuroSwapSlot}
                  onSwapClick={(slot) => {
                    setStructuroSwapSlot((prev) => (prev === slot ? null : slot));
                  }}
                />
                <DagstartSuggestionsList
                  title={tr('dayStart.suggestionsTitle')}
                  titleExtra={<InfoButton infoId="legedag" />}
                  items={suggestionListItems}
                  emptyHint={tr('dayStart.noSuggestions')}
                  showAllLabel={tr('dayStart.showAll')}
                  showLessLabel={tr('dayStart.showLess')}
                  hasMore={hasMoreSuggestions}
                  showAll={showAllSuggestions}
                  onToggleShowAll={() => setShowAllSuggestions((v) => !v)}
                  pickingId={suggestionPickingId}
                  focusedIds={focusedTaskIds}
                  onPick={(item) => {
                    void handleSuggestionItemPick(item);
                  }}
                />
              </div>
            ) : (
              <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center">
                {taskPickMode === 'choosing' ? (
                  <>
                    <DagstartPickModeSwipeCard
                      className="w-full max-w-sm"
                      cardTitle={tr('dayStart.pickModeTitle')}
                      cardLabel={tr('dayStart.pickModeCardLabel')}
                      selfTitle={tr('dayStart.pickSelfTitle')}
                      structuroTitle={tr('dayStart.pickStructuroTitle')}
                      onPickSelf={handlePickSelf}
                      onPickStructuro={() => {
                        void handlePickStructuro();
                      }}
                      busy={structuroPickBusy}
                    />
                    {structuroPickBusy ? (
                      <p className="mt-2 text-center text-xs text-[var(--st-muted)]">
                        {tr('dayStart.structuroPickBusy')}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <DagstartCardStack
                    className="w-full max-w-sm"
                    queue={cardQueue}
                    onDecide={(id, action) => {
                      void handleCardDecide(id, action);
                    }}
                    swipeExhausted={isSwipeExhausted}
                    allSelected={allTasksSelectedInDock}
                    allSelectedTitle={tr('dayStart.stackAllSelectedTitle')}
                    allSelectedSub={tr('dayStart.stackAllSelectedSub')}
                    exhaustedTitle={tr('dayStart.stackExhaustedTitle')}
                    exhaustedSub={tr('dayStart.stackExhaustedSub')}
                    reviewAgainLabel={tr('dayStart.stackReviewAgain')}
                    addAnywayLabel={tr('dayStart.stackAddAnyway')}
                    onReviewAgain={handleReviewStackAgain}
                    addOpen={stackAddOpen}
                    onAddAnywayClick={() => setStackAddOpen(true)}
                    onAddSave={handleStackAddFromFlow}
                    onAddClose={() => setStackAddOpen(false)}
                    addBusy={stackAddBusy}
                    emptyTitle={tr('dayStart.cardEmptyTitle')}
                    emptyHint={tr('dayStart.cardEmptyHint')}
                    skipLabel={tr('dayStart.cardSkip')}
                    keepLabel={tr('dayStart.cardKeep')}
                    asksLabel={tr('dayStart.cardAsks')}
                    energyAskLabels={{
                      laag: tr('dayStart.cardAsksLow'),
                      gem: tr('dayStart.cardAsksMed'),
                      hoog: tr('dayStart.cardAsksHigh'),
                    }}
                    swipeSkipHint={tr('dayStart.swipeSkip')}
                    swipeKeepHint={tr('dayStart.swipeKeep')}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className="z-10 w-full shrink-0 border-t bg-[var(--st-bg)] px-6 pt-2 shadow-[0_-6px_20px_-10px_rgba(14,23,48,0.12)] max-[380px]:px-3 md:px-12"
        style={{ borderColor: 'var(--st-line)' }}
      >
        <div className="mx-auto w-full max-w-2xl">
          {top3SanitizeNotice ? (
            <div className="mb-2 flex items-start justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
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

          <VandaagDock
            kept={keptCardTasks}
            total={keptTotalMinutes}
            onRemove={handleDockRemove}
            label={tr('dayStart.dockLabel', {
              n: String(keptCardTasks.length),
              unit: dockUnit,
            })}
            totalLabel={tr('dayStart.dockTotal')}
            emptyHint={tr('dayStart.dockEmptyHint')}
            removeAria={tr('dayStart.removeFocusAria')}
            structuroMode={false}
          />

          <div className="pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`st-btn-primary w-full border-0 px-6 py-4 text-base font-semibold max-[380px]:py-3 max-[380px]:text-sm ${
                canSubmit
                  ? ''
                  : 'cursor-not-allowed !bg-[var(--st-surface-2)] !text-[var(--st-muted)] !shadow-none'
              }`}
            >
              {isSubmitting ? tr('dayStart.saving') : `${ctaText} →`}
            </button>
          </div>
        </div>
      </div>

      {deadlineOverflowQueue[0] ? (
        <DagstartDeadlineOverflowModal
          taskTitle={String(deadlineOverflowQueue[0].title ?? '')}
          dueAt={deadlineOverflowQueue[0].dueAt}
          busy={deadlineOverflowBusy}
          onPostpone={() => {
            void handleDeadlineOverflowPostpone();
          }}
          onAddAnyway={() => {
            void handleDeadlineOverflowAdd();
          }}
        />
      ) : null}
    </div>
  );
}

