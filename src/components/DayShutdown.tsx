"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useTaskContext } from "../context/TaskContext";
import { useCheckIn } from "@/hooks/useCheckIn";
import { getUnfinishedTop3TasksForShutdown } from "@/lib/top3CurrentTask";
import { createClient } from "../lib/supabase/client";
import { toast } from "./Toast";
import { track } from "../shared/track";
import { triggerHaptic, HAPTIC_PATTERNS } from "@/lib/haptics";
import { insertDagafsluiterSuggestions } from "@/lib/supabase/parkedThoughtsDb";
import { postponeTasksToCalendarDay } from "@/lib/supabase/postponeTasksDb";
import { getCalendarDateAmsterdam, getTomorrowCalendarDateAmsterdam } from "@/lib/dagstartCookie";
import { trackShutdownCompleted } from "@/utils/events";
import { useI18n } from "@/lib/i18n";
import { captureProductEvent } from "@/lib/posthog/track";
import { trackShutdownCompletedServerBackup } from "@/lib/posthog/activationAnalyticsClient";
import { formatCompletedTimeAmsterdam } from "@/lib/dagafsluiting/formatCompletedTime";
import DagafsluitingFlowShell from "@/components/dagafsluiting/DagafsluitingFlowShell";
import DagafsluitingStepDone, {
  type DoneTaskRow,
} from "@/components/dagafsluiting/steps/DagafsluitingStepDone";
import DagafsluitingStepCarry, {
  type CarryTaskRow,
} from "@/components/dagafsluiting/steps/DagafsluitingStepCarry";
import DagafsluitingStepMood from "@/components/dagafsluiting/steps/DagafsluitingStepMood";
import DagafsluitingStepRest from "@/components/dagafsluiting/steps/DagafsluitingStepRest";
import type { SatisfactionLevel } from "@/components/dagafsluiting/DagafsluitingSatisfactionCards";

interface DayShutdownProps {
  onComplete: () => void;
}

export type { SatisfactionLevel };

const MOOD_ADVANCE_MS = 520;
const REST_REDIRECT_MS = 2800;

