#!/usr/bin/env node
/**
 * Preview smoke-test vóór launch (geen login, geen echte betaling).
 *
 * Gebruik:
 *   BASE_URL=https://jouw-preview.vercel.app npm run smoke:preview
 *
 * Optioneel PostHog error-test (alleen als POSTHOG_TEST_ENDPOINT=true op die omgeving):
 *   BASE_URL=... POSTHOG_ERROR_TEST_SECRET=... npm run smoke:preview
 */

const base = (process.env.BASE_URL || process.env.SMOKE_BASE_URL || "").replace(/\/$/, "");

if (!base) {
  console.error("❌ Zet BASE_URL (preview-URL, geen productie tenzij bewust).");
  console.error("   Voorbeeld: BASE_URL=https://structuroai-mvp-xxx.vercel.app npm run smoke:preview");
  process.exit(1);
}

const posthogSecret = process.env.POSTHOG_ERROR_TEST_SECRET?.trim() || "";

/** @type {{ name: string; run: () => Promise<void> }} */
const checks = [];

function add(name, run) {
  checks.push({ name, run });
}

async function fetchMeta(path, init = {}) {
  const url = `${base}${path}`;
  const res = await fetch(url, { redirect: "manual", ...init });
  const location = res.headers.get("location") || "";
  const text = await res.text().catch(() => "");
  return { url, status: res.status, location, text, ok: res.ok };
}

function assertStatus(meta, expected, note = "") {
  if (meta.status !== expected) {
    throw new Error(
      `verwacht HTTP ${expected}, kreeg ${meta.status}${note ? ` (${note})` : ""} → ${meta.url}`
    );
  }
}

function assertIncludes(haystack, needle, label) {
  if (!haystack.includes(needle)) {
    throw new Error(`${label}: "${needle}" niet gevonden`);
  }
}

add("GET /registreren (publiek, geen redirect naar /login)", async () => {
  const meta = await fetchMeta("/registreren");
  assertStatus(meta, 200);
  if (meta.location.includes("/login")) {
    throw new Error("redirect naar /login — STRUCTURO_PUBLIC_REGISTRATION waarschijnlijk uit");
  }
  assertIncludes(meta.text.toLowerCase(), "registr", "registratie-pagina");
});

add("GET /registreren/plan", async () => {
  const meta = await fetchMeta("/registreren/plan");
  assertStatus(meta, 200);
});

add("GET /abonnement (laadt)", async () => {
  const meta = await fetchMeta("/abonnement");
  if (meta.status !== 200 && meta.status !== 307 && meta.status !== 308) {
    throw new Error(`onverwachte status ${meta.status} op /abonnement`);
  }
});

add("GET /login", async () => {
  const meta = await fetchMeta("/login");
  assertStatus(meta, 200);
});

add("GET /terms + /privacy (legal)", async () => {
  for (const path of ["/terms", "/privacy"]) {
    const meta = await fetchMeta(path);
    assertStatus(meta, 200, path);
  }
});

add("GET /dev-reset → redirect / in productie-build", async () => {
  const meta = await fetchMeta("/dev-reset");
  if (meta.status === 307 || meta.status === 308) {
    if (!meta.location.includes("/") || meta.location.includes("/dev-reset")) {
      throw new Error(`verwacht redirect naar home, kreeg ${meta.location}`);
    }
    return;
  }
  if (meta.status === 200) {
    console.warn("   ⚠ preview/dev-build: /dev-reset toont pagina (ok lokaal, niet op productie-build)");
    return;
  }
  throw new Error(`onverwachte status ${meta.status}`);
});

add("GET /test-data → redirect / in productie-build", async () => {
  const meta = await fetchMeta("/test-data");
  if (meta.status === 307 || meta.status === 308) return;
  if (meta.status === 200) {
    console.warn("   ⚠ preview/dev-build: /test-data bereikbaar (ok lokaal)");
    return;
  }
  throw new Error(`onverwachte status ${meta.status}`);
});

add("POST /api/dev/signup → 404 buiten local dev", async () => {
  const meta = await fetchMeta("/api/dev/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "smoke@test.local", password: "x", full_name: "Smoke" }),
  });
  if (meta.status !== 404) {
    throw new Error(`verwacht 404, kreeg ${meta.status} — dev signup mag niet publiek zijn`);
  }
});

add("GET /api/posthog-error-test zonder secret → 404", async () => {
  const meta = await fetchMeta("/api/posthog-error-test");
  if (meta.status !== 404) {
    throw new Error(
      `verwacht 404 zonder flag/secret, kreeg ${meta.status} — zet POSTHOG_TEST_ENDPOINT niet op productie`
    );
  }
});

if (posthogSecret) {
  add("GET /api/posthog-error-test?secret=… (PostHog smoke)", async () => {
    const meta = await fetchMeta(
      `/api/posthog-error-test?secret=${encodeURIComponent(posthogSecret)}`
    );
    if (meta.status !== 200) {
      throw new Error(
        `verwacht 200 met secret + POSTHOG_TEST_ENDPOINT=true, kreeg ${meta.status}`
      );
    }
    assertIncludes(meta.text, "posthog", "response");
  });
}

console.log(`\n🔍 Launch smoke-test → ${base}\n`);

let failed = 0;

for (const { name, run } of checks) {
  process.stdout.write(`• ${name} … `);
  try {
    await run();
    console.log("✅");
  } catch (err) {
    failed += 1;
    const msg = err instanceof Error ? err.message : String(err);
    console.log("❌");
    console.log(`  ${msg}`);
  }
}

console.log(failed ? `\n${failed} check(s) gefaald.\n` : "\nAlle checks geslaagd.\n");

if (!posthogSecret) {
  console.log(
    "Tip: voeg POSTHOG_ERROR_TEST_SECRET toe om de PostHog error-route te testen (preview only).\n"
  );
}

process.exit(failed ? 1 : 0);
