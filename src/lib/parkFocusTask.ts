import type { Task } from "@/context/TaskContext";

type CheckInSlice = { energy_level: string; top3_task_ids: string[] | null };

type SaveCheckInFn = (payload: {
  energy_level: string;
  top3_task_ids: string[] | null;
}) => Promise<void>;

/**
 * Parkeert een focustaak geruisloos: uit dagstart-top3, prioriteiten opnieuw 1..n, taak terug naar backlog.
 * Geen XP/gamification — alleen task + optioneel check-in updates.
 */
export async function parkFocusTaskSilently(
  taskId: string,
  checkIn: CheckInSlice | null | undefined,
  saveCheckIn: SaveCheckInFn | null | undefined,
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task>
): Promise<{ remainingTop3Ids: string[] }> {
  const ids = checkIn?.top3_task_ids?.filter(Boolean) ?? [];
  const wasInTop3 = ids.includes(taskId);
  const remaining = ids.filter((id) => id !== taskId);

  await updateTask(taskId, { priority: null, started: false });

  for (let i = 0; i < remaining.length; i++) {
    await updateTask(remaining[i], { priority: i + 1 });
  }

  if (checkIn && saveCheckIn && wasInTop3) {
    await saveCheckIn({
      energy_level: checkIn.energy_level,
      top3_task_ids: remaining.length > 0 ? remaining : null,
    });
  }

  return { remainingTop3Ids: remaining };
}
