#!/usr/bin/env node
/**
 * Volledige app-verify: unit tests → build → productie-server → route+chunk smoke.
 *
 *   npm run verify
 *
 * Snel (dev-server draait al):
 *   VERIFY_SKIP_BUILD=1 VERIFY_SKIP_START=1 BASE_URL=http://localhost:3000 npm run verify
 */

import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const skipBuild = process.env.VERIFY_SKIP_BUILD === "1";
const skipStart = process.env.VERIFY_SKIP_START === "1";
const externalBase = (process.env.BASE_URL || "").replace(/\/$/, "");

function runStep(name, cmd, args, env = {}) {
  console.log(`\n▶ ${name}\n`);
  const res = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  if (res.status !== 0) {
    console.error(`\n❌ ${name} gefaald (exit ${res.status})\n`);
    process.exit(res.status ?? 1);
  }
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

async function waitForServer(base, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${base}/login`, { redirect: "manual" });
      if (res.status < 500) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Server niet bereikbaar binnen ${timeoutMs}ms: ${base}`);
}

let serverProc = null;

async function main() {
  console.log("\n═══════════════════════════════════════");
  console.log("  Structuro app verify");
  console.log("═══════════════════════════════════════");

  runStep("Unit tests", "node", ["scripts/verify-unit.mjs"]);

  let base = externalBase;

  if (!skipStart) {
    if (!skipBuild) {
      runStep("Production build", "npm", ["run", "build"]);
    }

    const port = process.env.VERIFY_PORT || (await getFreePort());
    base = `http://127.0.0.1:${port}`;

    console.log(`\n▶ Start productie-server op ${base}\n`);
    serverProc = spawn("npx", ["next", "start", "-p", String(port)], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });

    serverProc.stdout?.on("data", (d) => process.stdout.write(d));
    serverProc.stderr?.on("data", (d) => process.stderr.write(d));

    await waitForServer(base);
    console.log(`✓ Server bereikbaar\n`);
  } else if (!base) {
    console.error("❌ VERIFY_SKIP_START=1 vereist BASE_URL");
    process.exit(1);
  }

  try {
    runStep("Route + chunk smoke", "node", ["scripts/verify-routes.mjs"], {
      BASE_URL: base,
    });
  } finally {
    if (serverProc) {
      serverProc.kill("SIGTERM");
    }
  }

  console.log("\n✅ App verify geslaagd.\n");
}

main().catch((err) => {
  if (serverProc) serverProc.kill("SIGTERM");
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
