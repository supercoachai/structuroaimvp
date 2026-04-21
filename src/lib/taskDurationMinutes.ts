import type { Task } from "@/context/TaskContext";

function toPositiveMinutes(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/**
 * Geplande taakduur in minuten (integer). Zowel `duration` als `estimatedDuration` zijn in de app-domain altijd minuten, geen seconden.
 * String-waarden uit JSON/API worden gecoerceerd.
 */
export function getTaskDurationMinutes(
  task: Pick<Task, "duration" | "estimatedDuration"> | null | undefined
): number | null {
  if (!task) return null;
  const fromDuration = toPositiveMinutes(task.duration as unknown);
  const fromEstimated = toPositiveMinutes(task.estimatedDuration as unknown);
  if (fromDuration != null) return fromDuration;
  if (fromEstimated != null) return fromEstimated;
  return null;
}
