export type DayEnergy = "low" | "medium" | "high";

export function structuroPickCount(dayEnergy: DayEnergy): number {
  if (dayEnergy === "low") return 1;
  if (dayEnergy === "medium") return 2;
  return 3;
}

/** Taak past bij dag-energie voor automatische selectie. */
export function taskMatchesDayEnergy(
  dayEnergy: DayEnergy,
  taskEnergy: string | null | undefined
): boolean {
  const e = String(taskEnergy || "medium").toLowerCase();
  if (dayEnergy === "low") return e === "low";
  if (dayEnergy === "medium") return e === "low" || e === "medium";
  return true;
}

export function compareTasksByPriority<T extends {
  duration?: number | null;
  estimatedDuration?: number | null;
  title?: string;
}>(
  a: T,
  b: T,
  impactRank: (task: T) => number
): number {
  const impactDiff = impactRank(a) - impactRank(b);
  if (impactDiff !== 0) return impactDiff;
  const durA = a.duration || a.estimatedDuration || 999;
  const durB = b.duration || b.estimatedDuration || 999;
  if (durA !== durB) return durA - durB;
  return String(a.title || "").localeCompare(String(b.title || ""));
}

export function pickStructuroTasks<
  T extends {
    id: string;
    energyLevel?: string | null;
    duration?: number | null;
    estimatedDuration?: number | null;
    title?: string;
  },
>(
  dayEnergy: DayEnergy,
  candidates: T[],
  impactRank: (task: T) => number,
  excludeIds: ReadonlySet<string> = new Set()
): T[] {
  const count = structuroPickCount(dayEnergy);
  const filtered = candidates.filter(
    (t) =>
      t?.id &&
      !excludeIds.has(String(t.id)) &&
      taskMatchesDayEnergy(dayEnergy, t.energyLevel)
  );
  const sorted = [...filtered].sort((a, b) =>
    compareTasksByPriority(a, b, impactRank)
  );
  return sorted.slice(0, count);
}
