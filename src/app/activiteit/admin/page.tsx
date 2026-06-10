import type { Metadata } from "next";
import Link from "next/link";

import {
  fetchDailyActivityReport,
  type DailyActivityRow,
} from "@/lib/activity/dailyActivityReport";
import { isActivityAdminSecretValid } from "@/lib/activity/activityAdminSecret";
import { getCalendarDateAmsterdam } from "@/lib/dagstartCookie";

export const metadata: Metadata = {
  title: "Dagelijkse activiteit",
  robots: { index: false, follow: false },
};

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("nl-NL", {
    timeZone: "Europe/Amsterdam",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function activityLabel(row: DailyActivityRow): string {
  const parts: string[] = [];
  if (row.account_created_today) parts.push("account");
  if (row.app_opened) parts.push("app geopend");
  if (row.dagstart) parts.push("dagstart");
  if (row.tasks_created > 0) parts.push(`${row.tasks_created} taak aangemaakt`);
  if (row.tasks_completed > 0) parts.push(`${row.tasks_completed} taak afgerond`);
  if (row.shutdown) parts.push("shutdown");
  if (parts.length === 0) parts.push("login/signaal");
  return parts.join(", ");
}

export default async function ActiviteitAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ k?: string; date?: string }>;
}) {
  const params = await searchParams;
  const k = params.k ?? "";
  const today = getCalendarDateAmsterdam();
  const date = (params.date ?? today).trim();

  if (!isActivityAdminSecretValid(k)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-[var(--st-bg)] px-4 text-sm text-slate-500">
        Niet gevonden
      </div>
    );
  }

  const result = await fetchDailyActivityReport(date);

  if (!result.ok) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-[var(--st-bg)] px-4 text-center text-sm text-red-700">
        {result.error === "not_configured"
          ? "SUPABASE_SERVICE_ROLE_KEY ontbreekt op de server."
          : `Kon rapport niet laden${result.message ? `: ${result.message}` : "."}`}
      </div>
    );
  }

  const { report } = result;

  return (
    <div className="min-h-[100dvh] bg-[var(--st-bg)] px-4 pb-16 pt-[max(1rem,env(safe-area-inset-top))]">
      <main className="mx-auto max-w-5xl">
        <p className="mb-4 text-xs text-slate-400">
          Privé-view. Geen index voor zoekmachines. Kalenderdag: Europe/Amsterdam.
        </p>

        <h1 className="mb-2 text-lg font-semibold text-slate-800">
          Wie gebruikte Structuro?
        </h1>
        <p className="mb-6 text-sm text-slate-600">
          Datum{" "}
          <span className="font-semibold text-slate-800">{report.date}</span>
          {" · "}
          <span className="font-semibold text-slate-800">{report.total_engaged}</span>{" "}
          engaged
          {" · "}
          <span className="font-semibold text-slate-800">{report.app_opened}</span>{" "}
          app geopend
          {" · "}
          <span className="font-semibold text-slate-800">{report.dagstart}</span>{" "}
          dagstart
          {" · "}
          <span className="font-semibold text-slate-800">
            {report.core_loop_complete}
          </span>{" "}
          core loop af
        </p>

        <form className="mb-8 flex flex-wrap items-end gap-3" method="get">
          <input type="hidden" name="k" value={k} />
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            Andere dag
            <input
              type="date"
              name="date"
              defaultValue={report.date}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
            />
          </label>
          <button
            type="submit"
            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white"
          >
            Toon
          </button>
          {report.date !== today ? (
            <Link
              href={`/activiteit/admin?k=${encodeURIComponent(k)}&date=${today}`}
              className="text-sm text-slate-600 underline"
            >
              Terug naar vandaag
            </Link>
          ) : null}
        </form>

        <div className="mb-8 rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-600 shadow-sm">
          <p className="mb-2 font-semibold text-slate-800">Hoe lees je dit?</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>App geopend</strong>: last_seen_at vandaag (middleware, betrouwbaar
              DAU-signaal).
            </li>
            <li>
              <strong>Engaged</strong>: app geopend, login, signup, dagstart, taak of
              shutdown vandaag.
            </li>
            <li>
              <strong>Core loop</strong>: dagstart + minstens 1 taak afgerond + shutdown.
            </li>
            <li>Testaccounts (`is_test`) staan niet in deze lijst.</li>
          </ul>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">Laatste activiteit</th>
                <th className="px-4 py-3">Gebruiker</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Wat gebeurde er?</th>
                <th className="px-4 py-3">Flags</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Nog geen activiteit op deze dag (of migratie `last_seen_at` nog niet
                    live).
                  </td>
                </tr>
              ) : (
                report.rows.map((row) => (
                  <tr
                    key={row.user_id}
                    className="border-b border-slate-50 align-top last:border-0"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {fmtTime(row.last_activity_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className="max-w-[160px] truncate font-medium text-slate-800"
                        title={row.display_name ?? undefined}
                      >
                        {row.display_name || "—"}
                      </div>
                      <div
                        className="max-w-[200px] truncate text-xs text-slate-500"
                        title={row.email ?? undefined}
                      >
                        {row.email ?? "—"}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {row.subscription_status ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{activityLabel(row)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {row.app_opened ? "app " : ""}
                      {row.dagstart ? "dagstart " : ""}
                      {row.core_loop_complete ? "loop✓" : ""}
                      {row.checkin_energy ? ` · ${row.checkin_energy}` : ""}
                      {row.top3_count > 0 ? ` · top3=${row.top3_count}` : ""}
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
