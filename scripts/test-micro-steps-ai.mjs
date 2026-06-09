#!/usr/bin/env node
/**
 * Snelle smoke test voor microstap-suggesties (template + optioneel AI Gateway).
 * Draai: node --env-file=.env.local scripts/test-micro-steps-ai.mjs
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const result = spawnSync(
  "npx",
  ["--yes", "tsx", "scripts/test-micro-steps-ai.ts"],
  { cwd: root, stdio: "inherit", env: process.env }
);

process.exit(result.status ?? 1);