export default function DayShutdown({ onComplete }: DayShutdownProps) {
  const { t: tr } = useI18n();
  const { tasks } = useTaskContext();
  const { checkIn: todayCheckIn } = useCheckIn();
  const [step, setStep] = useState(0);
  const [satisfactionLevel, setSatisfactionLevel] = useState<SatisfactionLevel | null>(null);
  const [carryIds, setCarryIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const carryInitRef = useRef(false);
  const saveStartedRef = useRef(false);
  const moodTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const todayYmd = getCalendarDateAmsterdam();

  const completedRows = useMemo((): DoneTaskRow[] => {
    return tasks
      .filter(
        (t: any) =>
          t.done && t.completedAt && String(t.completedAt).slice(0, 10) === todayYmd
      )
      .map((t: any) => ({
        id: String(t.id),
        title: String(t.title ?? "").trim() || tr("common.taskFallback"),
        completedAt: formatCompletedTimeAmsterdam(t.completedAt),
        minutes: t.duration ?? t.estimatedDuration ?? null,
      }));
  }, [tasks, todayYmd, tr]);

  const openRows = useMemo((): CarryTaskRow[] => {
    return getUnfinishedTop3TasksForShutdown(tasks, todayCheckIn).map((t: any) => ({
      id: String(t.id),
      title: String(t.title ?? "").trim() || tr("common.taskFallback"),
    }));
  }, [tasks, todayCheckIn, tr]);

  useEffect(() => {
    if (carryInitRef.current) return;
    if (openRows.length === 0) return;
    setCarryIds(openRows.map((t) => t.id));
    carryInitRef.current = true;
  }, [openRows]);

  useEffect(() => {
    return () => {
      if (moodTimerRef.current) clearTimeout(moodTimerRef.current);
    };
  }, []);

  const toggleCarry = useCallback((id: string) => {
    setCarryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const handleMoodPick = useCallback((level: SatisfactionLevel) => {
    setSatisfactionLevel(level);
    if (moodTimerRef.current) clearTimeout(moodTimerRef.current);
    moodTimerRef.current = setTimeout(() => {
      setStep(3);
    }, MOOD_ADVANCE_MS);
  }, []);

  const persistShutdown = useCallback(async () => {
    if (!satisfactionLevel) return;
    if (saveStartedRef.current) return;
    saveStartedRef.current = true;

    setIsSubmitting(true);
    setSaveError(null);

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user ?? null;

    if (!user) {
      toast(tr("dayShutdown.toastNeedLogin"));
      saveStartedRef.current = false;
      setIsSubmitting(false);
      return;
    }

    try {
      const tomorrowYmd = getTomorrowCalendarDateAmsterdam();
      const completedIds = completedRows.map((t) => t.id);
      const selectedIds = carryIds.filter((id) =>
        openRows.some((row) => row.id === id)
      );
      const unselectedIds = openRows
        .map((t) => t.id)
        .filter((id) => !selectedIds.includes(id));

      const { error: removeNotTodayErr } = await supabase
        .from("tasks")
        .delete()
        .eq("user_id", user.id)
        .eq("not_today", true);
      if (removeNotTodayErr) throw removeNotTodayErr;

      if (unselectedIds.length > 0) {
        const { error: archiveUnselectedErr } = await supabase
          .from("tasks")
          .update({ not_today: true })
          .in("id", unselectedIds)
          .eq("user_id", user.id);
        if (archiveUnselectedErr) throw archiveUnselectedErr;
      }

      const selectedTasks = openRows.filter((t) => selectedIds.includes(t.id));
      const suggestionItems = selectedTasks.map((t) => {
        const full = tasks.find((x: any) => String(x.id) === t.id);
        const energy = full?.energyLevel;
        return {
          content: t.title,
          suggestedTaskEnergy: (["low", "medium", "high"].includes(String(energy))
            ? energy
            : "medium") as "low" | "medium" | "high",
          scheduledFor: tomorrowYmd,
        };
      });

      if (suggestionItems.length > 0) {
        await insertDagafsluiterSuggestions(user.id, suggestionItems);
      }

      if (selectedIds.length > 0) {
        await postponeTasksToCalendarDay(supabase, user.id, selectedIds, tomorrowYmd);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("structuro_tasks_updated"));
        }
      }

      const rememberedTasksPayload =
        selectedTasks.length > 0
          ? selectedTasks.map((t) => ({ id: t.id, title: t.title }))
          : null;

      const { error: shutdownErr } = await supabase.from("daily_shutdowns").upsert(
        {
          user_id: user.id,
          date: todayYmd,
          completed_task_ids: completedIds,
          moved_to_tomorrow_task_ids: selectedIds,
          energy_level: null,
          satisfaction_level: satisfactionLevel,
          reflection: null,
          remembered_tasks: rememberedTasksPayload,
        },
        { onConflict: "user_id,date" }
      );

      if (shutdownErr) throw shutdownErr;

      triggerHaptic(HAPTIC_PATTERNS.DAY_DONE);
      track("day_shutdown", {
        satisfactionLevel,
        completedCount: completedRows.length,
        dagafsluiterSuggestionCount: suggestionItems.length,
      });
      trackShutdownCompleted(selectedIds.length, satisfactionLevel);
      captureProductEvent("shutdown_completed", {
        tasks_completed_count: completedRows.length,
        tasks_moved_count: selectedIds.length,
      });
      trackShutdownCompletedServerBackup({
        tasks_completed_count: completedRows.length,
        tasks_moved_count: selectedIds.length,
        satisfaction_level: satisfactionLevel,
      });

      window.setTimeout(() => {
        onComplete();
      }, REST_REDIRECT_MS);
    } catch (error: unknown) {
      console.error("Dagafsluiter save error:", error);
      const msg = tr("dayShutdown.saveError");
      setSaveError(msg);
      toast(msg);
      saveStartedRef.current = false;
    } finally {
      setIsSubmitting(false);
    }
  }, [
    satisfactionLevel,
    carryIds,
    openRows,
    completedRows,
    tasks,
    todayYmd,
    tr,
    onComplete,
  ]);

  useEffect(() => {
    if (step !== 3 || !satisfactionLevel) return;
    void persistShutdown();
  }, [step, satisfactionLevel, persistShutdown]);

  return (
    <DagafsluitingFlowShell
      step={step}
      stageAlign={step === 3 ? "start" : "center"}
      onBack={() => {
        if (step > 0 && step < 3) setStep((s) => s - 1);
      }}
    >
      {step === 0 ? (
        <DagafsluitingStepDone
          tasks={completedRows}
          onNext={() => setStep(openRows.length === 0 ? 2 : 1)}
        />
      ) : null}

      {step === 1 ? (
        <DagafsluitingStepCarry
          tasks={openRows}
          carryIds={carryIds}
          onToggle={toggleCarry}
          onNext={() => setStep(2)}
        />
      ) : null}

      {step === 2 ? (
        <DagafsluitingStepMood mood={satisfactionLevel} onPick={handleMoodPick} />
      ) : null}

      {step === 3 ? (
        <DagafsluitingStepRest
          mood={satisfactionLevel}
          saving={isSubmitting}
          saveError={saveError}
          onRetry={saveError ? () => void persistShutdown() : undefined}
        />
      ) : null}
    </DagafsluitingFlowShell>
  );
}
