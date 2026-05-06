"use client";

import { getTasksFromStorage, getTodayCheckIn, type LocalTask } from "@/lib/localStorageTasks";

import { getCalendarDateAmsterdam } from "@/lib/dagstartCookie";
import { upsertCheckInToSupabase } from "@/lib/supabase/checkinsDb";

/** Verplaatst lokale MVP-data naar de ingelogde gebruiker na signup/login. Retourneert aantallen voor toast. */
export async function migrateLocalStorageAfterSignup(
  userId: string
): Promise<{ tasks: number; didCheckIn: boolean }> {
  if (typeof window === "undefined") return { tasks: 0, didCheckIn: false };

  let taskCount = 0;
  const rawTasks = getTasksFromStorage();

  const payloads = rawTasks
    .filter((t: LocalTask) => String(t.title ?? "").trim().length >= 2)
    .map((t: LocalTask) => ({
      title: String(t.title).trim(),
      done: Boolean(t.done),
      started: Boolean(t.started),
      priority: typeof t.priority === "number" ? t.priority : null,
      dueAt: t.dueAt ?? null,
      duration: typeof t.duration === "number" ? t.duration : undefined,
      estimatedDuration:
        typeof t.estimatedDuration === "number" ? t.estimatedDuration : undefined,
      source: t.source || "regular",
      completedAt: t.completedAt ?? null,
      reminders: Array.isArray(t.reminders) ? t.reminders : [],
      repeat: t.repeat || "none",
      impact: t.impact,
      energyLevel: t.energyLevel || "medium",
    }));

  if (payloads.length > 0) {
    const res = await fetch("/api/tasks/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ tasks: payloads }),
    });
    if (res.ok) {
      taskCount = payloads.length;
      try {
        localStorage.removeItem("structuro_tasks");
      } catch {
        /* ignore */
      }
    }
  }

  let didCheckIn = false;
  const ci = getTodayCheckIn();
  if (ci?.energy_level && String(ci.energy_level).trim()) {
    try {
      await upsertCheckInToSupabase(userId, getCalendarDateAmsterdam(), {
        energy_level: String(ci.energy_level),
        top3_task_ids: null,
      });
      didCheckIn = true;
      try {
        localStorage.removeItem("structuro_daily_checkins");
      } catch {
        /* ignore */
      }
    } catch {
      didCheckIn = false;
    }
  }

  return { tasks: taskCount, didCheckIn };
}
