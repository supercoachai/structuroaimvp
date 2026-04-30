"use client";

import { createClient } from "@/lib/supabase/client";

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

/**
 * Alleen echte, open, actieve taken van deze gebruiker (geen ghost-ids).
 * Geen filter op created_at: backlog van eerdere dagen mag in top3.
 */
async function sanitizeTop3TaskIdsForDate(
  userId: string,
  candidateIds: string[]
): Promise<string[]> {
  if (!candidateIds.length) return [];
  const uniqueIds = Array.from(
    new Set(candidateIds.map((id) => String(id).trim()).filter(Boolean))
  );
  const supabase = createClient();

  const { data: taskRows, error: tasksErr } = await supabase
    .from("tasks")
    .select("id, done, not_today")
    .eq("user_id", userId)
    .in("id", uniqueIds);

  if (tasksErr) throw new Error(tasksErr.message);

  const allowedSet = new Set<string>();
  for (const row of taskRows ?? []) {
    const r = row as { id: string; done?: boolean | null; not_today?: boolean | null };
    if (r.done) continue;
    if (r.not_today) continue;
    allowedSet.add(String(r.id));
  }

  return uniqueIds.filter((id) => allowedSet.has(id));
}
