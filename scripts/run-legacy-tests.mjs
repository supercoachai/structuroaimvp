#!/usr/bin/env node
// Draait de bestaande assert-stijl *.test.ts via tsx, tot ze naar Vitest zijn gemigreerd.
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = new URL("../src", import.meta.url).pathname;

function findTests(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...findTests(full));
    } else if (entry.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

const files = findTests(ROOT).sort();
if (files.length === 0) {
  console.log("Geen legacy tests gevonden.");
  process.exit(0);
}

let failed = 0;
for (const file of files) {
  const res = spawnSync("npx", ["--yes", "tsx", file], {
    stdio: "inherit",
    encoding: "utf8",
  });
  if (res.status !== 0) {
    failed += 1;
    console.error(`FAIL: ${file}`);
  }
}

console.log(`\nLegacy tests: ${files.length - failed}/${files.length} OK`);
process.exit(failed > 0 ? 1 : 0);
