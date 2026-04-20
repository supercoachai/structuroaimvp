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
  const ids = payload.top3_task_ids?.slice(0, maxTasks) ?? null;

  const supabase = createClient();
  const { error } = await supabase.from("daily_checkins").upsert(
    {
      user_id: userId,
      date,
      energy_level: payload.energy_level,
      top3_task_ids: ids?.length ? ids : null,
    },
    { onConflict: "user_id,date" }
  );

  if (error) throw new Error(error.message);
}
