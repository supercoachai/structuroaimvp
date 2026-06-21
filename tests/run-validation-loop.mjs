#!/usr/bin/env node
/**
 * Draait seed + volledige validatie-suite tot N keer groen of max pogingen.
 * Usage: node tests/run-validation-loop.mjs [iterations]
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MAX = Math.min(Number(process.argv[2]) || 3, 5);

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: "inherit", env: process.env });
  return r.status === 0;
}

for (let i = 1; i <= MAX; i++) {
  console.log(`\n========== VALIDATIE RUN ${i}/${MAX} ==========\n`);
  if (!run("node", ["tests/seed-session.mjs"])) process.exit(1);
  if (!run("node", ["tests/seed-onboarded.mjs"])) process.exit(1);
  const ok = run("npx", [
    "playwright",
    "test",
    "tests/fixed-stack-validation.spec.ts",
    "tests/qa.spec.ts",
    "tests/full-audit.spec.ts",
    "--project=chromium-desktop-1280",
  ]);
  if (!ok) {
    console.error(`\nRUN ${i} FAILED`);
    process.exit(1);
  }
  console.log(`\nRUN ${i} OK`);
}
console.log("\nALL_VALIDATION_RUNS_OK");
