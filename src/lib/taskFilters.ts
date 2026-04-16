/**
 * Basisregels voor "backlog"-taken (o.a. energie-kolommen in TasksOverview).
 * TasksOverview filtert daarnaast taken weg die al onder "Vandaag gekozen" staan (één plek per scherm).
 * Uitgesloten: medicatie, agenda-events, geparkeerde gedachten, afgerond, "niet vandaag".
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
  return true;
}
