"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OPTIMISTIC_TASK_ID_PREFIX, useTaskContext } from "@/context/TaskContext";
import { useUser } from "@/hooks/useUser";
import { useCheckIn } from "@/hooks/useCheckIn";
import { useCycleProfile } from "@/hooks/useCycleProfile";
import { createClient } from "@/lib/supabase/client";
import { resolveDayStartFirstName, getDayStartTimeOfDay } from "@/lib/dayStartGreeting";
import { calculateDayInCycle } from "@/lib/cycle/calculatePhase";
import {
  isDueStrictlyAfterToday,
  isTaskOverdue,
  compareDeadlineTasks,
  calendarDayToDueAt,
} from "@/lib/dagstart/deadlineToday";
import {
  buildDagstartTaskPlan,
  rankTaskForDagstartSuggestions,
} from "@/lib/dagstart/buildDagstartTaskPlan";
import { resolveDagstartSavedTaskIds, clampDagstartSelection } from "@/lib/dagstart/dagstartPickLimits";
import { getCalendarDateAmsterdam, getTomorrowCalendarDateAmsterdam, setDagstartCookieOnClient } from "@/lib/dagstartCookie";
import DagstartDeadlineOverflowModal from "@/components/dagstart/DagstartDeadlineOverflowModal";
import { getDagstartCardDeadline } from "@/lib/taskDeadlineDisplay";
import { trackDagstartOpened, trackEnergyChecked } from "@/utils/events";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { captureActivationFunnelEvent } from "@/lib/posthog/track";
import { trackDagstartCompletedServerBackup } from "@/lib/posthog/activationAnalyticsClient";
import { markOnboardingCompleted } from "@/lib/onboardingProfile";
import { ensureFirstDagstartWelcomeTask } from "@/lib/onboardingWelcomeTask";
import { updateProfileAfterDagstartComplete } from "@/lib/supabase/profileDagstartDb";
import DagstartEmptySelectionHint from "@/components/dagstart/DagstartEmptySelectionHint";
import { toast } from "@/components/Toast";
import { buildTaskFromFlowPayload } from "@/lib/newTask/buildTaskFromFlowPayload";
import type { NewTaskFlowPayload } from "@/lib/newTask/newTaskFlowTypes";
import StepEnergy from "./StepEnergy";
import StepChoice from "./StepChoice";
import StepSuggested from "./StepSuggested";
import StepSwipe from "./StepSwipe";
import StepDone from "./StepDone";
import {
  DAGSTART_ENERGIES,
  appEnergyToDagstartId,
  dagstartIdToAppEnergy,
  dagstartMaxSlotsForEnergy,
  dagstartTaskEnergyAllow,
  type DagstartEnergyId,
  type DagstartTaskCard,
} from "./types";

type DagstartFlowProps = {
  onComplete: () => void;
};

function greetingLabel(): string {
  const period = getDayStartTimeOfDay();
  if (period === "morning") return "Goedemorgen";
  if (period === "afternoon") return "Goedemiddag";
  return "Goedenavond";
}

function taskToDagstartCardLocal(task: {
  id: string;
  title: string;
  duration?: number | null;
  estimatedDuration?: number | null;
  energyLevel?: string | null;
  dueAt?: string | null;
}): DagstartTaskCard {
  const minutes = task.duration || task.estimatedDuration || 15;
  const appEnergy =
    task.energyLevel === "low" || task.energyLevel === "high"
      ? task.energyLevel
      : "medium";
  const deadlineMeta = task.dueAt ? getDagstartCardDeadline(task.dueAt, "nl") : null;
  return {
    id: String(task.id),
    title: String(task.title ?? "").trim(),
    appEnergy,
    energy: appEnergyToDagstartId(task.energyLevel),
    minutes,
    dueAt: task.dueAt ?? null,
    deadline: deadlineMeta?.label ?? null,
    overdue: deadlineMeta?.overdue ?? false,
  };
}

