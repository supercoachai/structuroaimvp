/**
 * Eén bron van waarheid: "welke taak is eerst aan zet" volgens dagstart.
 * Gebruikt uitsluitend `daily_checkins.top3_task_ids`-volgorde (canoniek),
 * niet `task.priority` of sort op created_at.
 */
export type Top3TaskLike = {
  id: string;
  done?: boolean | null;
  source?: string | null;
};

export type CheckInForTop3 = {
  top3_task_ids?: string[] | null;
  energy_level?: string | null;
};

/** Publiek: zelfde regels als dagstart (low 1 / medium 2 / high 3 ids). */
export function maxSlotsForEnergy(
  energyLevel: string | null | undefined
): number {
  const e = energyLevel || "medium";
  if (e === "low") return 1;
  if (e === "medium") return 2;
  return 3;
}

function isOpenTop3Candidate<T extends Top3TaskLike>(t: T | undefined): t is T {
  return Boolean(
    t &&
      t.source !== "medication" &&
      t.source !== "event" &&
      !t.done
  );
}

/** Alle open top3-taken in dagstart-volgorde (voor hero-wissel). */
export function getOpenTop3Tasks<T extends Top3TaskLike & { id: string }>(
  tasks: T[],
  checkIn: CheckInForTop3 | null | undefined
): T[] {
  const rawIds = checkIn?.top3_task_ids;
  if (!Array.isArray(rawIds) || rawIds.length === 0) return [];

  const max = maxSlotsForEnergy(checkIn?.energy_level);
  const ids = rawIds.slice(0, max);
  const open: T[] = [];

  for (const taskId of ids) {
    const idStr = String(taskId).trim();
    if (!idStr) continue;
    const task = tasks.find((t) => t && String(t.id) === idStr);
    if (isOpenTop3Candidate(task)) open.push(task);
  }
  return open;
}

/**
 * Eerste taak uit top3_task_ids die nog open is (niet done, geen medication/event).
 * Respecteert energie-limiet (low 1 / medium 2 / high 3 ids).
 */
export function getFirstOpenTop3Task<T extends Top3TaskLike & { id: string }>(
  tasks: T[],
  checkIn: CheckInForTop3 | null | undefined
): T | null {
  return getOpenTop3Tasks(tasks, checkIn)[0] ?? null;
}

export function getTop3SlotPosition(
  taskId: string,
  checkIn: CheckInForTop3 | null | undefined
): { current: number; total: number } | null {
  const rawIds = checkIn?.top3_task_ids;
  if (!Array.isArray(rawIds) || rawIds.length === 0) return null;
  const total = maxSlotsForEnergy(checkIn?.energy_level);
  const ids = rawIds.slice(0, total);
  const idx = ids.findIndex((id) => String(id) === String(taskId));
  if (idx < 0) return null;
  return { current: idx + 1, total };
}
