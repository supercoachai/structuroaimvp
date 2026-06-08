import type { SupabaseClient } from "@supabase/supabase-js";
import { buildRetentionStats, type RetentionStats } from "@/lib/retentionStats";
import { OPEN_BACKLOG_EXCLUDED_SOURCES } from "@/lib/taskFilters";
import { resolveStripeTrialDaysForSignupSource } from "@/lib/stripe/trialConfig";

const CHECKIN_LOOKBACK_DAYS = 120;

function checkinMinDateYmd(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - CHECKIN_LOOKBACK_DAYS);
  return d.toISOString().slice(0, 10);
}

type FetchRetentionStatsOptions = {
  signupSource?: string | null;
};

export async function fetchRetentionStatsForUser(
  supabase: SupabaseClient,
  userId: string,
  options: FetchRetentionStatsOptions = {}
): Promise<RetentionStats> {
  let signupSource: string | null =
    options.signupSource === undefined ? null : options.signupSource;

  if (options.signupSource === undefined) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("signup_source")
      .eq("id", userId)
      .maybeSingle();
    signupSource = (profile?.signup_source as string | null) ?? null;
  }

  const excludedSources = OPEN_BACKLOG_EXCLUDED_SOURCES.map((s) => `"${s}"`).join(
    ","
  );
  const minCheckinDate = checkinMinDateYmd();

  const [{ count: tasksCompleted }, { count: openTasks }, { data: checkins }] =
    await Promise.all([
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("done", true),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("done", false)
        .eq("not_today", false)
        .not("source", "in", `(${excludedSources})`),
      supabase
        .from("daily_checkins")
        .select("date")
        .eq("user_id", userId)
        .gte("date", minCheckinDate)
        .order("date", { ascending: false }),
    ]);

  return buildRetentionStats({
    signupSource,
    checkinDates: (checkins ?? []).map((c) => String(c.date).slice(0, 10)),
    tasksCompleted: tasksCompleted ?? 0,
    openTasks: openTasks ?? 0,
  });
}

export function emptyRetentionStats(
  signupSource?: string | null
): RetentionStats {
  const trialDays = resolveStripeTrialDaysForSignupSource(signupSource);
  return {
    trialDays,
    daysActive: 0,
    tasksCompleted: 0,
    openTasks: 0,
    streakFilled: 0,
  };
}
