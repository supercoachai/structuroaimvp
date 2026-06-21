import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const CONSENT_KEY = "structuro_analytics_consent";
const OUT = path.join("tests", ".auth", "prod");

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  fs.mkdirSync(OUT, { recursive: true });
});

test("Prod: acquisition underscore-route 404, hyphen-route bestaat", async ({ request }) => {
  const underscore = await request.post("https://www.structuro.ai/api/analytics/acquisition_landing", {
    data: { event: "x" },
  });
  const hyphen = await request.post("https://www.structuro.ai/api/analytics/acquisition-landing", {
    data: { event: "x" },
  });
  const result = { underscore: underscore.status(), hyphen: hyphen.status() };
  fs.writeFileSync(path.join(OUT, "acquisition-routes.json"), JSON.stringify(result, null, 2));
  expect(underscore.status()).toBe(404);
  expect(hyphen.status()).not.toBe(404);
});

test("Prod: PostHog gaat direct naar eu.i.posthog.com (geen /ph proxy)", async ({ page, context }) => {
  await context.addInitScript(([key]) => localStorage.setItem(key, "granted"), [CONSENT_KEY]);
  const ph: string[] = [];
  page.on("response", (r) => {
    const u = r.url();
    if (/posthog|\/ph\//.test(u)) ph.push(u);
  });
  await page.goto("https://www.structuro.ai/start", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);
  const viaProxy = ph.some((u) => /\/ph\//.test(u));
  const direct = ph.some((u) => /eu\.i\.posthog\.com|eu-assets\.i\.posthog\.com/.test(u));
  fs.writeFileSync(path.join(OUT, "posthog-urls.json"), JSON.stringify({ viaProxy, direct, sample: ph.slice(0, 8) }, null, 2));
  expect(direct, "prod gebruikt direct posthog host").toBeTruthy();
  expect(viaProxy, "prod gebruikt nog geen /ph proxy").toBeFalsy();
});

test("Prod: browser acquisition backup 404 op underscore", async ({ page, context }) => {
  await context.addInitScript(([key]) => localStorage.setItem(key, "granted"), [CONSENT_KEY]);
  const calls: string[] = [];
  page.on("response", (r) => {
    const u = r.url();
    if (u.includes("/api/analytics/")) calls.push(`${r.status()} ${u}`);
  });
  await page.goto("https://www.structuro.ai/start", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  fs.writeFileSync(path.join(OUT, "acquisition-browser-calls.txt"), calls.join("\n") || "(geen)");
  const underscore404 = calls.find((c) => c.includes("acquisition_landing") && c.startsWith("404"));
  expect(underscore404, `prod acquisition calls: ${calls.join(" | ")}`).toBeTruthy();
});

test("Prod: OAuth-knoppen baseline (prod heeft momenteel geen social login UI)", async ({ page }) => {
  for (const route of ["/registreren", "/login"] as const) {
    await page.goto(`https://www.structuro.ai${route}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
  }
  const oauth = page.locator('button[type="button"]').filter({ hasText: /Google|Microsoft|Apple/i });
  const count = await oauth.count();
  const result = { registrerenAndLoginCombinedVisible: count, note: "prod baseline vóór deploy van OAuthSignInButtons" };
  fs.writeFileSync(path.join(OUT, "oauth-login.json"), JSON.stringify(result, null, 2));
  test.info().annotations.push({ type: "oauth-prod-baseline", description: `OAuth buttons zichtbaar: ${count}` });
});

test("Prod: .eu security headers", async ({ request }) => {
  const res = await request.get("https://www.structuro.eu");
  const headers = res.headers();
  const check = {
    hsts: Boolean(headers["strict-transport-security"]),
    csp: Boolean(headers["content-security-policy"]),
    xfo: Boolean(headers["x-frame-options"]),
    xcto: Boolean(headers["x-content-type-options"]),
    referrer: Boolean(headers["referrer-policy"]),
  };
  fs.writeFileSync(path.join(OUT, "eu-security-headers.json"), JSON.stringify(check, null, 2));
  expect(check.hsts).toBeTruthy();
  expect(check.csp).toBeFalsy();
});

test("Prod: .ai security headers", async ({ request }) => {
  const res = await request.get("https://www.structuro.ai/login");
  const headers = res.headers();
  const check = {
    hsts: Boolean(headers["strict-transport-security"]),
    csp: Boolean(headers["content-security-policy"]),
    xfo: Boolean(headers["x-frame-options"]),
    xcto: Boolean(headers["x-content-type-options"]),
    referrer: Boolean(headers["referrer-policy"]),
  };
  fs.writeFileSync(path.join(OUT, "ai-security-headers.json"), JSON.stringify(check, null, 2));
  expect(check.hsts).toBeTruthy();
});
