#!/usr/bin/env node
/**
 * Eenmalige cleanup: merge gesplitste PostHog-personen (anon onboarding ↔ identified signup).
 *
 * Onomkeerbaar bij --apply. Default = dry-run.
 *
 * Bronnen voor paren (anon_distinct_id → user.id):
 *   1. Supabase user_metadata.posthog_anon_id (na Fix 2 magic-link)
 *   2. PostHog HogQL: unieke 1:1 temporal match (onboarding → signup ≤ 60 min)
 *   3. PostHog HogQL: client signup.$device_id === anon onboarding distinct_id
 *
 * Vereist env (bijv. `node --env-file=.env.local`):
 *   STRUCTURO_POSTHOG_API_KEY / POSTHOG_PERSONAL_API_KEY  (phx_…)  – HogQL discovery
 *   STRUCTURO_POSTHOG_PROJECT_ID / POSTHOG_PROJECT_ID               – default 175224
 *   STRUCTURO_POSTHOG_HOST / POSTHOG_HOST                           – default eu.posthog.com
 *   NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY            – metadata bron
 *   NEXT_PUBLIC_POSTHOG_KEY                                        – alleen bij --apply (phc_…)
 *
 * Usage:
 *   node --env-file=.env.local scripts/merge-split-posthog-persons.mjs
 *   node --env-file=.env.local scripts/merge-split-posthog-persons.mjs --apply
 *   node --env-file=.env.local scripts/merge-split-posthog-persons.mjs --days=90 --apply
 */

import { PostHog } from "posthog-node";

/** @typedef {{ anonId: string, userId: string, source: string, secondsGap?: number }} MergePair */

const APPLY = process.argv.includes("--apply");
const daysArg = process.argv.find((a) => a.startsWith("--days="));
const DAYS = Number(daysArg?.split("=")[1] || 60);

const PH_HOST = (
  process.env.STRUCTURO_POSTHOG_HOST ||
  process.env.POSTHOG_HOST ||
  "https://eu.posthog.com"
).replace(/\/+$/, "");
const PH_PROJECT =
  process.env.STRUCTURO_POSTHOG_PROJECT_ID ||
  process.env.POSTHOG_PROJECT_ID ||
  "175224";
const PH_PERSONAL = (
  process.env.STRUCTURO_POSTHOG_API_KEY ||
  process.env.POSTHOG_PERSONAL_API_KEY ||
  process.env.POSTHOG_API_KEY ||
  ""
).trim();

const SUPABASE_URL = (
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.STRUCTURO_SUPABASE_URL ||
  ""
)
  .trim()
  .replace(/\/+$/, "");
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

