import { resolveStripeTrialDaysForSignupSource } from "@/lib/stripe/trialConfig";

export type RetentionStats = {
  trialDays: number;
  daysActive: number;
  tasksCompleted: number;
  openTasks: number;
  streakFilled: number;
};

function dateYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Opeenvolgende dagen met dagstart, terug vanaf vandaag of laatste check-in. */
function consecutiveActiveDays(datesYmd: string[]): number {
  if (!datesYmd.length) return 0;
  const set = new Set(datesYmd);
  let cursor = datesYmd[0];
  let streak = 0;
  while (set.has(cursor)) {
    streak += 1;
    const d = new Date(`${cursor}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    cursor = dateYmd(d);
  }
  return streak;
}

export function buildRetentionStats(input: {
  signupSource: string | null;
  checkinDates: string[];
  tasksCompleted: number;
  openTasks: number;
}): RetentionStats {
  const trialDays = resolveStripeTrialDaysForSignupSource(input.signupSource);
  const sorted = [...input.checkinDates].sort().reverse();
  const daysActive = consecutiveActiveDays(sorted);

  return {
    trialDays,
    daysActive,
    tasksCompleted: input.tasksCompleted,
    openTasks: input.openTasks,
    streakFilled: Math.min(Math.max(daysActive, 0), trialDays),
  };
}
