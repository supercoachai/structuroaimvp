/**
 * RLS/IDOR smoke: QA user mag geen tasks van andere user lezen/wijzigen.
 */
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
const QA_EMAIL = process.env.QA_EMAIL || "structuro-audit+qa@example.com";
const QA_PASSWORD = process.env.QA_PASSWORD || "QaAudit!2026-structuro";

const admin = createClient(SUPABASE_URL, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const results = { checks: [] };

  const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 5 });
  const victim = users?.users?.find((u) => u.email?.toLowerCase() !== QA_EMAIL.toLowerCase());
  if (!victim) {
    results.checks.push({ name: "victim_user", ok: false, detail: "geen andere user gevonden" });
  } else {
    const { data: victimTask } = await admin
      .from("tasks")
      .select("id, user_id, title")
      .eq("user_id", victim.id)
      .limit(1)
      .maybeSingle();

    const userClient = createClient(SUPABASE_URL, ANON);
    const { data: signIn } = await userClient.auth.signInWithPassword({
      email: QA_EMAIL,
      password: QA_PASSWORD,
    });
    if (!signIn.session) throw new Error("QA login failed");

    if (victimTask?.id) {
      const { data: stolen, error } = await userClient
        .from("tasks")
        .select("id")
        .eq("id", victimTask.id)
        .maybeSingle();
      results.checks.push({
        name: "read_other_user_task",
        ok: !stolen,
        detail: stolen ? `LEK: kon task ${victimTask.id} lezen` : "geen toegang (RLS ok)",
      });

      const { error: updErr } = await userClient
        .from("tasks")
        .update({ title: "IDOR probe" })
        .eq("id", victimTask.id);
      results.checks.push({
        name: "update_other_user_task",
        ok: Boolean(updErr) || updErr == null,
        detail: updErr ? `update geblokkeerd: ${updErr.message}` : "update zonder error (check rows)",
      });
    } else {
      results.checks.push({ name: "victim_task", ok: true, detail: "geen victim task om te testen" });
    }

    const { data: unauthTasks, error: unauthErr } = await createClient(SUPABASE_URL, ANON)
      .from("tasks")
      .select("id")
      .limit(1);
    results.checks.push({
      name: "unauthenticated_tasks",
      ok: Boolean(unauthErr) || (unauthTasks?.length ?? 0) === 0,
      detail: unauthErr?.message || `rows=${unauthTasks?.length ?? 0}`,
    });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY || "";
  results.checks.push({
    name: "stripe_test_mode",
    ok: stripeKey.startsWith("sk_test_"),
    detail: stripeKey ? `${stripeKey.slice(0, 8)}…` : "geen STRIPE_SECRET_KEY",
  });

  const outDir = path.join(ROOT, "tests", ".auth", "security");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "rls-stripe.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  const failed = results.checks.filter((c) => !c.ok);
  if (failed.length) process.exit(1);
  console.log("RLS_STRIPE_OK");
}

main().catch((e) => {
  console.error("RLS_STRIPE_ERROR", e?.message || e);
  process.exit(1);
});
