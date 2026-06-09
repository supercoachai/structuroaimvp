/**
 * Bouwt het Supabase update-object voor PUT /api/tasks.
 * Alleen velden met waarde !== undefined worden meegenomen (geen stille null-wipes).
 */
export type TaskPutCamelUpdates = {
  title?: string;
  done?: boolean;
  priority?: number | null;
  duration?: number | null;
  source?: string;
  reminders?: number[];
  repeat?: string;
  impact?: string;
  dueAt?: string | null;
  completedAt?: string | null;
  energyLevel?: string;
  estimatedDuration?: number | null;
  microSteps?: unknown;
  notToday?: boolean;
  started?: boolean;
  postponedTo?: string | null;
  focusStartedAt?: string | null;
  focusExitedAt?: string | null;
  focusAttempts?: number;
  repeatUntil?: string | null;
  repeatWeekdays?: string;
  repeatExcludeDates?: string[];
  repeatAnchor?: string | null;
  repeatIntervalDays?: number | null;
  repeatNextDueAt?: string | null;
  isDeadline?: boolean;
  category?: string;
};

export function buildTaskPutDbUpdates(
  updates: TaskPutCamelUpdates
): Record<string, unknown> {
  const dbUpdates: Record<string, unknown> = {};

  if (updates.dueAt !== undefined) dbUpdates.due_at = updates.dueAt;
  if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt;
  if (updates.energyLevel !== undefined) dbUpdates.energy_level = updates.energyLevel;
  if (updates.estimatedDuration !== undefined) {
    dbUpdates.estimated_duration = updates.estimatedDuration;
  }
  if (updates.microSteps !== undefined) dbUpdates.micro_steps = updates.microSteps;
  if (updates.notToday !== undefined) dbUpdates.not_today = updates.notToday;
  if (updates.started !== undefined) dbUpdates.started = updates.started;

  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.done !== undefined) dbUpdates.done = updates.done;
  if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
  if (updates.duration !== undefined) dbUpdates.duration = updates.duration;
  if (updates.source !== undefined) dbUpdates.source = updates.source;
  if (updates.reminders !== undefined) dbUpdates.reminders = updates.reminders;
  if (updates.repeat !== undefined) dbUpdates.repeat = updates.repeat;
  if (updates.impact !== undefined) dbUpdates.impact = updates.impact;

  if (updates.postponedTo !== undefined) dbUpdates.postponed_to = updates.postponedTo;
  if (updates.focusStartedAt !== undefined) {
    dbUpdates.focus_started_at = updates.focusStartedAt;
  }
  if (updates.focusExitedAt !== undefined) {
    dbUpdates.focus_exited_at = updates.focusExitedAt;
  }
  if (updates.focusAttempts !== undefined) {
    dbUpdates.focus_attempts = updates.focusAttempts;
  }
  if (updates.repeatUntil !== undefined) dbUpdates.repeat_until = updates.repeatUntil;
  if (updates.repeatWeekdays !== undefined) {
    dbUpdates.repeat_weekdays = updates.repeatWeekdays;
  }
  if (updates.repeatExcludeDates !== undefined) {
    dbUpdates.repeat_exclude_dates = updates.repeatExcludeDates;
  }
  if (updates.repeatAnchor !== undefined) dbUpdates.repeat_anchor = updates.repeatAnchor;
  if (updates.repeatIntervalDays !== undefined) {
    dbUpdates.repeat_interval_days = updates.repeatIntervalDays;
  }
  if (updates.repeatNextDueAt !== undefined) {
    dbUpdates.repeat_next_due_at = updates.repeatNextDueAt;
  }
  if (updates.isDeadline !== undefined) dbUpdates.is_deadline = updates.isDeadline;
  if (updates.category !== undefined) dbUpdates.category = updates.category;

  return dbUpdates;
}
