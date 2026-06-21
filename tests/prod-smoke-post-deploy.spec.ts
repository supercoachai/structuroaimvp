import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.SMOKE_BASE_URL ?? "https://www.structuro.ai";
const CONSENT_KEY = "structuro_analytics_consent";
const OUT = path.join("tests", ".auth", "prod-smoke");

test.describe.configure({ mode: "serial" });

test.beforeAll(() => fs.mkdirSync(OUT, { recursive: true }));

test("Smoke: site bereikbaar", async ({ request }) => {
  const res = await request.get(`${BASE}/login`);
  expect(res.status()).toBeLessThan(500);
  expect(res.status()).toBe(200);
});

test("Smoke: acquisition underscore 404, hyphen route OK", async ({ request }) => {
  const underscore = await request.post(`${BASE}/api/analytics/acquisition_landing`, {
    data: { event: "x" },
  });
  const hyphen = await request.post(`${BASE}/api/analytics/acquisition-landing`, {
    data: { visitor_id: "00000000-0000-4000-8000-000000000001", landing_path: "/start", source: "smoke" },
  });
  const result = { underscore: underscore.status(), hyphen: hyphen.status() };
  fs.writeFileSync(path.join(OUT, "acquisition-api.json"), JSON.stringify(result, null, 2));
  expect(underscore.status()).toBe(404);
  expect(hyphen.status()).not.toBe(404);
  expect(hyphen.status()).toBeLessThan(500);
});

test("Smoke: browser acquisition backup 2xx op /start", async ({ page, context }) => {
  await context.addInitScript(([key]) => localStorage.setItem(key, "granted"), [CONSENT_KEY]);
  const calls: string[] = [];
  page.on("response", (r) => {
    const u = r.url();
    if (u.includes("/api/analytics/")) calls.push(`${r.status()} ${u}`);
  });
  await page.goto(`${BASE}/start`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(3500);
  fs.writeFileSync(path.join(OUT, "acquisition-browser.txt"), calls.join("\n") || "(geen)");
  expect(calls.find((c) => c.includes("acquisition_landing") && c.startsWith("404"))).toBeFalsy();
  expect(calls.find((c) => c.includes("acquisition-landing") && /^2/.test(c))).toBeTruthy();
});

test("Smoke: PostHog via /ph proxy", async ({ page, context }) => {
  await context.addInitScript(([key]) => localStorage.setItem(key, "granted"), [CONSENT_KEY]);
  const ph: string[] = [];
  page.on("response", (r) => {
    const u = r.url();
    if (/posthog|\/ph\//.test(u)) ph.push(u);
  });
  await page.goto(`${BASE}/start`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(4000);
  fs.writeFileSync(path.join(OUT, "posthog-urls.json"), JSON.stringify(ph.slice(0, 15), null, 2));
  expect(ph.some((u) => u.includes("/ph/"))).toBeTruthy();
  expect(ph.some((u) => u.includes("eu.i.posthog.com/e/"))).toBeFalsy();
});

test("Smoke: OAuth op /login en /registreren", async ({ page }) => {
  const counts: Record<string, number> = {};
  for (const route of ["/login", "/registreren"] as const) {
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(1200);
    counts[route] = await page.locator('button[type="button"]').filter({ hasText: /Google|Microsoft/i }).count();
  }
  fs.writeFileSync(path.join(OUT, "oauth.json"), JSON.stringify(counts, null, 2));
  expect(counts["/login"]).toBeGreaterThanOrEqual(1);
  expect(counts["/registreren"]).toBeGreaterThanOrEqual(1);
});

test("Smoke: security headers .ai", async ({ request }) => {
  const res = await request.get(`${BASE}/login`);
  const h = res.headers();
  const check = {
    xfo: Boolean(h["x-frame-options"]),
    xcto: Boolean(h["x-content-type-options"]),
    referrer: Boolean(h["referrer-policy"]),
    csp: Boolean(h["content-security-policy"]),
  };
  fs.writeFileSync(path.join(OUT, "security-ai.json"), JSON.stringify(check, null, 2));
  expect(Object.values(check).every(Boolean)).toBeTruthy();
});
