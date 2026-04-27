"use client";

import { createClient } from "@/lib/supabase/client";
import { getCalendarDateAmsterdam } from "@/lib/dagstartCookie";

export type CheckInPayload = {
  energy_level: string;
  top3_task_ids: string[] | null;
};

export type CheckInRow = {
  id: string;
  user_id: string;
  date: string;
  energy_level: string | null;
  top3_task_ids: string[] | null;
  created_at: string;
};

export async function getCheckInFromSupabase(
  userId: string,
  date: string
): Promise<CheckInRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("daily_checkins")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as CheckInRow | null;
}

const ENERGY_MAX_TASKS: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

export async function upsertCheckInToSupabase(
  userId: string,
  date: string,
  payload: CheckInPayload
): Promise<void> {
  const maxTasks = ENERGY_MAX_TASKS[payload.energy_level] ?? 3;
  const ids = await sanitizeTop3TaskIdsForDate(
    userId,
    date,
    payload.top3_task_ids?.slice(0, maxTasks) ?? []
  );

  const supabase = createClient();
  const { error } = await supabase.from("daily_checkins").upsert(
    {
      user_id: userId,
      date,
      energy_level: payload.energy_level,
      top3_task_ids: ids.length > 0 ? ids : null,
    },
    { onConflict: "user_id,date" }
  );

  if (error) throw new Error(error.message);
}

async function sanitizeTop3TaskIdsForDate(
  userId: string,
  date: string,
  candidateIds: string[]
): Promise<string[]> {
  if (!candidateIds.length) return [];
  const uniqueIds = Array.from(
    new Set(candidateIds.map((id) => String(id).trim()).filter(Boolean))
  );
  const supabase = createClient();

  const previousDate = getCalendarDateAmsterdam(
    new Date(new Date(`${date}T12:00:00Z`).getTime() - 24 * 60 * 60 * 1000)
  );

  const [{ data: tasks, error: tasksErr }, { data: shutdown, error: shutdownErr }] =
    await Promise.all([
      supabase
        .from("tasks")
        .select("id, done, created_at, postponed_to")
        .eq("user_id", userId)
        .in("id", uniqueIds),
      supabase
        .from("daily_shutdowns")
        .select("moved_to_tomorrow_task_ids")
        .eq("user_id", userId)
        .eq("date", previousDate)
        .maybeSingle(),
    ]);

  if (tasksErr) throw new Error(tasksErr.message);
  if (shutdownErr) throw new Error(shutdownErr.message);

  const movedSet = new Set<string>(
    Array.isArray(shutdown?.moved_to_tomorrow_task_ids)
      ? shutdown.moved_to_tomorrow_task_ids.map((id: string) => String(id))
      : []
  );

  const allowedSet = new Set<string>();
  for (const row of tasks ?? []) {
    const id = String((row as { id: string }).id);
    const done = Boolean((row as { done?: boolean }).done);
    if (done) continue;
    const createdAt = (row as { created_at?: string | null }).created_at ?? null;
    const postponedTo = (row as { postponed_to?: string | null }).postponed_to ?? null;
    const isCreatedToday =
      createdAt != null && getCalendarDateAmsterdam(new Date(createdAt)) === date;
    const isPostponedToday = postponedTo != null && postponedTo === date;
    const isMovedToTomorrow = movedSet.has(id);
    if (isCreatedToday || isPostponedToday || isMovedToTomorrow) {
      allowedSet.add(id);
    }
  }

  return uniqueIds.filter((id) => allowedSet.has(id));
}
