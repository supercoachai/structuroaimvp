"use client";

import { createClient } from "@/lib/supabase/client";
import type { CyclePhase } from "@/lib/cycle/types";

export type CheckInPayload = {
  energy_level: string;
  top3_task_ids: string[] | null;
  /**
   * Optioneel: huidige cyclusfase volgens calculateCyclePhase().
   * Alleen gevuld als de gebruiker consent heeft gegeven voor cyclus-tracking.
   */
  cycle_phase?: CyclePhase | null;
};

export type CheckInRow = {
  id: string;
  user_id: string;
  date: string;
  energy_level: string | null;
  top3_task_ids: string[] | null;
  cycle_phase: CyclePhase | null;
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

export type UpsertCheckInResult = {
  top3_task_ids: string[] | null;
};

export async function upsertCheckInToSupabase(
  userId: string,
  date: string,
  payload: CheckInPayload
): Promise<UpsertCheckInResult> {
  const maxTasks = ENERGY_MAX_TASKS[payload.energy_level] ?? 3;
  const requested =
    payload.top3_task_ids?.slice(0, maxTasks).filter(Boolean) ?? [];
  const ids = await sanitizeTop3TaskIdsForDate(userId, requested);

  if (requested.length > 0 && ids.length === 0) {
    throw new Error(
      "Geen van je gekozen taken kon worden opgeslagen. Vernieuw je takenlijst en probeer opnieuw."
    );
  }

  const savedTop3 = ids.length > 0 ? ids : null;
  const supabase = createClient();
  const includeCyclePhase = payload.cycle_phase !== undefined;
  const baseRow: Record<string, unknown> = {
    user_id: userId,
    date,
    energy_level: payload.energy_level,
    top3_task_ids: savedTop3,
  };
  if (includeCyclePhase) {
    baseRow.cycle_phase = payload.cycle_phase ?? null;
  }
  const { error } = await supabase
    .from("daily_checkins")
    .upsert(baseRow, { onConflict: "user_id,date" });

  if (error) {
    const msg = error.message ?? "";
    if (
      includeCyclePhase &&
      (msg.includes("cycle_phase") || msg.includes("schema cache"))
    ) {
      delete baseRow.cycle_phase;
      const { error: retryErr } = await supabase
        .from("daily_checkins")
        .upsert(baseRow, { onConflict: "user_id,date" });
      if (retryErr) throw new Error(retryErr.message);
      return { top3_task_ids: savedTop3 };
    }
    throw new Error(error.message);
  }

  return { top3_task_ids: savedTop3 };
}

/**
 * Alleen echte, open, actieve taken van deze gebruiker (geen ghost-ids).
 * Geen filter op created_at: backlog van eerdere dagen mag in top3.
 */
export async function sanitizeTop3TaskIdsForDate(
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
