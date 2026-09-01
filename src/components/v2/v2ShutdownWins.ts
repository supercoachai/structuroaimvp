import { formatCompletedTimeAmsterdam } from "@/lib/dagafsluiting/formatCompletedTime";

import type { V2Task, V2TaskEnergy } from "./v2Tasks";
import { isV2TaskCompletedToday } from "./v2Tasks";

export type V2ShutdownWin = {
  id: string;
  label: string;
  energy: V2TaskEnergy;
  at: string;
};

/** Alleen afgeronde parent-taken van vandaag. Microstappen tellen niet als aparte wins. */
export function collectWins(tasks: V2Task[], today?: string): V2ShutdownWin[] {
  const wins: V2ShutdownWin[] = [];
  for (const task of tasks) {
    if (!isV2TaskCompletedToday(task, today)) continue;
    const label = task.title.trim();
    if (!label) continue;
    wins.push({
      id: task.id,
      label,
      energy: task.energy,
      at: formatCompletedTimeAmsterdam(task.completedAt),
    });
  }
  return wins;
}
