"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

/** Zet postponed_to / postponed_at voor dagafsluiter-keuze "morgen oppakken". */
export async function postponeTasksToCalendarDay(
  supabase: SupabaseClient,
  userId: string,
  taskIds: string[],
  calendarDateYmd: string
): Promise<void> {
  if (taskIds.length === 0) return;
  try {
    const { error } = await supabase
      .from("tasks")
      .update({
        postponed_to: calendarDateYmd,
        postponed_at: new Date().toISOString(),
      })
      .in("id", taskIds)
      .eq("user_id", userId);
    if (error) throw error;
  } catch (error) {
    console.error(
      "Postpone error:",
      error instanceof Error ? error.message : error,
      error
    );
    throw error;
  }
}
