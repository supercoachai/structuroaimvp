"use client";

import {
  getCheckInFromSupabase,
  upsertCheckInToSupabase,
  type CheckInPayload,
  type CheckInRow,
} from "@/lib/supabase/checkinsDb";

function top3ArraysEqual(
  a: string[] | null | undefined,
  b: string[] | null | undefined
): boolean {
  const left = a ?? [];
  const right = b ?? [];
  if (left.length !== right.length) return false;
  return left.every((id, index) => id === right[index]);
}

/** Verwijder ghost-IDs uit top3 en persist als de DB nog verouderde ids bevat. */
export async function loadAndRepairCheckInTop3(
  userId: string,
  date: string
): Promise<CheckInRow | null> {
  const row = await getCheckInFromSupabase(userId, date);
  if (!row?.top3_task_ids?.length) return row;

  const saved = await upsertCheckInToSupabase(userId, date, {
    energy_level: row.energy_level ?? "medium",
    top3_task_ids: row.top3_task_ids,
    cycle_phase: row.cycle_phase,
  });

  if (top3ArraysEqual(row.top3_task_ids, saved.top3_task_ids)) {
    return row;
  }

  return { ...row, top3_task_ids: saved.top3_task_ids };
}

/** Verwijder één taak-id uit de top3 van vandaag (bij task-delete). */
export async function removeTaskIdFromTodayTop3(
  userId: string,
  date: string,
  taskId: string
): Promise<void> {
  const row = await getCheckInFromSupabase(userId, date);
  if (!row?.top3_task_ids?.includes(taskId)) return;

  const remaining = row.top3_task_ids.filter((id) => id !== taskId);
  const payload: CheckInPayload = {
    energy_level: row.energy_level ?? "medium",
    top3_task_ids: remaining.length > 0 ? remaining : null,
    cycle_phase: row.cycle_phase,
  };
  await upsertCheckInToSupabase(userId, date, payload);
}
