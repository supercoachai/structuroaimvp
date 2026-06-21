/**
 * Seed QA user with onboarding_completed=true for core-loop tests.
 * Reuses seed-session login flow, then upserts profile via service role.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import WS from "ws";

if (!globalThis.WebSocket) globalThis.WebSocket = WS;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function loadEnv() {
  const raw = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8");
  for (const line of raw.split(/\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
const STORAGE_KEY = "structuro-auth";
const QA_EMAIL = process.env.QA_ONBOARDED_EMAIL || "structuro-audit+onboarded@example.com";
const QA_PASSWORD = process.env.QA_PASSWORD || "QaAudit!2026-structuro";

const admin = createClient(SUPABASE_URL, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(email) {
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => (u.email || "").toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function main() {
  let user = await findUserByEmail(QA_EMAIL);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: QA_EMAIL,
      password: QA_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "QA Audit Bot", qa_seed: true },
    });
    if (error) throw error;
    user = data.user;
  }

  const today = new Date().toISOString().slice(0, 10);
  const { error: profErr } = await admin.from("profiles").upsert(
    {
      id: user.id,
      email: QA_EMAIL,
      onboarding_completed: true,
      onboarding_version: 2,
      password_setup_completed: true,
      display_name: "QA Bot",
      preferred_name: "QA",
      subscription_status: "trialing",
      last_dagstart_date: today,
    },
    { onConflict: "id" }
  );
  if (profErr) throw profErr;

  const store = new Map();
  const cookies = {
    getAll: () => [...store.entries()].map(([name, value]) => ({ name, value })),
    setAll: (list) => {
      for (const { name, value, options } of list) {
        if (value === "" || options?.maxAge === 0) store.delete(name);
        else store.set(name, value);
      }
    },
  };

  const ssr = createServerClient(SUPABASE_URL, ANON, {
    cookies,
    auth: { storageKey: STORAGE_KEY, flowType: "pkce" },
  });
  const { error } = await ssr.auth.signInWithPassword({ email: QA_EMAIL, password: QA_PASSWORD });
  if (error) throw error;
  await ssr.auth.getSession();

  const cookieList = [...store.entries()];
  const extraCookies = [
    { name: "structuro_privacy_setup_done", value: "1" },
    { name: "structuro_dagstart_datum", value: encodeURIComponent(today) },
  ];
  const baseCookies = cookieList.flatMap(([name, value]) =>
    ["127.0.0.1", "localhost"].map((domain) => ({
      name,
      value,
      domain,
      path: "/",
      expires: -1,
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    }))
  ).concat(
    extraCookies.flatMap(({ name, value }) =>
      ["127.0.0.1", "localhost"].map((domain) => ({
        name,
        value,
        domain,
        path: "/",
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: "Lax",
      }))
    )
  );

  const authDir = path.join(ROOT, "tests", ".auth");
  fs.mkdirSync(authDir, { recursive: true });
  fs.writeFileSync(path.join(authDir, "qa-onboarded.json"), JSON.stringify({ cookies: baseCookies, origins: [] }, null, 2));
  fs.writeFileSync(path.join(authDir, "qa-onboarded-user.json"), JSON.stringify({ id: user.id, email: QA_EMAIL, onboarded: true }, null, 2));
  const header = [...cookieList, ...extraCookies.map(({ name, value }) => [name, value])]
    .map(([n, v]) => `${n}=${v}`)
    .join("; ");
  fs.writeFileSync(path.join(authDir, "cookie-header-onboarded.txt"), header);
  console.log("SEED_ONBOARDED_OK", user.id);
}

main().catch((e) => {
  console.error("SEED_ONBOARDED_ERROR", e?.message || e);
  process.exit(1);
});
