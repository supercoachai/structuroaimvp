import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { getCalendarDateAmsterdam } from "@/lib/dagstartCookie";

export type DailyActivityRow = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  subscription_status: string | null;
  last_seen_at: string | null;
  last_login_at: string | null;
  account_created_today: boolean;
  dagstart: boolean;
  checkin_energy: string | null;
  top3_count: number;
  tasks_created: number;
  tasks_completed: number;
  shutdown: boolean;
  app_opened: boolean;
  engaged: boolean;
  core_loop_complete: boolean;
  last_activity_at: string | null;
};

export type DailyActivitySummary = {
  date: string;
  total_engaged: number;
  app_opened: number;
  dagstart: number;
  core_loop_complete: number;
  rows: DailyActivityRow[];
};

function parseReportDate(raw: string | null | undefined): string {
  const fallback = getCalendarDateAmsterdam();
  const value = (raw ?? fallback).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  return value;
}

export async function fetchDailyActivityReport(
  dateInput?: string | null
): Promise<
  | { ok: true; report: DailyActivitySummary }
  | { ok: false; error: "not_configured" | "query_failed"; message?: string }
> {
  const admin = createServiceRoleClient();
  if (!admin) {
    return { ok: false, error: "not_configured" };
  }

  const date = parseReportDate(dateInput);
  type ActivityRpcClient = {
    rpc: (
      fn: string,
      args: { p_date: string }
    ) => Promise<{
      data: DailyActivityRow[] | null;
      error: { message: string } | null;
    }>;
  };
  const { data, error } = await (admin as unknown as ActivityRpcClient).rpc(
    "admin_daily_activity_report",
    { p_date: date }
  );

  if (error) {
    console.error("[dailyActivityReport]", error.message);
    return { ok: false, error: "query_failed", message: error.message };
  }

  const rows = (data ?? []) as DailyActivityRow[];
  const report: DailyActivitySummary = {
    date,
    total_engaged: rows.length,
    app_opened: rows.filter((r) => r.app_opened).length,
    dagstart: rows.filter((r) => r.dagstart).length,
    core_loop_complete: rows.filter((r) => r.core_loop_complete).length,
    rows,
  };

  return { ok: true, report };
}
