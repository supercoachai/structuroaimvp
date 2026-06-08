#!/usr/bin/env node
/**
 * Draait alle *.test.ts in src/ + NLP-parser smoke tests.
 */

import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const srcDir = join(root, "src");

function collectTests(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      collectTests(full, out);
      continue;
    }
    if (name.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

const tests = collectTests(srcDir).sort();
const extra = [
  {
    name: "taskSchedulePhraseParser smoke",
    code: `import { runTaskScheduleParserSmokeTests } from './src/lib/taskSchedulePhraseParser.ts'; const r = runTaskScheduleParserSmokeTests(); if (r.failed) { console.error(r.failures.join('\\n')); process.exit(1); } console.log('parser smoke:', r.passed, 'ok');`,
  },
];

console.log(`\n🧪 Unit verify (${tests.length} testbestanden + parser smoke)\n`);

let failed = 0;

for (const file of tests) {
  const rel = file.replace(`${root}/`, "");
  process.stdout.write(`• ${rel} … `);
  const res = spawnSync("npx", ["--yes", "tsx", file], {
    cwd: root,
    stdio: "pipe",
    encoding: "utf8",
  });
  if (res.status === 0) {
    console.log("✅");
  } else {
    failed += 1;
    console.log("❌");
    const err = (res.stderr || res.stdout || "").trim();
    if (err) console.log(`  ${err.split("\n").slice(0, 6).join("\n  ")}`);
  }
}

for (const job of extra) {
  process.stdout.write(`• ${job.name} … `);
  const res = spawnSync("npx", ["--yes", "tsx", "-e", job.code], {
    cwd: root,
    stdio: "pipe",
    encoding: "utf8",
  });
  if (res.status === 0) {
    console.log("✅");
  } else {
    failed += 1;
    console.log("❌");
    const err = (res.stderr || res.stdout || "").trim();
    if (err) console.log(`  ${err.split("\n").slice(0, 8).join("\n  ")}`);
  }
}

console.log(failed ? `\n${failed} unit-check(s) gefaald.\n` : "\nAlle unit-checks geslaagd.\n");
process.exit(failed ? 1 : 0);
