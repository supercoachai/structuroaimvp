/**
 * Zelfde regels als "Alle open taken" in TasksOverview:
 * geen prioriteit 1–3, geen medicatie/events/parkeer, niet afgerond, niet "niet vandaag".
 */
export function isOpenBacklogTask(t: {
  done?: boolean;
  notToday?: boolean;
  source?: string;
  priority?: number | null;
}): boolean {
  if (!t || t.done || t.notToday) return false;
  if (t.source === 'medication' || t.source === 'event' || t.source === 'parked_thought') {
    return false;
  }
  const hasPriority =
    t.priority != null &&
    t.priority !== 0 &&
    (t.priority == 1 || t.priority == 2 || t.priority == 3);
  return !hasPriority;
}
