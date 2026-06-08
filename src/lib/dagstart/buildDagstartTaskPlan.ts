import {
  buildDeadlineDagstartPlan,
  getDeadlineTasksForDagstartFill,
  isDeadlineEligibleTask,
  isDueExactlyToday,
  type DeadlineEligibleTask,
} from "@/lib/dagstart/deadlineToday";
import {
  pickStructuroTasks,
  type DayEnergy,
} from "@/lib/dagstart/structuroPick";
import { getCalendarDateAmsterdam } from "@/lib/dagstartCookie";
import { isRecurringDueToday } from "@/lib/taskRecurrence";

export type DagstartTaskPlan<T extends DeadlineEligibleTask> = {
  deadlineAutoFill: T[];
  deadlineOverflow: T[];
  recurringDueToday: T[];
  structuroFill: T[];
  /** Alle deadline-taken voor vandaag (auto + overflow), voor sort/filter in UI. */
  deadlineTodayIds: Set<string>;
  recurringTodayIds: Set<string>;
};

export function isTaskDueTodayForDagstart(
  task: DeadlineEligibleTask,
  todayYmd: string = getCalendarDateAmsterdam()
): boolean {
  return (
    isDeadlineEligibleTask(task) && isDueExactlyToday(task.dueAt, todayYmd)
  );
}

/**
 * Centraal dagstart-plan: deadlines vullen eerst, daarna Structuro op resterende slots.
 * Zelfde plan voor "Ik kies zelf" (alleen auto-fill + overflow) en "Structuro kiest" (+ structuroFill).
 */
export function buildDagstartTaskPlan<
  T extends DeadlineEligibleTask & {
    id: string;
    energyLevel?: string | null;
    impact?: string | null;
  },
>(
  poolTasks: T[],
  structuroCandidates: T[],
  dayEnergy: DayEnergy,
  maxSlots: number,
  todayYmd: string = getCalendarDateAmsterdam(),
  impactRank: (task: T) => number = () => 3
): DagstartTaskPlan<T> {
  const { autoFill, overflow } = buildDeadlineDagstartPlan(
    poolTasks,
    maxSlots,
    todayYmd
  );
  const deadlineToday = getDeadlineTasksForDagstartFill(poolTasks, todayYmd);
  const deadlineTodayIds = new Set(deadlineToday.map((t) => String(t.id)));

  const recurringDueToday = poolTasks.filter(
    (t) =>
      t?.id &&
      isRecurringDueToday(t, todayYmd) &&
      !deadlineTodayIds.has(String(t.id))
  );

  const recurringTodayIds = new Set(recurringDueToday.map((t) => String(t.id)));

  const autoFillIds = new Set(autoFill.map((t) => String(t.id)));
  const remainingSlots = Math.max(0, maxSlots - autoFill.length);

  const structuroExclude = new Set([...deadlineTodayIds, ...recurringTodayIds]);
  const structuroPool = structuroCandidates.filter(
    (t) => t?.id && !structuroExclude.has(String(t.id))
  );

  const structuroFill: T[] =
    remainingSlots > 0
      ? (pickStructuroTasks(
          dayEnergy,
          structuroPool as Parameters<typeof pickStructuroTasks>[1],
          (task) => impactRank(task as T),
          autoFillIds
        ).slice(0, remainingSlots) as T[])
      : [];

  return {
    deadlineAutoFill: autoFill,
    deadlineOverflow: overflow,
    recurringDueToday,
    structuroFill,
    deadlineTodayIds,
    recurringTodayIds,
  };
}

export function rankTaskForDagstartSuggestions<
  T extends DeadlineEligibleTask,
>(
  task: T,
  todayYmd: string = getCalendarDateAmsterdam()
): number {
  if (isTaskDueTodayForDagstart(task, todayYmd)) return 0;
  if (isRecurringDueToday(task, todayYmd)) return 1;
  return 2;
}
