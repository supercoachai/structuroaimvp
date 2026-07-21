#!/usr/bin/env node
/**
 * Backfill profiles.last_dagstart_date voor accounts die door het Carlijn-gat
 * heen vielen: onboarding_completed=true (en/of activiteit in tasks/checkins/
 * shutdowns) maar last_dagstart_date IS NULL.
 *
 * NIET COMMITTEN. Dit script is een one-off voor de operator en hoort buiten git.
 * Voeg het pad toe aan .gitignore voordat je het uitvoert als je het wilt bewaren,
 * of verwijder het na gebruik. Vraag mij (of jezelf) expliciet om commit-toestemming
 * voordat dit ooit in een commit terechtkomt.
 *
 * Vereist:
 *   NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   (script leest beide uit het proces; ladder via `dotenv-flow` of `direnv` als
 *    .env.local nog niet in het proces zit)
 *
 * Gebruik:
 *   node scripts/backfill-last-dagstart-date.mjs            # dry-run (default)
 *   node scripts/backfill-last-dagstart-date.mjs --confirm  # echt updaten
 *
 * Wat het doet:
 *   1. Telt en print een sample van profielen met `last_dagstart_date IS NULL` en
 *      activiteit in `daily_checkins`, `tasks` of `daily_shutdowns`.
 *   2. Skipt `is_test=true` profielen (beschermd testaccount + interne testers).
 *   3. Met --confirm: schrijft `last_dagstart_date` (en `dagstart_completed_at` als die
 *      nog NULL is) op basis van de eerste echte activiteit, in deze volgorde:
 *      daily_checkins.date  >  tasks.completed_at (in Europe/Amsterdam)  >  daily_shutdowns.date.
 *   4. Print daarna een aparte lijst van accounts mét onboarding_completed=true en
 *      ZONDER enige activiteit. Die krijgen GEEN automatische backfill. De operator
 *      moet hier zelf de cookie-namespace roteren (bv. STRUCTURO_DAGSTART_COOKIE v2),
 *      of een eenmalige middleware-pass schrijven die de cookie wist voor accounts
 *      met last_dagstart_date IS NULL EN task_count = 0. Zie commentaar onderaan dit
 *      script voor het exacte voorstel.
 */

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.STRUCTURO_SUPABASE_URL || "").trim();
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const CONFIRM = process.argv.includes("--confirm");
const SAMPLE_LIMIT = 10;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "[backfill] NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY zijn verplicht. Lees .env.local in via direnv of `node --env-file=.env.local`."
  );
  process.exit(1);
}

const BASE = SUPABASE_URL.replace(/\/$/, "");
const HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

/**
 * Postgres-side query is veruit het schoonst, maar we hebben geen `execute_sql`-RPC
 * geconfigureerd. Daarom doen we de selectie via PostgREST en de update per rij.
 * Aantallen zijn klein (<10000), dus dit is goedkoper dan een nieuwe migration.
 */

