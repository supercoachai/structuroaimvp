"use client";

import {
  getTasksFromStorage,
  clearAllTasks,
  type LocalTask,
} from "@/lib/localStorageTasks";
import { addTaskToSupabase } from "@/lib/supabase/tasksDb";
import type { Task } from "@/context/TaskContext";

const migratedKey = (userId: string) => `structuro_tasks_migrated_${userId}`;

function localTaskToInsert(local: LocalTask): Omit<Task, "id"> {
  let priority: number | null = null;
  if (local.priority != null) {
    const n =
      typeof local.priority === "string"
        ? parseInt(local.priority, 10)
        : Number(local.priority);
    priority = Number.isFinite(n) ? n : null;
  }

  return {
    title: local.title,
    done: local.done,
    started: local.started ?? false,
    priority,
    dueAt: local.dueAt ?? undefined,
    duration: local.duration ?? undefined,
    source: local.source ?? "regular",
    postponedTo: local.postponedTo ?? null,
    focusStartedAt: local.focusStartedAt ?? null,
    focusExitedAt: local.focusExitedAt ?? null,
    focusAttempts: local.focusAttempts ?? 0,
    completedAt: local.completedAt ?? undefined,
    reminders: local.reminders ?? [],
    repeat: local.repeat ?? "none",
    repeatUntil: local.repeatUntil ?? undefined,
    repeatWeekdays: local.repeatWeekdays ?? "all",
    repeatExcludeDates: local.repeatExcludeDates,
    repeatAnchor: local.repeatAnchor,
    repeatIntervalDays: local.repeatIntervalDays ?? undefined,
    repeatNextDueAt: local.repeatNextDueAt ?? undefined,
    impact: local.impact ?? "🌱",
    energyLevel: local.energyLevel ?? "medium",
    estimatedDuration: local.estimatedDuration ?? undefined,
    microSteps: Array.isArray(local.microSteps) ? local.microSteps : [],
    notToday: local.notToday ?? false,
    isDeadline: local.isDeadline,
    category: local.category,
    created_at: local.created_at,
    updated_at: local.updated_at,
  };
}

/**
 * Eenmalige upload van localStorage-taken na eerste login.
 * @returns Aantal geüploade taken (0 als niets te migreren was).
 */
export async function migrateLocalTasksToSupabase(
  userId: string
): Promise<number> {
  if (typeof window === "undefined" || !userId) return 0;

  try {
    if (window.localStorage.getItem(migratedKey(userId))) return 0;
  } catch {
    return 0;
  }

  const localTasks = getTasksFromStorage();
  if (!localTasks.length) {
    try {
      window.localStorage.setItem(migratedKey(userId), "1");
    } catch {
      /* ignore */
    }
    return 0;
  }

  let uploaded = 0;
  for (const local of localTasks) {
    try {
      await addTaskToSupabase(userId, localTaskToInsert(local));
      uploaded += 1;
    } catch (err) {
      console.warn("[migrateLocalTasks] skip task", local.id, err);
    }
  }

  if (uploaded > 0) {
    clearAllTasks();
  }

  try {
    window.localStorage.setItem(migratedKey(userId), "1");
  } catch {
    /* ignore */
  }

  return uploaded;
}
