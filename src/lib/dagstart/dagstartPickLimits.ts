import type { DagstartTaskCard } from "@/components/dagstart/design/types";

export const DAGSTART_MAX_FOCUS_SLOTS = 4;

export function isDagstartDeadlineCard(
  task: Pick<DagstartTaskCard, "deadline">
): boolean {
  return Boolean(task.deadline);
}

export type DagstartKeepAnalysis =
  | { kind: "allow" }
  | { kind: "reject"; reason: "slots_full" }
  | { kind: "overflow"; task: DagstartTaskCard };

/** Mag een taak bij de huidige keuze? Deadlines boven max vereisen expliciete bevestiging. */
export function analyzeDagstartKeep(
  task: DagstartTaskCard,
  keptIds: readonly string[],
  maxSlots: number,
  extraDeadlineSlots: number
): DagstartKeepAnalysis {
  if (keptIds.includes(task.id)) return { kind: "allow" };

  const capacity = Math.min(
    maxSlots + extraDeadlineSlots,
    DAGSTART_MAX_FOCUS_SLOTS
  );

  if (keptIds.length >= capacity) {
    if (isDagstartDeadlineCard(task)) return { kind: "overflow", task };
    return { kind: "reject", reason: "slots_full" };
  }

  if (keptIds.length >= maxSlots) {
    if (isDagstartDeadlineCard(task)) return { kind: "overflow", task };
    return { kind: "reject", reason: "slots_full" };
  }

  return { kind: "allow" };
}

export function resolveDagstartSavedTaskIds(
  pickedIds: readonly string[],
  maxSlots: number,
  extraDeadlineSlots: number
): string[] {
  const cap = Math.min(maxSlots + extraDeadlineSlots, DAGSTART_MAX_FOCUS_SLOTS);
  return pickedIds.slice(0, cap);
}

export function dagstartSlotCapacity(
  maxSlots: number,
  extraDeadlineSlots: number
): number {
  return Math.min(maxSlots + extraDeadlineSlots, DAGSTART_MAX_FOCUS_SLOTS);
}

/** Houdt alleen keuzes die binnen limiet vallen (bevestigde deadline-extra meegeteld). */
export function clampDagstartSelection(
  pickedIds: readonly string[],
  tasksById: ReadonlyMap<string, DagstartTaskCard>,
  maxSlots: number,
  extraDeadlineSlots: number
): string[] {
  const result: string[] = [];
  for (const id of pickedIds) {
    const task = tasksById.get(id);
    if (!task) continue;
    const analysis = analyzeDagstartKeep(
      task,
      result,
      maxSlots,
      extraDeadlineSlots
    );
    if (analysis.kind === "allow") result.push(id);
  }
  return result;
}

export function canAddDagstartTask(
  task: DagstartTaskCard,
  keptIds: readonly string[],
  maxSlots: number,
  extraDeadlineSlots: number
): DagstartKeepAnalysis {
  if (keptIds.includes(task.id)) return { kind: "allow" };
  return analyzeDagstartKeep(task, keptIds, maxSlots, extraDeadlineSlots);
}