async function hogql(query) {
  if (!PH_PERSONAL) {
    throw new Error(
      "STRUCTURO_POSTHOG_API_KEY (phx_…) ontbreekt voor HogQL discovery."
    );
  }
  const res = await fetch(`${PH_HOST}/api/projects/${PH_PROJECT}/query/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PH_PERSONAL}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: { kind: "HogQLQuery", query },
      // Na $merge_dangerously moet discovery verse person overrides zien.
      refresh: "force_blocking",
    }),
  });
  if (!res.ok) {
    throw new Error(`HogQL ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  const columns = json.columns ?? [];
  const results = json.results ?? [];
  return results.map((row) => {
    /** @type {Record<string, unknown>} */
    const obj = {};
    columns.forEach((c, i) => {
      obj[c] = row[i];
    });
    return obj;
  });
}

async function discoverTemporalPairs() {
  const query = `
WITH anon_onb AS (
  SELECT
    person_id AS anon_person_id,
    any(distinct_id) AS anon_distinct_id,
    min(timestamp) AS onb_at
  FROM events
  WHERE timestamp >= now() - INTERVAL ${DAYS} DAY
    AND event = 'onboarding_completed'
    AND person_id NOT IN (
      SELECT DISTINCT person_id FROM events
      WHERE timestamp >= now() - INTERVAL ${DAYS} DAY AND event = 'signup_completed'
    )
  GROUP BY person_id
),
signups AS (
  SELECT
    person_id AS user_person_id,
    any(distinct_id) AS user_distinct_id,
    min(timestamp) AS signup_at
  FROM events
  WHERE timestamp >= now() - INTERVAL ${DAYS} DAY
    AND event = 'signup_completed'
    AND match(distinct_id, '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
    AND NOT startsWith(distinct_id, '019')
    AND person_id NOT IN (
      SELECT DISTINCT person_id FROM events
      WHERE timestamp >= now() - INTERVAL ${DAYS} DAY AND event = 'onboarding_completed'
    )
  GROUP BY person_id
),
pairs AS (
  SELECT
    a.anon_distinct_id,
    s.user_distinct_id,
    dateDiff('second', a.onb_at, s.signup_at) AS seconds_gap,
    count() OVER (PARTITION BY a.anon_distinct_id) AS anon_matches,
    count() OVER (PARTITION BY s.user_distinct_id) AS user_matches
  FROM anon_onb a
  CROSS JOIN signups s
  WHERE s.signup_at >= a.onb_at
    AND s.signup_at <= a.onb_at + INTERVAL 60 MINUTE
)
SELECT anon_distinct_id, user_distinct_id, seconds_gap
FROM pairs
WHERE anon_matches = 1 AND user_matches = 1
ORDER BY seconds_gap ASC
LIMIT 500
`.trim();

  const rows = await hogql(query);
  return rows.map((r) => ({
    anonId: String(r.anon_distinct_id),
    userId: String(r.user_distinct_id),
    source: "temporal_1to1_60m",
    secondsGap: Number(r.seconds_gap),
  }));
}

async function discoverDevicePairs() {
  const query = `
WITH anon_onb AS (
  SELECT
    person_id AS anon_person_id,
    any(distinct_id) AS anon_distinct_id,
    min(timestamp) AS onb_at
  FROM events
  WHERE timestamp >= now() - INTERVAL ${DAYS} DAY
    AND event = 'onboarding_completed'
    AND person_id NOT IN (
      SELECT DISTINCT person_id FROM events
      WHERE timestamp >= now() - INTERVAL ${DAYS} DAY AND event = 'signup_completed'
    )
  GROUP BY person_id
),
signups AS (
  SELECT
    person_id AS user_person_id,
    distinct_id AS user_distinct_id,
    properties.$device_id AS device_id,
    timestamp AS signup_at
  FROM events
  WHERE timestamp >= now() - INTERVAL ${DAYS} DAY
    AND event = 'signup_completed'
    AND notEmpty(toString(properties.$device_id))
)
SELECT
  a.anon_distinct_id,
  s.user_distinct_id,
  dateDiff('second', a.onb_at, s.signup_at) AS seconds_gap
FROM anon_onb a
INNER JOIN signups s ON toString(s.device_id) = a.anon_distinct_id
WHERE s.signup_at >= a.onb_at - INTERVAL 5 MINUTE
  AND s.signup_at <= a.onb_at + INTERVAL 48 HOUR
ORDER BY a.onb_at DESC
LIMIT 500
`.trim();

  const rows = await hogql(query);
  return rows.map((r) => ({
    anonId: String(r.anon_distinct_id),
    userId: String(r.user_distinct_id),
    source: "device_id_match",
    secondsGap: Number(r.seconds_gap),
  }));
}

async function discoverSupabaseMetadataPairs() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.warn(
      "[merge] Supabase env ontbreekt: skip posthog_anon_id metadata discovery."
    );
    return [];
  }

  /** @type {MergePair[]} */
  const pairs = [];
  let page = 1;
  const perPage = 200;
  // Auth Admin listUsers via REST (geen supabase-js: WebSocket-issue op Node 20).
  for (;;) {
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=${perPage}`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
      }
    );
    if (!res.ok) {
      throw new Error(`Supabase listUsers ${res.status}: ${await res.text()}`);
    }
    const body = await res.json();
    const users = body.users ?? body ?? [];
    if (!Array.isArray(users) || users.length === 0) break;

    for (const u of users) {
      const anonId = u?.user_metadata?.posthog_anon_id;
      if (
        typeof anonId === "string" &&
        anonId.length >= 8 &&
        anonId !== u.id
      ) {
        pairs.push({
          anonId,
          userId: u.id,
          source: "supabase_metadata",
        });
      }
    }

    if (users.length < perPage) break;
    page += 1;
    if (page > 50) break;
  }
  return pairs;
}

/** Deduplicate: prefer supabase_metadata > device_id_match > temporal. */
function mergeCandidateLists(lists) {
  const rank = {
    supabase_metadata: 3,
    device_id_match: 2,
    temporal_1to1_60m: 1,
  };
  /** @type {Map<string, MergePair>} */
  const byKey = new Map();
  for (const list of lists) {
    for (const p of list) {
      if (!p.anonId || !p.userId || p.anonId === p.userId) continue;
      // Skip if anon looks like a user uuid already (non-019 uuid from supabase).
      const key = `${p.anonId}→${p.userId}`;
      const existing = byKey.get(key);
      if (!existing || (rank[p.source] ?? 0) > (rank[existing.source] ?? 0)) {
        byKey.set(key, p);
      }
    }
  }

  // Conflict: zelfde anon naar meerdere users, of zelfde user meerdere anons
  // die niet uniek zijn, is ok (1 user, meerdere anons). Blokkeer alleen
  // anon→meerdere users.
  /** @type {Map<string, string[]>} */
  const anonToUsers = new Map();
  for (const p of byKey.values()) {
    const arr = anonToUsers.get(p.anonId) ?? [];
    if (!arr.includes(p.userId)) arr.push(p.userId);
    anonToUsers.set(p.anonId, arr);
  }

  /** @type {MergePair[]} */
  const safe = [];
  /** @type {MergePair[]} */
  const conflicts = [];
  for (const p of byKey.values()) {
    if ((anonToUsers.get(p.anonId) ?? []).length > 1) {
      conflicts.push(p);
    } else {
      safe.push(p);
    }
  }
  return { safe, conflicts };
}

async function applyMerges(pairs) {
  const key = (process.env.NEXT_PUBLIC_POSTHOG_KEY || "").trim();
  if (!key) {
    throw new Error(
      "NEXT_PUBLIC_POSTHOG_KEY (phc_…) ontbreekt voor --apply. Pull via vercel env of zet in .env.local."
    );
  }
  const client = new PostHog(key, {
    host: "https://eu.i.posthog.com",
    flushAt: 1,
    flushInterval: 0,
  });

  let ok = 0;
  let fail = 0;
  for (const p of pairs) {
    try {
      client.capture({
        distinctId: p.userId,
        event: "$merge_dangerously",
        properties: {
          alias: p.anonId,
          merge_source: p.source,
          merge_script: "merge-split-posthog-persons",
          merge_seconds_gap: p.secondsGap ?? null,
        },
      });
      await client.flush();
      ok += 1;
      console.log(`  ✓ merged ${p.anonId.slice(0, 8)}… → ${p.userId.slice(0, 8)}… (${p.source})`);
    } catch (err) {
      fail += 1;
      console.error(
        `  ✗ ${p.anonId.slice(0, 8)}… → ${p.userId.slice(0, 8)}…`,
        err instanceof Error ? err.message : err
      );
    }
  }
  await client.shutdown();
  return { ok, fail };
}

async function main() {
  console.log(
    `[merge] mode=${APPLY ? "APPLY (onomkeerbaar)" : "dry-run"} days=${DAYS}`
  );

  const [temporal, device, meta] = await Promise.all([
    discoverTemporalPairs().catch((e) => {
      console.error("[merge] temporal discovery failed:", e.message);
      return [];
    }),
    discoverDevicePairs().catch((e) => {
      console.error("[merge] device discovery failed:", e.message);
      return [];
    }),
    discoverSupabaseMetadataPairs().catch((e) => {
      console.error("[merge] supabase discovery failed:", e.message);
      return [];
    }),
  ]);

  console.log(
    `[merge] discovered: temporal=${temporal.length} device=${device.length} metadata=${meta.length}`
  );

  const { safe, conflicts } = mergeCandidateLists([meta, device, temporal]);

  if (conflicts.length) {
    console.warn(`[merge] ${conflicts.length} conflict-paren overgeslagen (anon→meerdere users):`);
    for (const c of conflicts) {
      console.warn(`  ! ${c.anonId} → ${c.userId} (${c.source})`);
    }
  }

  console.log(`[merge] ${safe.length} veilige paren:`);
  for (const p of safe) {
    const gap =
      typeof p.secondsGap === "number" ? ` gap=${p.secondsGap}s` : "";
    console.log(`  - ${p.anonId} → ${p.userId} [${p.source}]${gap}`);
  }

  if (!APPLY) {
    console.log(
      "\n[merge] Dry-run klaar. Voer opnieuw uit met --apply om $merge_dangerously te sturen."
    );
    return;
  }

  if (safe.length === 0) {
    console.log("[merge] Niets te mergen.");
    return;
  }

  const { ok, fail } = await applyMerges(safe);
  console.log(`\n[merge] klaar: ok=${ok} fail=${fail}`);
}

main().catch((err) => {
  console.error("[merge] fatal:", err);
  process.exit(1);
});
