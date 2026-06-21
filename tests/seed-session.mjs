// QA seeding: maakt (idempotent) een +qa testuser, logt echt in via @supabase/ssr
// en produceert de auth-cookies in het EXACTE app-formaat (storageKey "structuro-auth",
// mogelijk chunked .0/.1). Schrijft Playwright storageState + onthoudt user id voor teardown.
// Print NOOIT secret cookie-waarden, alleen namen/lengtes/prefix.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

// Node 20 heeft geen native WebSocket; supabase-js realtime-client eist er een bij init.
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

const QA_EMAIL = process.env.QA_EMAIL || "structuro-audit+qa@example.com";
const QA_PASSWORD = process.env.QA_PASSWORD || "QaAudit!2026-structuro";

const PROTECTED = (process.env.NEXT_PUBLIC_PROTECTED_TEST_ACCOUNT_EMAIL || "").toLowerCase();
if (QA_EMAIL.toLowerCase() === PROTECTED) {
  console.error("REFUSE: QA_EMAIL == protected test account");
  process.exit(2);
}

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
    if (page > 25) return null;
  }
}

async function ensureUser() {
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
    console.log("CREATED qa user", user.id);
  } else {
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      password: QA_PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    console.log("REUSED qa user", user.id);
  }
  return user;
}

function makeJar() {
  const store = new Map();
  return {
    jar: store,
    cookies: {
      getAll() {
        return [...store.entries()].map(([name, value]) => ({ name, value }));
      },
      setAll(list) {
        for (const { name, value, options } of list) {
          if (value === "" || options?.maxAge === 0) store.delete(name);
          else store.set(name, value);
        }
      },
    },
  };
}

async function main() {
  const user = await ensureUser();

  await admin.from("profiles").upsert(
    { id: user.id, email: QA_EMAIL, onboarding_completed: false, onboarding_version: null },
    { onConflict: "id" }
  );

  const { jar, cookies } = makeJar();
  const ssr = createServerClient(SUPABASE_URL, ANON, {
    cookies,
    auth: { storageKey: STORAGE_KEY, flowType: "pkce" },
  });

  const { data, error } = await ssr.auth.signInWithPassword({
    email: QA_EMAIL,
    password: QA_PASSWORD,
  });
  if (error) {
    console.error("SIGNIN_FAILED", error.message);
    process.exit(3);
  }
  // Forceer cookie-write via getSession/setSession roundtrip
  await ssr.auth.getSession();

  const cookieList = [...jar.entries()];
  if (!cookieList.length) {
    console.error("NO_COOKIES_PRODUCED");
    process.exit(4);
  }

  console.log("=== COOKIE FORMAT (geen secret-waarden) ===");
  for (const [name, value] of cookieList) {
    console.log(
      `name=${name} len=${value.length} prefix=${JSON.stringify(value.slice(0, 8))}`
    );
  }

  // Playwright storageState: cookies voor zowel 127.0.0.1 als localhost
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
  );
  const storageState = { cookies: baseCookies, origins: [] };
  const authDir = path.join(ROOT, "tests", ".auth");
  fs.mkdirSync(authDir, { recursive: true });
  fs.writeFileSync(path.join(authDir, "qa.json"), JSON.stringify(storageState, null, 2));
  fs.writeFileSync(
    path.join(authDir, "qa-user.json"),
    JSON.stringify({ id: user.id, email: QA_EMAIL }, null, 2)
  );
  console.log("WROTE", path.join(authDir, "qa.json"), "user", user.id, user.email);

  // raw cookie header voor curl-gate (named pipe vermeden; schrijf naar .auth, gitignored)
  const header = cookieList.map(([n, v]) => `${n}=${v}`).join("; ");
  fs.writeFileSync(path.join(authDir, "cookie-header.txt"), header);
  console.log("SEED_OK");
}

main().catch((e) => {
  console.error("SEED_ERROR", e?.message || e);
  process.exit(1);
});
