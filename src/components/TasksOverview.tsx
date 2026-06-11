"use client";

import React, { useMemo, useState, useEffect, useDeferredValue, startTransition, useCallback } from "react";
import dynamic from "next/dynamic";
import { useDismissibleTooltip } from "@/hooks/useDismissibleTooltip";
import {
  trackFocusModeStarted,
  trackQuickCompleteTriggered,
  trackTaskCompleted,
  trackTaskCreated,
} from "@/utils/events";
import { useRouter } from "next/navigation";
import { useTaskContext } from "../context/TaskContext";
import { designSystem } from "../lib/design-system";
import { useCheckIn } from "../hooks/useCheckIn";
import { toast } from "./Toast";
import { track } from "../shared/track";
import TaskScheduleEditor from "./TaskScheduleEditor";
import { normalizeMicroSteps } from "../lib/microSteps";
import { compareDeadlineTasks } from "@/lib/dagstart/deadlineToday";
import { isOpenBacklogTask } from "../lib/taskFilters";
import { getCalendarDateAmsterdam } from "@/lib/dagstartCookie";
import { getTaskDurationMinutes } from "@/lib/taskDurationMinutes";
import { maxSlotsForEnergy } from "@/lib/top3CurrentTask";
import {
  CheckCircleIcon,
  Square2StackIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import TaskCardActions from "@/components/tasks/TaskCardActions";
import OpenTasksListC from "@/components/tasks/OpenTasksListC";
import {
  buildRecurringCompletionUpdate,
  isRecurringTask,
  formatRepeatLabel,
} from "@/lib/taskRecurrence";
import GeparkeerdeGedachtenSection from "./GeparkeerdeGedachtenSection";
const NewTaskFlow = dynamic(() => import("@/components/newTask/NewTaskFlow"), {
  ssr: false,
});
import { buildTaskFromFlowPayload } from "@/lib/newTask/buildTaskFromFlowPayload";
import type { NewTaskFlowPayload } from "@/lib/newTask/newTaskFlowTypes";
import { useI18n } from "@/lib/i18n";
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
  const { t: tr, locale } = useI18n();
  const dateLocale = locale === "en" ? "en-US" : "nl-NL";
  const { tasks, loading, addTask, updateTask, deleteTask } = useTaskContext();
  /** INP: zware lijst-filters iets uitstellen zodat klikken eerst kunnen painten */
  const deferredTasks = useDeferredValue(tasks);
  const router = useRouter();
  
  // State voor nieuwe taak (step-flow)
  const [newTaskBusy, setNewTaskBusy] = useState(false);
  const convertTaskInfo = useDismissibleTooltip();
  const [editing, setEditing] = useState<any>(null);

  // Parked thought -> task conversion modal state
  const [convertingThought, setConvertingThought] = useState<any>(null);

  useEffect(() => {
    if (!convertingThought) convertTaskInfo.setOpen(false);
  }, [convertingThought, convertTaskInfo.setOpen]);
  const [convertDuration, setConvertDuration] = useState<number | null>(null);
  const [convertEnergy, setConvertEnergy] = useState<'low' | 'medium' | 'high'>('medium');
  const { checkIn: todayCheckIn } = useCheckIn();
  const [completedSectionOpen, setCompletedSectionOpen] = useState(false);
  /** Taak net aangevinkt: line-through + opacity, na 300ms echte update + verhuizing naar Voltooide taken */
  const [completingTaskIds, setCompletingTaskIds] = useState<Set<string>>(new Set());
  /** Pop-animatie op checkbox (task.id) */
  const [checkboxPopId, setCheckboxPopId] = useState<string | null>(null);
  // Bepaal max slots (zelfde regels als HomeCalm / getFirstOpenTop3Task)
  const maxSlots = useMemo(() => {
    if (!todayCheckIn) return 3;
    return maxSlotsForEnergy(todayCheckIn.energy_level);
  }, [todayCheckIn]);

  /**
   * Alleen taken uit daily_checkins.top3_task_ids, in exacte arrayvolgorde (niet priority-veld, geen backfill).
   * Afronding: zelfde slot, grijs + vinkje; geen vervanging door andere open taken.
   */
  const priorityTasks = useMemo(() => {
    const out: { [key: number]: any } = { 1: null, 2: null, 3: null };
    const rawIds = todayCheckIn?.top3_task_ids;
    if (!Array.isArray(rawIds) || rawIds.length === 0) return out;
    const ids = rawIds.slice(0, maxSlots);
    ids.forEach((taskId, index) => {
      const slot = index + 1;
      const task = deferredTasks.find(
        (t: any) =>
          t &&
          String(t.id) === String(taskId) &&
          t.source !== "medication" &&
          t.source !== "event"
      );
      if (task) out[slot] = task;
    });
    return out;
  }, [todayCheckIn?.top3_task_ids, maxSlots, deferredTasks]);

  const handleNewTaskFlowSave = useCallback(async (payload: NewTaskFlowPayload) => {
    setNewTaskBusy(true);
    try {
      await addTask(buildTaskFromFlowPayload(payload));
      toast(tr("tasks.toastAdded"));
      track("task_added", { energyLevel: payload.energy });
      trackTaskCreated();
    } catch (error) {
      console.error("Error adding task:", error);
      toast(tr("tasks.toastAddErr"));
      throw new Error("task_save_failed");
    } finally {
      setNewTaskBusy(false);
    }
  }, [addTask, tr]);

  // Handle: Start Focus Mode
  // KRITIEK: Focus duur moet matchen met de ingeschatte taakduur (duration/estimatedDuration)
  const startFocus = (task: any) => {
    const taskDuration = getTaskDurationMinutes(task) ?? 15;
    const energy =
      (task.energyLevel as "low" | "medium" | "high") ?? "medium";
    const focusUrl = `/focus?task=${encodeURIComponent(task.id)}&duration=${encodeURIComponent(taskDuration)}&energy=${task.energyLevel || 'medium'}`;
    // Geen startTransition: die kan samen met useSearchParams/Suspense op /focus tot vastlopende navigatie leiden
    router.push(focusUrl);
    void updateTask(task.id, { started: true }).catch((error) => {
      console.error('Error starting focus:', error);
      toast(tr("tasks.toastFocusErr"));
    });
    queueMicrotask(() => {
      toast(tr("tasks.toastFocusStarted"));
      trackFocusModeStarted(energy, taskDuration);
      track('focus_start', {
        taskId: task.id,
        duration: taskDuration,
        energyLevel: task.energyLevel || 'medium',
      });
    });
  };

  const handleDeleteTask = async (task: any) => {
    if (!confirm(tr("tasks.deleteConfirm"))) return;
    await deleteTask(task.id);
  };

  const handleQuickCompleteFromCard = (task: any) => {
    const taskDuration = getTaskDurationMinutes(task) ?? 15;
    const energy =
      (task.energyLevel as "low" | "medium" | "high") ?? "medium";
    setCompletingTaskIds((prev) => new Set(prev).add(task.id));
    setCheckboxPopId(task.id);
    setTimeout(() => setCheckboxPopId(null), 200);
    setTimeout(() => {
      trackQuickCompleteTriggered(energy, taskDuration);
      trackTaskCompleted("quick_complete", energy);
      startTransition(() => {
        const updates = isRecurringTask(task)
          ? buildRecurringCompletionUpdate(task)
          : {
              done: true,
              started: true,
              source: "quick_complete",
              completedAt: new Date().toISOString(),
            };
        void updateTask(task.id, updates);
        setCompletingTaskIds((prev) => {
          const next = new Set(prev);
          next.delete(task.id);
          return next;
        });
        if (!isRecurringTask(task)) {
          setCompletedSectionOpen(true);
        }
      });
      queueMicrotask(() => {
        toast(tr("tasks.toastChecked"));
      });
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
    return deferredTasks
      .filter((t: any) => isOpenBacklogTask(t) && !vandaagFocusIds.has(t.id))
      .sort((a: any, b: any) => compareDeadlineTasks(a, b));
  }, [deferredTasks, vandaagFocusIds]);

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
    return deferredTasks
      .filter((t: any) => t.done && t.source !== 'medication' && t.source !== 'event')
      .sort((a: any, b: any) => {
        const da = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const db = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return db - da;
      });
  }, [deferredTasks]);

  const completedTodayCount = useMemo(() => {
    const today = getCalendarDateAmsterdam();
    return deferredTasks.filter((t: any) => {
      if (!t.done || !t.completedAt || t.source === "medication" || t.source === "event") return false;
      return getCalendarDateAmsterdam(new Date(t.completedAt)) === today;
    }).length;
  }, [deferredTasks]);

  const completedTodayTasks = useMemo(() => {
    const today = getCalendarDateAmsterdam();
    return deferredTasks
      .filter((t: any) => {
        if (!t.done || !t.completedAt || t.source === "medication" || t.source === "event") return false;
        return getCalendarDateAmsterdam(new Date(t.completedAt)) === today;
      })
      .sort((a: any, b: any) => {
        const da = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const db = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return db - da;
      });
  }, [deferredTasks]);

  return (
    <div className="min-h-full bg-[var(--st-bg)] px-5 pb-28 pt-6">
      <main className="mx-auto flex w-full max-w-lg flex-col">
        <header className="mb-6 flex w-full flex-col items-start text-left">
          <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-[#0F172A]">
            {tr("tasks.titlePage")}
          </h1>
          <p className="mt-2 text-[15px] leading-snug text-gray-400">
            {loading ? tr("tasks.subtitleLoading") : tr("tasks.subtitleIdle")}
          </p>
        </header>

        {/* Doctrine mock: max 3 focuskaarten */}
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((priority) => {
            if (priority > maxSlots) return null;
            const task = priorityTasks[priority];
            if (!task) return null;
            const isDone = Boolean(task.done);
            const tint = PRIORITY_ROW_TINT[priority] ?? PRIORITY_ROW_TINT[1];
            const ms = normalizeMicroSteps(task.microSteps);
            const msDone = ms.filter((s) => s.done).length;
            const mins = task.duration ?? task.estimatedDuration ?? 15;

            if (isDone) {
              return (
                <div
                  key={priority}
                  className="flex w-full items-center gap-4 rounded-3xl border border-gray-200 bg-gray-50/90 p-5 text-left opacity-80"
                >
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-gray-200 bg-white text-[17px] font-bold leading-none text-gray-400"
                    aria-hidden
                  >
                    <CheckCircleIcon className="h-6 w-6 text-emerald-500" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="break-words text-[16px] font-bold leading-snug text-gray-500 line-through">
                      {task.title}
                    </div>
                    <p className="mt-1 text-[13px] font-mono tabular-nums text-gray-400">{mins} min</p>
                  </div>
                </div>
              );
            }

            const repeatLabel = formatRepeatLabel(task, tr, "taskEditor");
            const isCompleting = completingTaskIds.has(task.id);
            const isPop = checkboxPopId === task.id;

            return (
              <div
                key={priority}
                className={`flex w-full items-center gap-4 rounded-3xl border p-5 text-left transition-opacity duration-200 ${tint.card}${
                  isCompleting ? " opacity-60" : ""
                }`}
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
                    className={`mt-1 text-[13px] font-mono tabular-nums ${
                      tint.timeMuted ? "text-gray-300" : "text-[#64748B]"
                    }`}
                  >
                    {mins} min
                  </p>
                  {repeatLabel ? (
                    <p className="mt-1 flex items-center gap-1 text-[12px] font-medium text-blue-600">
                      <ArrowPathIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {repeatLabel}
                    </p>
                  ) : null}
                  {ms.length > 0 ? (
                    <div className="mt-2.5 flex items-center gap-1.5 text-[12px] font-medium text-violet-600">
                      <Square2StackIcon className="h-3.5 w-3.5 shrink-0 text-violet-500" aria-hidden />
                      <span className="tracking-tight">
                        {tr("tasks.microStepsBadge", {
                          done: String(msDone),
                          total: String(ms.length),
                        })}
                      </span>
                    </div>
                  ) : null}
                </div>
                <TaskCardActions
                  onPlay={() => startFocus(task)}
                  onEdit={() => setEditing(task)}
                  onDelete={() => void handleDeleteTask(task)}
                  onComplete={() => handleQuickCompleteFromCard(task)}
                  completeLabel={tr("tasks.quickDoneTitle")}
                  completing={isCompleting}
                  completePop={isPop}
                  playLabel={tr("tasks.playFocus")}
                  editLabel={tr("tasks.edit")}
                  deleteLabel={tr("tasks.deleteTitle")}
                />
              </div>
            );
          })}
          {!loading &&
            !Object.values(priorityTasks).some(Boolean) && (
              <div className="rounded-3xl border border-gray-100 bg-white p-8 text-center text-[15px] text-gray-400 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
                {tr("tasks.noTodayChosen")}
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
              {tr("tasks.todayDone", { n: String(completedTodayCount) })}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setCompletedSectionOpen((v) => !v)}
            className="shrink-0 text-[15px] font-normal lowercase text-gray-400 transition hover:text-gray-500"
            aria-expanded={completedSectionOpen}
            aria-label={
              completedSectionOpen
                ? tr("tasks.ariaHideCompleted")
                : tr("tasks.ariaShowCompleted")
            }
          >
            {completedSectionOpen ? tr("tasks.hideCompleted") : tr("tasks.showCompleted")}
          </button>
        </div>

        {completedSectionOpen ? (
          <div className="mt-3 space-y-3">
            {completedTodayTasks.length === 0 ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-400 shadow-sm">
                {tr("tasks.noCompletedToday")}
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
                      <span className="text-xs font-mono tabular-nums text-gray-400">
                        {new Date(task.completedAt).toLocaleDateString(dateLocale, {
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
                          toast(tr("tasks.toastReopened"));
                        }}
                        className="rounded-xl bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-300"
                      >
                        {tr("tasks.backToOpen")}
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
                          tr("tasks.confirmClear", {
                            n: String(completedTodayTasks.length),
                          })
                        )
                      )
                        return;
                      for (const task of completedTodayTasks) {
                        await deleteTask(task.id);
                      }
                      toast(tr("tasks.toastCleared"));
                    }}
                    className="rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
                  >
                    {tr("tasks.clearCompleted")}
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null}

        <div className="mt-10 flex flex-col gap-8">
          <GeparkeerdeGedachtenSection />

      {/* SECTIE 1: Nieuwe taak toevoegen (step-flow) */}
      <section className="overflow-hidden rounded-3xl bg-white p-0 shadow-sm">
        <NewTaskFlow
          mode="inline"
          variant="default"
          showClose={false}
          saving={newTaskBusy}
          onSave={handleNewTaskFlowSave}
          className="shadow-none"
        />
      </section>

      {/* SECTIE 4: Alle open taken — ontwerp C */}
      <OpenTasksListC
        loading={loading}
        openByEnergy={openByEnergy}
        completingTaskIds={completingTaskIds}
        onStart={startFocus}
        onEdit={setEditing}
        onDelete={handleDeleteTask}
        onToggle={handleQuickCompleteFromCard}
        onUpdateMicroSteps={async (task, steps) => {
          await updateTask(task.id, { microSteps: steps });
        }}
      />

        </div>
      </main>

      {/* Task Editor Modal –zelfde layout als rest van de app */}
      {editing && (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
          <div className="w-full max-w-lg sm:my-auto">
            <TaskScheduleEditor
              task={editing}
              onSave={async (updatedTask: any) => {
                await updateTask(updatedTask.id, {
                  title: updatedTask.title,
                  dueAt: updatedTask.dueAt ?? null,
                  isDeadline: updatedTask.isDeadline ?? false,
                  reminders: updatedTask.reminders ?? [],
                  repeat: updatedTask.repeat ?? "none",
                  repeatWeekdays: updatedTask.repeatWeekdays ?? "all",
                  repeatAnchor: updatedTask.repeatAnchor ?? "planned",
                  repeatIntervalDays: updatedTask.repeatIntervalDays ?? null,
                  repeatNextDueAt: updatedTask.repeatNextDueAt ?? null,
                  duration: updatedTask.duration ?? null,
                  estimatedDuration: updatedTask.estimatedDuration ?? null,
                  energyLevel: updatedTask.energyLevel ?? "medium",
                  ...(updatedTask.created_at
                    ? { created_at: updatedTask.created_at }
                    : {}),
                });
                setEditing(null);
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
              <div
                ref={convertTaskInfo.wrapperRef}
                style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}
              >
                <div style={{ fontWeight: 700, color: theme.text }}>
                  {tr("tasks.convertModalTitle")}
                </div>
                <button
                  type="button"
                  aria-label={tr("tasks.convertInfoAria")}
                  aria-expanded={convertTaskInfo.open}
                  onClick={convertTaskInfo.toggle}
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
                {convertTaskInfo.open ? (
                  <div
                    role="tooltip"
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: 8,
                      zIndex: 10,
                      maxWidth: 280,
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: `1px solid ${theme.line}`,
                      background: '#fff',
                      boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
                      fontSize: 12,
                      color: theme.sub,
                      lineHeight: 1.45,
                    }}
                  >
                    {tr("tasks.convertInfo")}
                  </div>
                ) : null}
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
                {tr("common.close")}
              </button>
            </div>

            <div style={{ marginBottom: 12, color: theme.sub, fontSize: 13 }}>
              {tr("tasks.taskPrefix")}{" "}
              <span style={{ color: theme.text, fontWeight: 600 }}>{convertingThought.title}</span>
            </div>

            {/* Duration */}
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 10, alignItems: 'center', marginTop: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{tr("tasks.durMinLabel")}</div>
              <input
                type="number"
                min="1"
                max="480"
                value={convertDuration ?? ''}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value, 10) : null;
                  setConvertDuration(Number.isFinite(val as any) ? val : null);
                }}
                placeholder={tr("tasks.durPh")}
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
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{tr("tasks.difficulty")}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {([
                  { key: 'low' as const, label: tr('tasks.diffEasy'), color: '#10B981' },
                  { key: 'medium' as const, label: tr('tasks.diffNormal'), color: '#F59E0B' },
                  { key: 'high' as const, label: tr('tasks.diffHard'), color: '#EF4444' },
                ]).map((opt) => (
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
                {tr("tasks.cancel")}
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
                      toast(tr('tasks.toastNeedDur'));
                      return;
                    }

                    await updateTask(convertingThought.id, {
                      source: 'regular',
                      priority: null,
                      duration: duration,
                      estimatedDuration: duration,
                      energyLevel: convertEnergy,
                    });
                    toast(tr('tasks.toastConverted'));
                    setConvertingThought(null);
                  } catch (err) {
                    console.error('Error converting thought:', err);
                    toast(tr('tasks.toastConvertErr'));
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
                {tr("tasks.convert")}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
  );
}