export default function DagstartFlow({ onComplete }: DagstartFlowProps) {
  const { tasks, addTask, fetchTasks, updateTask } = useTaskContext();
  const { user: authUser } = useUser();
  const { saveCheckIn } = useCheckIn();
  const {
    consentOn: cycleConsentOn,
    profile: cycleProfile,
    computePhaseToday,
  } = useCycleProfile();

  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [energy, setEnergy] = useState<DagstartEnergyId | null>(null);
  const [choice, setChoice] = useState<"structuro" | "self" | null>(null);
  const [keptIds, setKeptIds] = useState<string[]>([]);
  const [userName, setUserName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [swipeAddBusy, setSwipeAddBusy] = useState(false);
  const [extraDeadlineSlots, setExtraDeadlineSlots] = useState(0);
  const [overflowConfirmedIds, setOverflowConfirmedIds] = useState<string[]>([]);
  const [overflowModal, setOverflowModal] = useState<{
    task: DagstartTaskCard;
    dueAt: string | null;
    onConfirm?: () => void;
  } | null>(null);
  const [overflowBusy, setOverflowBusy] = useState(false);
  /** Forceert remount van stap-2 substeps zodat lokale state (selecties, swipe-queue) opnieuw begint. */
  const [step2Key, setStep2Key] = useState(0);
  const [showEmptySelectionHint, setShowEmptySelectionHint] = useState(false);
  const emptySelectionDismissedRef = useRef(false);
  const welcomeTaskEnsuredRef = useRef(false);
  const pendingFinishIdsRef = useRef<string[] | null>(null);

  useEffect(() => {
    trackDagstartOpened();
  }, []);

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
            return;
          }
        }
        if (emailFallback && !cancelled) setUserName(emailFallback);
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
        if (resolved) setUserName(resolved);
        else if (emailFallback) setUserName(emailFallback);
      } catch {
        if (!cancelled && emailFallback) setUserName(emailFallback);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser?.id, authUser?.email]);

  const cyclus = useMemo(() => {
    if (!cycleConsentOn || !cycleProfile.lastPeriodStart) return null;
    const startDate = new Date(`${cycleProfile.lastPeriodStart}T00:00:00`);
    if (Number.isNaN(startDate.getTime())) return null;
    const day = calculateDayInCycle(startDate, cycleProfile.averageLength);
    if (day == null) return null;
    return {
      day,
      cycleLength: cycleProfile.averageLength,
      menstruationDuration: cycleProfile.menstruationDuration,
    };
  }, [cycleConsentOn, cycleProfile]);

  /** Ruwe open takenpool (voor swipe + plan). */
  const openTasksRaw = useMemo(() => {
    if (!energy) return [];
    const allowedIds = new Set(dagstartTaskEnergyAllow(energy));
    const todayYmd = getCalendarDateAmsterdam();
    return tasks.filter((t: any) => {
      if (!t?.id || !String(t.title ?? "").trim()) return false;
      if (t.done || t.notToday || t.not_today) return false;
      if (t.source === "medication" || t.source === "event") return false;
      if (isDueStrictlyAfterToday(t.dueAt)) return false;
      if (t.dueAt && isTaskOverdue(t.dueAt, todayYmd)) return false;
      const dsEnergy = appEnergyToDagstartId(t.energyLevel);
      return allowedIds.has(dsEnergy);
    });
  }, [tasks, energy]);

  const maxSlots = energy ? dagstartMaxSlotsForEnergy(energy) : 0;

  const dagstartPlan = useMemo(() => {
    if (!energy || maxSlots === 0) return null;
    const dayEnergy = dagstartIdToAppEnergy(energy);
    return buildDagstartTaskPlan(
      openTasksRaw,
      openTasksRaw,
      dayEnergy,
      maxSlots,
      getCalendarDateAmsterdam()
    );
  }, [openTasksRaw, energy, maxSlots]);

  const suggestedTasks = useMemo((): DagstartTaskCard[] => {
    if (!dagstartPlan) return [];
    return [
      ...dagstartPlan.deadlineAutoFill,
      ...dagstartPlan.recurringDueToday,
      ...dagstartPlan.structuroFill,
    ].map(taskToDagstartCardLocal);
  }, [dagstartPlan]);

  /** Sortering: deadlines eerst (overdue → datum → duur → titel), dan rest op duur. */
  const taskPool = useMemo((): DagstartTaskCard[] => {
    if (!energy) return [];
    const sorted = [...openTasksRaw].sort((a: any, b: any) => {
      const rankA = rankTaskForDagstartSuggestions(a);
      const rankB = rankTaskForDagstartSuggestions(b);
      if (rankA !== rankB) return rankA - rankB;
      if (rankA === 0) {
        const dueDiff = compareDeadlineTasks(a, b);
        if (dueDiff !== 0) return dueDiff;
      }
      const durA = a.duration || a.estimatedDuration || 999;
      const durB = b.duration || b.estimatedDuration || 999;
      if (durA !== durB) return durA - durB;
      return String(a.title || "").localeCompare(String(b.title || ""));
    });

    return sorted.map(taskToDagstartCardLocal);
  }, [openTasksRaw, energy]);

  useEffect(() => {
    if (step !== 2 || !dagstartPlan) return;
    setExtraDeadlineSlots(0);
    setOverflowConfirmedIds([]);
    setOverflowModal(null);
    setShowEmptySelectionHint(false);
    emptySelectionDismissedRef.current = false;
  }, [step, step2Key, dagstartPlan]);

  useEffect(() => {
    if (step !== 2 || !authUser?.id || welcomeTaskEnsuredRef.current) return;
    if (taskPool.length > 0) return;
    welcomeTaskEnsuredRef.current = true;
    void (async () => {
      try {
        const created = await ensureFirstDagstartWelcomeTask(authUser.id);
        if (created) await fetchTasks();
      } catch (err) {
        console.warn("[dagstart] welcome task:", err);
      }
    })();
  }, [step, authUser?.id, taskPool.length, fetchTasks]);

  const requestDeadlineOverflow = useCallback(
    (task: DagstartTaskCard, onConfirm?: () => void) => {
      setOverflowModal({ task, dueAt: task.dueAt, onConfirm });
    },
    []
  );

  const handleOverflowPostpone = useCallback(async () => {
    if (!overflowModal || overflowBusy) return;
    setOverflowBusy(true);
    try {
      await updateTask(overflowModal.task.id, {
        dueAt: calendarDayToDueAt(getTomorrowCalendarDateAmsterdam()),
      });
      await fetchTasks();
      setOverflowModal(null);
    } catch (e) {
      console.error("deadline overflow postpone:", e);
      toast("Taak kon niet worden verzet.");
    } finally {
      setOverflowBusy(false);
    }
  }, [overflowModal, overflowBusy, updateTask, fetchTasks]);

  const handleOverflowAddAnyway = useCallback(() => {
    if (!overflowModal || overflowBusy) return;
    setExtraDeadlineSlots((n) => n + 1);
    setOverflowConfirmedIds((ids) =>
      ids.includes(overflowModal.task.id)
        ? ids
        : [...ids, overflowModal.task.id]
    );
    overflowModal.onConfirm?.();
    setOverflowModal(null);
  }, [overflowModal, overflowBusy]);

  const completeDagstart = useCallback(
    async (pickedIds: string[]) => {
      if (!energy || submitting) return;
      const tasksById = new Map(taskPool.map((t) => [t.id, t]));
      const savedIds = clampDagstartSelection(
        pickedIds,
        tasksById,
        maxSlots,
        extraDeadlineSlots
      );
      const appEnergy = dagstartIdToAppEnergy(energy);
      const cyclePhase = computePhaseToday();
      const top3 = resolveDagstartSavedTaskIds(
        savedIds,
        maxSlots,
        extraDeadlineSlots
      ).filter((id) => id && !id.startsWith(OPTIMISTIC_TASK_ID_PREFIX));

      if (savedIds.length > 0 && top3.length === 0) {
        toast(
          "Je gekozen taak wordt nog opgeslagen. Wacht even en probeer opnieuw."
        );
        return;
      }

      setSubmitting(true);
      setKeptIds(savedIds);

      try {
        await saveCheckIn({
          energy_level: appEnergy,
          top3_task_ids: top3.length > 0 ? top3 : null,
          cycle_phase: cyclePhase ?? null,
        });
        if (authUser?.id) {
          try {
            await updateProfileAfterDagstartComplete(authUser.id, appEnergy);
          } catch (err) {
            console.warn("dagstart profile update:", err);
          }
        }
        try {
          await markOnboardingCompleted();
        } catch (err) {
          console.warn("markOnboardingCompleted:", err);
        }
        captureActivationFunnelEvent("dagstart_completed", {
          energy_level: appEnergy,
          tasks_selected_count: top3.length,
          has_cycle_phase: Boolean(cyclePhase),
          source: "app",
          energy: appEnergy,
          task_count: top3.length,
        });
        if (authUser?.id) {
          trackDagstartCompletedServerBackup({
            energy_level: appEnergy,
            tasks_selected_count: top3.length,
            top3_task_ids: top3.length > 0 ? top3 : null,
            has_cycle_phase: Boolean(cyclePhase),
            source: "app",
          });
        }
        if (top3.length > 0) {
          captureActivationFunnelEvent(ANALYTICS_EVENTS.dagstart_tasks_selected, {
            task_count: top3.length,
            energy_level: appEnergy,
            source: "dagstart_flow",
          });
        }
        setStep(3);
      } catch (err: any) {
        console.error("Dagstart save error:", err);
        toast(`Fout bij opslaan: ${err?.message ?? "onbekende fout"}`);
        return;
      } finally {
        setSubmitting(false);
      }
    },
    [
      energy,
      submitting,
      computePhaseToday,
      saveCheckIn,
      authUser?.id,
      maxSlots,
      extraDeadlineSlots,
      taskPool,
    ]
  );

  const finishWithPicks = useCallback(
    async (pickedIds: string[]) => {
      if (!energy || submitting) return;
      const tasksById = new Map(taskPool.map((t) => [t.id, t]));
      const savedIds = clampDagstartSelection(
        pickedIds,
        tasksById,
        maxSlots,
        extraDeadlineSlots
      );
      const top3 = resolveDagstartSavedTaskIds(
        savedIds,
        maxSlots,
        extraDeadlineSlots
      ).filter((id) => id && !id.startsWith(OPTIMISTIC_TASK_ID_PREFIX));

      if (
        top3.length === 0 &&
        !emptySelectionDismissedRef.current &&
        !showEmptySelectionHint
      ) {
        pendingFinishIdsRef.current = pickedIds;
        setShowEmptySelectionHint(true);
        captureActivationFunnelEvent(
          ANALYTICS_EVENTS.dagstart_empty_selection_hint_shown,
          { source: "dagstart_flow" }
        );
        return;
      }

      pendingFinishIdsRef.current = null;
      setShowEmptySelectionHint(false);
      await completeDagstart(pickedIds);
    },
    [
      energy,
      submitting,
      taskPool,
      maxSlots,
      extraDeadlineSlots,
      showEmptySelectionHint,
      completeDagstart,
    ]
  );

  const handleEmptyHintDismiss = useCallback(() => {
    emptySelectionDismissedRef.current = true;
    setShowEmptySelectionHint(false);
    captureActivationFunnelEvent(
      ANALYTICS_EVENTS.dagstart_empty_selection_hint_dismissed,
      { source: "dagstart_flow", added_task: false }
    );
    const ids = pendingFinishIdsRef.current ?? [];
    pendingFinishIdsRef.current = null;
    void completeDagstart(ids);
  }, [completeDagstart]);

  const handleEmptyHintAddTask = useCallback(
    async (title: string) => {
      if (!energy) return;
      const appEnergy = dagstartIdToAppEnergy(energy);
      const task = await addTask({
        title,
        done: false,
        started: false,
        priority: 1,
        dueAt: null,
        duration: 2,
        source: "manual",
        reminders: [],
        repeat: "none",
        impact: "🚀",
        energyLevel: appEnergy,
        estimatedDuration: 2,
        microSteps: [],
        notToday: false,
      });
      emptySelectionDismissedRef.current = true;
      setShowEmptySelectionHint(false);
      captureActivationFunnelEvent(
        ANALYTICS_EVENTS.dagstart_empty_selection_hint_dismissed,
        { source: "dagstart_flow", added_task: true }
      );
      pendingFinishIdsRef.current = null;
      if (task?.id) {
        await completeDagstart([String(task.id)]);
      } else {
        await completeDagstart([]);
      }
    },
    [energy, addTask, completeDagstart]
  );

  const picksForDone = useMemo((): DagstartTaskCard[] => {
    return keptIds
      .map((id) => taskPool.find((t) => t.id === id))
      .filter((t): t is DagstartTaskCard => Boolean(t));
  }, [keptIds, taskPool]);

  const handleEnergyPick = useCallback((id: DagstartEnergyId) => {
    setEnergy(id);
    trackEnergyChecked(id);
    captureActivationFunnelEvent("dagstart_energy_chosen", {
      energy_level: dagstartIdToAppEnergy(id),
      level: id,
      source: "dagstart_flow",
    });
    setTimeout(() => setStep(1), 480);
  }, []);

  const handleChoicePick = useCallback((c: "structuro" | "self") => {
    setChoice(c);
    captureActivationFunnelEvent(ANALYTICS_EVENTS.dagstart_path_chosen, {
      path: c,
      source: "dagstart_flow",
    });
    setStep2Key((k) => k + 1);
    setStep(2);
  }, []);

  const handleSwipeAddFromFlow = useCallback(
    async (payload: NewTaskFlowPayload) => {
      if (swipeAddBusy || !energy) {
        throw new Error("dagstart_swipe_add_unavailable");
      }
      setSwipeAddBusy(true);
      try {
        await addTask(buildTaskFromFlowPayload(payload));
        await fetchTasks();
      } catch (e) {
        console.error("dagstart swipe add:", e);
        toast("Taak kon niet worden toegevoegd.");
        throw e;
      } finally {
        setSwipeAddBusy(false);
      }
    },
    [swipeAddBusy, energy, addTask, fetchTasks]
  );

  const handleBack = useCallback(() => {
    setStep((s) => {
      if (s <= 0 || s >= 3) return s;
      const next = (s - 1) as 0 | 1 | 2;
      if (s === 2) setChoice(null);
      return next;
    });
  }, []);

  const step2CompactAddTask =
    step === 2 &&
    ((choice === "structuro" && suggestedTasks.length === 0) ||
      (choice === "self" && taskPool.length === 0));
  const step2NeedsTallCard = step === 2 && !step2CompactAddTask;

  return (
    <div className={`ds-root${step2NeedsTallCard ? " ds-root--tall-step" : ""}`}>
      <div className={`ds-card${step2NeedsTallCard ? " ds-card--tall" : ""}`}>
        <div className="ds-topbar">
          <span className="ds-brand">Structuro</span>
          <span className="ds-topbar-meta">Dagstart</span>
        </div>

        {step > 0 && step < 3 ? (
          <div className="ds-back-row">
            <button
              type="button"
              className="ds-back"
              onClick={handleBack}
              aria-label="Terug"
            >
              ←
            </button>
          </div>
        ) : null}

        <div
          className={`ds-body ${
            step === 0 || step === 1 || step === 3 || step2CompactAddTask
              ? "center"
              : ""
          } ${
            step2NeedsTallCard ? "ds-body--task-pick" : step === 3 ? "scroll" : ""
          }`}
        >
          {step === 0 ? (
            <StepEnergy
              userName={userName}
              greeting={greetingLabel()}
              energy={energy}
              cyclus={cyclus}
              onPick={handleEnergyPick}
            />
          ) : null}

          {step === 1 ? (
            <StepChoice energy={energy} onPick={handleChoicePick} />
          ) : null}

          {showEmptySelectionHint ? (
            <DagstartEmptySelectionHint
              onAddQuickTask={handleEmptyHintAddTask}
              onDismiss={handleEmptyHintDismiss}
              busy={submitting}
            />
          ) : null}

          {step === 2 && choice === "structuro" ? (
            <StepSuggested
              key={`suggested-${step2Key}`}
              energy={energy}
              tasks={suggestedTasks}
              maxSlots={maxSlots}
              extraDeadlineSlots={extraDeadlineSlots}
              preselectedIds={overflowConfirmedIds}
              onAccept={(ids) => void finishWithPicks(ids)}
              onSwitchToSwipe={() => {
                setStep2Key((k) => k + 1);
                setChoice("self");
              }}
              onAddTask={handleSwipeAddFromFlow}
              onRequestDeadlineOverflow={requestDeadlineOverflow}
              addBusy={swipeAddBusy}
            />
          ) : null}

          {step === 2 && choice === "self" ? (
            <StepSwipe
              key={`swipe-${step2Key}`}
              tasks={taskPool}
              maxSlots={maxSlots}
              extraDeadlineSlots={extraDeadlineSlots}
              preselectedIds={overflowConfirmedIds}
              onDone={(ids) => void finishWithPicks(ids)}
              onAddTask={handleSwipeAddFromFlow}
              onSwitchToSuggested={() => {
                setStep2Key((k) => k + 1);
                setChoice("structuro");
              }}
              onRequestDeadlineOverflow={requestDeadlineOverflow}
              addBusy={swipeAddBusy}
            />
          ) : null}

          {step === 3 ? (
            <StepDone
              picks={picksForDone}
              onDashboard={() => {
                setDagstartCookieOnClient();
                onComplete();
              }}
            />
          ) : null}
        </div>
      </div>

      {overflowModal ? (
        <DagstartDeadlineOverflowModal
          taskTitle={overflowModal.task.title}
          dueAt={overflowModal.task.dueAt}
          busy={overflowBusy}
          onPostpone={() => void handleOverflowPostpone()}
          onAddAnyway={handleOverflowAddAnyway}
        />
      ) : null}
    </div>
  );
}

// Voorkom dead-import waarschuwing voor energie-mapping in andere builds.
export { DAGSTART_ENERGIES };
