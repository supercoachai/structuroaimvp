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

export async function upsertCheckInToSupabase(
  userId: string,
  date: string,
  payload: CheckInPayload
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("daily_checkins").upsert(
    {
      user_id: userId,
      date,
      energy_level: payload.energy_level,
      top3_task_ids: payload.top3_task_ids?.length ? payload.top3_task_ids : null,
    },
    { onConflict: "user_id,date" }
  );

  if (error) throw new Error(error.message);
}
