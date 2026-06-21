// QA teardown: verwijdert alle data van de geseede +qa testuser (idempotent).
// Volgorde: app-rijen eerst, dan auth-user (cascade ruimt profiles op; expliciet voor de zekerheid).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const PROTECTED = (process.env.NEXT_PUBLIC_PROTECTED_TEST_ACCOUNT_EMAIL || "").toLowerCase();

async function main() {
  let info;
  try {
    info = JSON.parse(fs.readFileSync(path.join(ROOT, "tests", ".auth", "qa-user.json"), "utf8"));
  } catch {
    console.log("Geen qa-user.json; niets om op te ruimen.");
    return;
  }
  const { id, email } = info;
  if (!id || (email || "").toLowerCase() === PROTECTED) {
    console.error("REFUSE teardown: ontbrekende id of beschermd account");
    process.exit(2);
  }

  for (const table of ["daily_checkins", "daily_shutdowns", "tasks"]) {
    const { error, count } = await admin.from(table).delete({ count: "exact" }).eq("user_id", id);
    console.log(`delete ${table}: ${error ? "ERR " + error.message : (count ?? 0) + " rijen"}`);
  }
  // profiles gebruikt id == auth user id
  const { error: pErr } = await admin.from("profiles").delete().eq("id", id);
  console.log(`delete profiles: ${pErr ? "ERR " + pErr.message : "ok"}`);

  const { error: uErr } = await admin.auth.admin.deleteUser(id);
  console.log(`delete auth user ${id}: ${uErr ? "ERR " + uErr.message : "ok"}`);

  // Lokale secrets opruimen
  for (const f of ["cookie-header.txt", "qa.json", "qa-user.json"]) {
    try {
      fs.unlinkSync(path.join(ROOT, "tests", ".auth", f));
    } catch {
      /* ignore */
    }
  }
  console.log("TEARDOWN_OK");
}

main().catch((e) => {
  console.error("TEARDOWN_ERROR", e?.message || e);
  process.exit(1);
});
