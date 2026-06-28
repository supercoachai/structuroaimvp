import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

export type ActivationFunnelSummary = {
  window_days: number;
  accounts: number;
  signed_in: number;
  has_task: number;
  onboarding_completed: number;
  first_dagstart: number;
  same_day_dagstart: number;
  password_setup: number;
  pct_signed_in: number;
  pct_has_task: number;
  pct_onboarding: number;
  pct_dagstart: number;
  pct_same_day_dagstart: number;
  pct_password: number;
  median_minutes_to_onboarding: number | null;
  median_minutes_to_dagstart: number | null;
};

export type ActivationFunnelWeeklyRow = {
  week_start: string;
  signups: number;
  onboarding: number;
  dagstart: number;
  dagstart_pct: number;
};

export type ActivationFunnelSourceRow = {
  signup_source: string;
  signups: number;
  onboarding: number;
  dagstart: number;
  dagstart_pct: number;
};

export type ActivationFunnelUserRow = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  signup_source: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  last_seen_at: string | null;
  onboarding_completed: boolean;
  last_dagstart_date: string | null;
  dagstart_completed_at: string | null;
  password_setup_completed: boolean;
  task_count: number;
  drop_bucket: string;
  minutes_to_onboarding: number | null;
  minutes_to_dagstart: number | null;
};

export type ActivationFunnelReport = {
  days: number;
  summary: ActivationFunnelSummary;
  weekly: ActivationFunnelWeeklyRow[];
  bySource: ActivationFunnelSourceRow[];
  users: ActivationFunnelUserRow[];
  dropBuckets: { bucket: string; count: number }[];
};

function parseDays(raw: string | number | null | undefined): number {
  const n = typeof raw === "number" ? raw : Number(raw ?? 90);
  if (!Number.isFinite(n) || n < 1) return 90;
  return Math.min(Math.floor(n), 365);
}

type FunnelRpcClient = {
  rpc: (
    fn: string,
    args: { p_days: number }
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export async function fetchActivationFunnelReport(
  daysInput?: string | number | null
): Promise<
  | { ok: true; report: ActivationFunnelReport }
  | { ok: false; error: "not_configured" | "query_failed"; message?: string }
> {
  const admin = createServiceRoleClient();
  if (!admin) {
    return { ok: false, error: "not_configured" };
  }

  const days = parseDays(daysInput);
  const client = admin as unknown as FunnelRpcClient;

  const [summaryRes, weeklyRes, sourceRes, usersRes] = await Promise.all([
    client.rpc("admin_activation_funnel_summary", { p_days: days }),
    client.rpc("admin_activation_funnel_weekly", { p_days: days }),
    client.rpc("admin_activation_funnel_by_source", { p_days: days }),
    client.rpc("admin_activation_funnel_users", { p_days: days }),
  ]);

  const firstError =
    summaryRes.error ?? weeklyRes.error ?? sourceRes.error ?? usersRes.error;
  if (firstError) {
    console.error("[activationFunnelReport]", firstError.message);
    return { ok: false, error: "query_failed", message: firstError.message };
  }

  const summaryRows = (summaryRes.data ?? []) as ActivationFunnelSummary[];
  const summary = summaryRows[0];
  if (!summary) {
    return { ok: false, error: "query_failed", message: "Lege funnel-samenvatting" };
  }

  const users = (usersRes.data ?? []) as ActivationFunnelUserRow[];
  const bucketMap = new Map<string, number>();
  for (const row of users) {
    bucketMap.set(row.drop_bucket, (bucketMap.get(row.drop_bucket) ?? 0) + 1);
  }
  const dropBuckets = [...bucketMap.entries()]
    .map(([bucket, count]) => ({ bucket, count }))
    .sort((a, b) => b.count - a.count);

  return {
    ok: true,
    report: {
      days,
      summary,
      weekly: (weeklyRes.data ?? []) as ActivationFunnelWeeklyRow[],
      bySource: (sourceRes.data ?? []) as ActivationFunnelSourceRow[],
      users,
      dropBuckets,
    },
  };
}

export const DROP_BUCKET_LABELS: Record<string, string> = {
  onboarding_klaar: "Onboarding + dagstart",
  onboarding_klaar_zonder_dagstart: "Onboarding klaar, geen dagstart",
  onboarding_gestart_niet_af: "Taak gezet, onboarding niet af",
  app_geopend_geen_taak: "App geopend, geen taak",
  signup_geen_app: "Ingelogd, app niet geopend",
  nooit_terug: "Nooit terug na signup",
};

export function dropBucketLabel(bucket: string): string {
  return DROP_BUCKET_LABELS[bucket] ?? bucket;
}
