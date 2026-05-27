"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { calendarDayToDueAt } from "@/lib/dagstart/deadlineToday";

/** Verplaatst deadline naar kalenderdag via due_at (dagafsluiter carry). */
export async function postponeTasksToCalendarDay(
  supabase: SupabaseClient,
  userId: string,
  taskIds: string[],
  calendarDateYmd: string
): Promise<void> {
  if (taskIds.length === 0) return;
  const dueAt = calendarDayToDueAt(calendarDateYmd);
  if (!dueAt) return;
  try {
    const { error } = await supabase
      .from("tasks")
      .update({
        due_at: dueAt,
        postponed_to: null,
        postponed_at: null,
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
