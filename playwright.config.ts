import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

function loadEnvLocal() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, ".env.local"), "utf8");
    for (const line of raw.split(/\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* geen .env.local */
  }
}
loadEnvLocal();

/**
 * QA-audit config. Dev-server draait al apart (npm run dev op :3000), dus geen webServer hier.
 * Video aan, trace altijd, screenshot bij falen, retries 2, html-reporter.
 * Projecten: chromium/webkit/firefox × viewports 375/768/1280.
 */
const BASE_URL = process.env.QA_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests",
  testMatch: /.*\.spec\.ts/,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: 2,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: BASE_URL,
    video: "on",
    trace: "on",
    screenshot: "only-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 40_000,
  },
  projects: [
    {
      name: "chromium-mobile-375",
      use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 } },
    },
    {
      name: "chromium-tablet-768",
      use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } },
    },
    {
      name: "chromium-desktop-1280",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "webkit-desktop-1280",
      use: { ...devices["Desktop Safari"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "firefox-desktop-1280",
      use: { ...devices["Desktop Firefox"], viewport: { width: 1280, height: 800 } },
    },
  ],
});
