"use client";

import {
  getTasksFromStorage,
  clearAllTasks,
  type LocalTask,
} from "@/lib/localStorageTasks";
import { addTaskToSupabase } from "@/lib/supabase/tasksDb";
import type { Task } from "@/context/TaskContext";

const migratedKey = (userId: string) => `structuro_tasks_migrated_${userId}`;
/** Per-taak markering van reeds geüploade taken, zodat een retry niet dubbel uploadt. */
const migratedIdsKey = (userId: string) =>
  `structuro_tasks_migrated_ids_${userId}`;

function readMigratedIds(userId: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(migratedIdsKey(userId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

function writeMigratedIds(userId: string, ids: Set<string>): void {
  try {
    window.localStorage.setItem(
      migratedIdsKey(userId),
      JSON.stringify([...ids])
    );
  } catch {
    /* ignore */
  }
}

function clearMigratedIds(userId: string): void {
  try {
    window.localStorage.removeItem(migratedIdsKey(userId));
  } catch {
    /* ignore */
  }
}

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
 *
 * Veiligheid en idempotentie:
 * - Lokale taken worden ALLEEN gewist en de "migrated"-vlag wordt ALLEEN gezet
 *   wanneer ALLE taken succesvol zijn geüpload. Bij een gedeeltelijke upload
 *   blijven de lokale taken staan zodat een latere aanroep de rest meeneemt.
 * - Reeds geüploade taken worden per id gemarkeerd en bij een retry overgeslagen,
 *   zodat er geen duplicaten ontstaan.
 * - Volledig best-effort: een fout breekt nooit de signup-redirect.
 *
 * @returns Aantal taken dat in deze aanroep nieuw is geüpload (0 als niets te doen was).
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
    clearMigratedIds(userId);
    return 0;
  }

  const migratedIds = readMigratedIds(userId);
  let uploaded = 0;

  for (const local of localTasks) {
    if (migratedIds.has(local.id)) continue;
    try {
      await addTaskToSupabase(userId, localTaskToInsert(local));
      migratedIds.add(local.id);
      uploaded += 1;
      // Markeer direct, zodat een crash midden in de loop geen duplicaten oplevert.
      writeMigratedIds(userId, migratedIds);
    } catch (err) {
      console.warn("[migrateLocalTasks] skip task", local.id, err);
    }
  }

  const allUploaded = localTasks.every((task) => migratedIds.has(task.id));

  if (allUploaded) {
    clearAllTasks();
    try {
      window.localStorage.setItem(migratedKey(userId), "1");
    } catch {
      /* ignore */
    }
    clearMigratedIds(userId);
  } else {
    // Gedeeltelijke migratie: behoud lokale data en de "migrated"-vlag NIET,
    // zodat een latere aanroep de resterende taken alsnog meeneemt.
    writeMigratedIds(userId, migratedIds);
  }

  return uploaded;
}
