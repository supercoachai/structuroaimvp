"use client";

import { createClient } from "@/lib/supabase/client";
import { getCalendarDateAmsterdam } from "@/lib/dagstartCookie";

/**
 * Schrijf de v2-dagafsluiter naar daily_shutdowns zodat de reminder-edge
 * de rij ziet. Geen taaktitels in remembered_tasks.
 */
export async function persistV2DailyShutdown(winCount: number): Promise<void> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return;

    const date = getCalendarDateAmsterdam();
    const { error } = await supabase.from("daily_shutdowns").upsert(
      {
        user_id: user.id,
        date,
        completed_task_ids: [],
        moved_to_tomorrow_task_ids: [],
        energy_level: null,
        satisfaction_level: null,
        reflection: null,
        remembered_tasks: { win_count: winCount },
      },
      { onConflict: "user_id,date" }
    );
    if (error) {
      console.warn("[v2Shutdown] persist failed", error.message);
    }
  } catch (err) {
    console.warn("[v2Shutdown] persist error", err);
  }
}

export async function fetchTodayV2ShutdownExists(): Promise<boolean> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return false;

    const date = getCalendarDateAmsterdam();
    const { data, error } = await supabase
      .from("daily_shutdowns")
      .select("date")
      .eq("user_id", user.id)
      .eq("date", date)
      .maybeSingle();
    if (error) return false;
    return Boolean(data);
  } catch {
    return false;
  }
}
