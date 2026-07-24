import type { V2Task, V2TaskEnergy } from "./v2Tasks";

export type V2ShutdownWin = { id: string; label: string; energy: V2TaskEnergy };

/** Alleen afgeronde parent-taken. Microstappen tellen niet als aparte wins. */
export function collectWins(tasks: V2Task[]): V2ShutdownWin[] {
  const wins: V2ShutdownWin[] = [];
  for (const task of tasks) {
    if (!task.done) continue;
    const label = task.title.trim();
    if (!label) continue;
    wins.push({ id: task.id, label, energy: task.energy });
  }
  return wins;
}
