import type { Task } from "@/context/TaskContext";
import {
  type CheckInForTop3,
  maxSlotsForEnergy,
} from "@/lib/top3CurrentTask";
import { getTaskDurationMinutes } from "@/lib/taskDurationMinutes";

const DEFAULT_TASK_MINUTES = 15;

function taskPlannedMinutes(task: Pick<Task, "duration" | "estimatedDuration">): number {
  return getTaskDurationMinutes(task) ?? DEFAULT_TASK_MINUTES;
}

function focusElapsedMinutes(
  task: Pick<Task, "focusStartedAt" | "focusExitedAt">
): number {
  if (!task.focusStartedAt) return 0;
  const start = new Date(task.focusStartedAt).getTime();
  if (Number.isNaN(start)) return 0;
  const endRaw = task.focusExitedAt ? new Date(task.focusExitedAt).getTime() : Date.now();
  const end = Number.isNaN(endRaw) ? Date.now() : endRaw;
  return Math.max(0, Math.round((end - start) / 60_000));
}

/** Geplande minuten vs. afgerond + eventuele focus-tijd op de huidige taak. */
export function getTodayMinutesProgress(
  tasks: Task[],
  checkIn: CheckInForTop3 | null | undefined,
  activeTaskId?: string | null
): { done: number; total: number } | null {
  const rawIds = checkIn?.top3_task_ids;
  if (!Array.isArray(rawIds) || rawIds.length === 0) return null;

  const max = maxSlotsForEnergy(checkIn?.energy_level);
  const ids = rawIds.slice(0, max);
  let total = 0;
  let done = 0;

  for (const id of ids) {
    const idStr = String(id).trim();
    if (!idStr) continue;
    const task = tasks.find((t) => t && String(t.id) === idStr);
    if (!task) continue;
    const planned = taskPlannedMinutes(task);
    total += planned;
    if (task.done) {
      done += planned;
    } else if (activeTaskId && String(task.id) === String(activeTaskId)) {
      done += Math.min(planned, focusElapsedMinutes(task));
    }
  }

  if (total <= 0) return null;
  return { done: Math.min(done, total), total };
}
