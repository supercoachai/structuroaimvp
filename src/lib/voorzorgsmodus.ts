import type { Task } from "@/context/TaskContext";

const ENERGY_CAPACITY: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

export type EnergyLevel = "low" | "medium" | "high";

export interface VoorzorgsmodusState {
  shouldShow: boolean;
  deadlineTasks: Task[];
  capacity: number;
  excess: number;
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isPastOrToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const todayStart = new Date();
  todayStart.setHours(23, 59, 59, 999);
  return d.getTime() <= todayStart.getTime();
}

export function getDeadlineTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => {
    if (t.done || t.notToday) return false;
    if (t.isDeadline) return true;
    if (t.dueAt && isPastOrToday(t.dueAt)) return true;
    return false;
  });
}

export function checkVoorzorgsmodus(
  tasks: Task[],
  energyLevel: EnergyLevel
): VoorzorgsmodusState {
  const capacity = ENERGY_CAPACITY[energyLevel] ?? 3;
  const deadlineTasks = getDeadlineTasks(tasks);
  const excess = Math.max(0, deadlineTasks.length - capacity);

  return {
    shouldShow: excess > 0,
    deadlineTasks,
    capacity,
    excess,
  };
}

export type VoorzorgsmodusOption = "push" | "prioriteer" | "schuif_uit";

export interface VoorzorgsmodusResult {
  option: VoorzorgsmodusOption;
  selectedTaskIds: string[];
  deferredTaskIds: string[];
}

export function resolveVoorzorgsmodus(
  deadlineTasks: Task[],
  capacity: number,
  option: VoorzorgsmodusOption
): VoorzorgsmodusResult {
  const allIds = deadlineTasks.map((t) => t.id);

  switch (option) {
    case "push":
      return { option, selectedTaskIds: allIds, deferredTaskIds: [] };

    case "prioriteer":
      return {
        option,
        selectedTaskIds: allIds.slice(0, capacity),
        deferredTaskIds: allIds.slice(capacity),
      };

    case "schuif_uit": {
      const toDefer = allIds.slice(capacity);
      return {
        option,
        selectedTaskIds: allIds.slice(0, capacity),
        deferredTaskIds: toDefer,
      };
    }

    default:
      return { option: "push", selectedTaskIds: allIds, deferredTaskIds: [] };
  }
}