async function fetchProfilesNullDagstart() {
  // Alleen non-test profielen met last_dagstart_date IS NULL.
  const url = `${BASE}/rest/v1/profiles?select=id,email,created_at,onboarding_completed,last_dagstart_date,signup_source,is_test&last_dagstart_date=is.null&or=(is_test.is.false,is_test.is.null)&limit=10000`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    throw new Error(`profiles fetch ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function firstCheckinDate(userId) {
  const url = `${BASE}/rest/v1/daily_checkins?select=date&user_id=eq.${userId}&order=date.asc&limit=1`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows?.[0]?.date ?? null;
}

async function firstTaskCompletedAt(userId) {
  const url = `${BASE}/rest/v1/tasks?select=completed_at&user_id=eq.${userId}&completed_at=not.is.null&order=completed_at.asc&limit=1`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows?.[0]?.completed_at ?? null;
}

async function firstShutdownDate(userId) {
  const url = `${BASE}/rest/v1/daily_shutdowns?select=date&user_id=eq.${userId}&order=date.asc&limit=1`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows?.[0]?.date ?? null;
}

function amsterdamCalendarDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("en-CA", {
      timeZone: "Europe/Amsterdam",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

async function classifyProfile(p) {
  const [checkin, taskCompleted, shutdown] = await Promise.all([
    firstCheckinDate(p.id),
    firstTaskCompletedAt(p.id),
    firstShutdownDate(p.id),
  ]);
  const candidate =
    checkin || amsterdamCalendarDate(taskCompleted) || shutdown || null;
  const completedAt =
    checkin
      ? `${checkin}T08:00:00+02:00`
      : taskCompleted ||
        (shutdown ? `${shutdown}T08:00:00+02:00` : null);
  return {
    id: p.id,
    email: p.email,
    onboarding_completed: p.onboarding_completed,
    signup_source: p.signup_source,
    firstCheckin: checkin,
    firstTaskCompleted: taskCompleted,
    firstShutdown: shutdown,
    backfillDate: candidate,
    backfillCompletedAt: completedAt,
  };
}

async function updateProfile(row) {
  const body = {
    last_dagstart_date: row.backfillDate,
  };
  if (row.backfillCompletedAt) {
    body.dagstart_completed_at = row.backfillCompletedAt;
  }
  const url = `${BASE}/rest/v1/profiles?id=eq.${row.id}&dagstart_completed_at=is.null`;
  // dagstart_completed_at gate voorkomt dat we een al gezette waarde overschrijven.
  // last_dagstart_date is per ontwerp NULL hier, dus altijd schrijven.
  const res = await fetch(url, {
    method: "PATCH",
    headers: { ...HEADERS, Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`update ${row.id}: ${res.status} ${text}`);
  }
  // Als dagstart_completed_at al gezet was, schrijft de PATCH niets terug (return=representation
  // geeft een lege array). Tweede call alleen voor last_dagstart_date in dat geval:
  const updated = await res.json();
  if (!Array.isArray(updated) || updated.length === 0) {
    const url2 = `${BASE}/rest/v1/profiles?id=eq.${row.id}`;
    const res2 = await fetch(url2, {
      method: "PATCH",
      headers: HEADERS,
      body: JSON.stringify({ last_dagstart_date: row.backfillDate }),
    });
    if (!res2.ok) {
      throw new Error(`update last_dagstart_date ${row.id}: ${res2.status}`);
    }
  }
}

async function main() {
  console.log(`[backfill] mode=${CONFIRM ? "APPLY" : "dry-run"} url=${BASE}`);
  const profiles = await fetchProfilesNullDagstart();
  console.log(`[backfill] kandidaten met last_dagstart_date IS NULL: ${profiles.length}`);

  const classified = [];
  for (const p of profiles) {
    const c = await classifyProfile(p);
    classified.push(c);
  }

  const withActivity = classified.filter((c) => c.backfillDate);
  const onboardedButNoActivity = classified.filter(
    (c) => c.onboarding_completed && !c.backfillDate
  );
  const otherNullCases = classified.filter(
    (c) => !c.onboarding_completed && !c.backfillDate
  );

  console.log(
    `[backfill] te updaten (activiteit gevonden): ${withActivity.length}`
  );
  console.log(
    `[backfill] onboarding_completed maar GEEN activiteit (geen automatische backfill): ${onboardedButNoActivity.length}`
  );
  console.log(
    `[backfill] noch onboarding, noch activiteit (laat staan): ${otherNullCases.length}`
  );

  console.log("\n[backfill] sample van te-updaten rijen:");
  for (const c of withActivity.slice(0, SAMPLE_LIMIT)) {
    console.log(
      `  - ${c.email ?? c.id}  ->  ${c.backfillDate}  (checkin=${c.firstCheckin ?? "-"}, task=${c.firstTaskCompleted ?? "-"}, shutdown=${c.firstShutdown ?? "-"})`
    );
  }
  if (withActivity.length > SAMPLE_LIMIT) {
    console.log(`  ... +${withActivity.length - SAMPLE_LIMIT} meer`);
  }

  if (onboardedButNoActivity.length) {
    console.log(
      "\n[backfill] accounts met onboarding_completed=true en GEEN activiteit (cookie-only Carlijn-gat):"
    );
    for (const c of onboardedButNoActivity.slice(0, SAMPLE_LIMIT)) {
      console.log(`  - ${c.email ?? c.id}  (signup_source=${c.signup_source ?? "-"})`);
    }
    if (onboardedButNoActivity.length > SAMPLE_LIMIT) {
      console.log(`  ... +${onboardedButNoActivity.length - SAMPLE_LIMIT} meer`);
    }
    console.log(
      "\n  Actie: deze accounts hebben mogelijk een stale dagstart-cookie die niet matcht\n" +
        "  met de DB. Met de fix in src/lib/supabase/middleware.ts (applyDagstartDbGate)\n" +
        "  wordt die cookie nu automatisch gewist op de eerstvolgende ingelogde request.\n" +
        "  Geen verdere actie nodig zolang de fix gedeployed is."
    );
  }

  if (!CONFIRM) {
    console.log(
      "\n[backfill] dry-run klaar. Draai opnieuw met --confirm om de updates te schrijven."
    );
    return;
  }

  console.log(`\n[backfill] APPLY: ${withActivity.length} profielen worden geupdate.`);
  let ok = 0;
  let fail = 0;
  for (const row of withActivity) {
    try {
      await updateProfile(row);
      ok += 1;
      if (ok % 25 === 0) console.log(`  ${ok}/${withActivity.length} ok`);
    } catch (e) {
      fail += 1;
      console.warn(`  fout ${row.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  console.log(`[backfill] klaar: ok=${ok} fout=${fail}`);
}

main().catch((e) => {
  console.error("[backfill] fataal:", e);
  process.exit(1);
});
