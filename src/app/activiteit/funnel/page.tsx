import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";

import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { adminCookieName, verifyAdminCookie } from "@/lib/admin/adminSession";
import {
  dropBucketLabel,
  fetchActivationFunnelReport,
  type ActivationFunnelUserRow,
} from "@/lib/activity/activationFunnelReport";

export const metadata: Metadata = {
  title: "Activatie-funnel",
  robots: { index: false, follow: false },
};

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("nl-NL", {
    timeZone: "Europe/Amsterdam",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtPct(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value}%`;
}

function FunnelStep({
  label,
  count,
  pct,
  hint,
}: {
  label: string;
  count: number;
  pct: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{count}</p>
      <p className="text-sm text-slate-600">{pct} van accounts</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function userFilterMatches(row: ActivationFunnelUserRow, filter: string | undefined): boolean {
  if (!filter || filter === "all") return true;
  return row.drop_bucket === filter;
}

export default async function ActiviteitFunnelPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; bucket?: string }>;
}) {
  const params = await searchParams;
  const days = params.days ?? "90";
  const bucketFilter = params.bucket ?? "all";

  const cookieStore = await cookies();
  const authed = verifyAdminCookie(
    "activity",
    cookieStore.get(adminCookieName("activity"))?.value
  );

  if (!authed) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 bg-[var(--st-bg)] px-4">
        <p className="text-sm text-slate-500">Privé-dashboard</p>
        <AdminLoginForm scope="activity" />
      </div>
    );
  }

  const result = await fetchActivationFunnelReport(days);

  if (!result.ok) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-[var(--st-bg)] px-4 text-center text-sm text-red-700">
        {result.error === "not_configured"
          ? "SUPABASE_SERVICE_ROLE_KEY ontbreekt op de server."
          : `Kon funnel niet laden${result.message ? `: ${result.message}` : "."}`}
      </div>
    );
  }

  const { report } = result;
  const { summary } = report;
  const filteredUsers = report.users.filter((row) => userFilterMatches(row, bucketFilter));

  return (
    <div className="min-h-[100dvh] bg-[var(--st-bg)] px-4 pb-16 pt-[max(1rem,env(safe-area-inset-top))]">
      <main className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-400">Supabase P0-funnel · geen PostHog</p>
            <h1 className="text-lg font-semibold text-slate-800">Signup → onboarding → dagstart</h1>
          </div>
          <Link
            href="/activiteit/admin"
            className="text-sm text-slate-600 underline"
          >
            Dagelijkse activiteit
          </Link>
        </div>

        <form className="mb-8 flex flex-wrap items-end gap-3" method="get">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            Periode (dagen)
            <select
              name="days"
              defaultValue={days}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
            >
              <option value="30">30 dagen</option>
              <option value="90">90 dagen</option>
              <option value="180">180 dagen</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            Drop-bucket
            <select
              name="bucket"
              defaultValue={bucketFilter}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
            >
              <option value="all">Alle accounts</option>
              {report.dropBuckets.map(({ bucket }) => (
                <option key={bucket} value={bucket}>
                  {dropBucketLabel(bucket)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white"
          >
            Vernieuwen
          </button>
        </form>

        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FunnelStep
            label="1. Accounts"
            count={summary.accounts}
            pct="100%"
          />
          <FunnelStep
            label="2. Taak aangemaakt"
            count={summary.has_task}
            pct={fmtPct(summary.pct_has_task)}
            hint="Proxy: onboarding echt gestart"
          />
          <FunnelStep
            label="3. Onboarding klaar"
            count={summary.onboarding_completed}
            pct={fmtPct(summary.pct_onboarding)}
            hint={
              summary.median_minutes_to_onboarding != null
                ? `Mediaan ${summary.median_minutes_to_onboarding} min na signup`
                : undefined
            }
          />
          <FunnelStep
            label="4. Eerste dagstart"
            count={summary.first_dagstart}
            pct={fmtPct(summary.pct_dagstart)}
            hint={`Zelfde dag: ${summary.same_day_dagstart} (${fmtPct(summary.pct_same_day_dagstart)})`}
          />
        </div>

        <div className="mb-8 rounded-2xl border border-amber-100 bg-amber-50/80 p-4 text-sm text-amber-950">
          <p className="font-semibold">Wat zegt de data nu?</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              Grootste lek zit vóór <strong>onboarding_completed</strong>, niet daarna.
              Wie onboarding afmaakt, doet vrijwel altijd dagstart.
            </li>
            <li>
              <strong>signup_geen_app</strong>: ingelogd maar geen taak (middleware/app niet
              bereikt). Check routing na signup (/welkom/install, magic link, plan-gate).
            </li>
            <li>
              <strong>has_task</strong> is de betrouwbaarste proxy voor &quot;echt in onboarding
              geweest&quot;.
            </li>
          </ul>
        </div>

        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">Drop-buckets</h2>
            <ul className="space-y-2 text-sm">
              {report.dropBuckets.map(({ bucket, count }) => (
                <li key={bucket} className="flex items-center justify-between gap-3">
                  <Link
                    href={`/activiteit/funnel?days=${days}&bucket=${encodeURIComponent(bucket)}`}
                    className="text-slate-700 underline-offset-2 hover:underline"
                  >
                    {dropBucketLabel(bucket)}
                  </Link>
                  <span className="font-semibold tabular-nums text-slate-900">{count}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">Per signup-bron</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-400">
                    <th className="pb-2 pr-3">Bron</th>
                    <th className="pb-2 pr-3">Signup</th>
                    <th className="pb-2 pr-3">Onboarding</th>
                    <th className="pb-2">Dagstart %</th>
                  </tr>
                </thead>
                <tbody>
                  {report.bySource.map((row) => (
                    <tr key={row.signup_source} className="border-t border-slate-50">
                      <td className="py-2 pr-3 text-slate-700">{row.signup_source}</td>
                      <td className="py-2 pr-3 tabular-nums">{row.signups}</td>
                      <td className="py-2 pr-3 tabular-nums">{row.onboarding}</td>
                      <td className="py-2 tabular-nums font-medium">{fmtPct(row.dagstart_pct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="mb-8 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Per week</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2 pr-3">Week</th>
                  <th className="pb-2 pr-3">Signups</th>
                  <th className="pb-2 pr-3">Onboarding</th>
                  <th className="pb-2 pr-3">Dagstart</th>
                  <th className="pb-2">Dagstart %</th>
                </tr>
              </thead>
              <tbody>
                {report.weekly.map((row) => (
                  <tr key={row.week_start} className="border-t border-slate-50">
                    <td className="py-2 pr-3 text-slate-700">{row.week_start}</td>
                    <td className="py-2 pr-3 tabular-nums">{row.signups}</td>
                    <td className="py-2 pr-3 tabular-nums">{row.onboarding}</td>
                    <td className="py-2 pr-3 tabular-nums">{row.dagstart}</td>
                    <td className="py-2 tabular-nums font-medium">{fmtPct(row.dagstart_pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">Signup</th>
                <th className="px-4 py-3">Gebruiker</th>
                <th className="px-4 py-3">Bron</th>
                <th className="px-4 py-3">Bucket</th>
                <th className="px-4 py-3">Taken</th>
                <th className="px-4 py-3">Flags</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Geen accounts in deze filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((row) => (
                  <tr
                    key={row.user_id}
                    className="border-b border-slate-50 align-top last:border-0"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {fmtTime(row.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-[160px] truncate font-medium text-slate-800">
                        {row.display_name || "—"}
                      </div>
                      <div className="max-w-[200px] truncate text-xs text-slate-500">
                        {row.email ?? "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.signup_source ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-700">{dropBucketLabel(row.drop_bucket)}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-600">{row.task_count}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {row.onboarding_completed ? "ob✓ " : ""}
                      {row.last_dagstart_date ? "dagstart✓ " : ""}
                      {row.password_setup_completed ? "pw✓" : ""}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
