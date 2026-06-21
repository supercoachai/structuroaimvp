import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const CONSENT_KEY = "structuro_analytics_consent";
const OUT = path.join("tests", ".auth", "fixed-stack");

test.describe.configure({ mode: "serial" });

test.beforeAll(() => fs.mkdirSync(OUT, { recursive: true }));

test("Fix-stack: acquisition hyphen-route 2xx in browser", async ({ page, context }) => {
  await context.addInitScript(([key]) => localStorage.setItem(key, "granted"), [CONSENT_KEY]);
  const calls: string[] = [];
  page.on("response", (r) => {
    const u = r.url();
    if (u.includes("/api/analytics/")) calls.push(`${r.status()} ${u}`);
  });
  await page.goto("/start", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  fs.writeFileSync(path.join(OUT, "acquisition.txt"), calls.join("\n"));
  expect(calls.find((c) => c.includes("acquisition_landing") && c.startsWith("404"))).toBeFalsy();
  expect(calls.find((c) => c.includes("acquisition-landing") && /^2/.test(c))).toBeTruthy();
});

test("Fix-stack: PostHog /ph rewrite bereikbaar (proxy-infra)", async ({ request }) => {
  const res = await request.get("/ph/decide?v=3");
  expect(res.status()).not.toBe(404);
  expect(res.status()).toBeLessThan(500);
});

test("Fix-stack: PostHog client via /ph wanneer key geconfigureerd", async ({ page, context }) => {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim()) {
    test.skip(true, "NEXT_PUBLIC_POSTHOG_KEY ontbreekt in .env.local — rewrite-test hierboven dekt infra");
  }
  await context.addInitScript(([key]) => localStorage.setItem(key, "granted"), [CONSENT_KEY]);
  const ph: string[] = [];
  page.on("response", (r) => {
    const u = r.url();
    if (/posthog|\/ph\//.test(u)) ph.push(u);
  });
  await page.goto("/start", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  fs.writeFileSync(path.join(OUT, "posthog-urls.json"), JSON.stringify(ph.slice(0, 12), null, 2));
  expect(ph.some((u) => u.includes("/ph/"))).toBeTruthy();
  expect(ph.some((u) => u.includes("eu.i.posthog.com"))).toBeFalsy();
});

test("Fix-stack: OAuth op /login en /registreren", async ({ page }) => {
  for (const route of ["/login", "/registreren"] as const) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    const oauth = page.locator('button[type="button"]').filter({ hasText: /Google|Microsoft/i });
    expect(await oauth.count(), `OAuth op ${route}`).toBeGreaterThanOrEqual(1);
  }
});

test("Fix-stack: security headers op /login", async ({ request }) => {
  const res = await request.get("/login");
  const h = res.headers();
  const check = {
    xfo: Boolean(h["x-frame-options"]),
    xcto: Boolean(h["x-content-type-options"]),
    referrer: Boolean(h["referrer-policy"]),
    csp: Boolean(h["content-security-policy"]),
  };
  fs.writeFileSync(path.join(OUT, "security-headers.json"), JSON.stringify(check, null, 2));
  expect(check.xfo && check.xcto && check.referrer && check.csp).toBeTruthy();
});

test.describe("Fix-stack: identity na login", () => {
  test.use({ storageState: "tests/.auth/qa-onboarded.json" });

  test("ingelogde home laadt + PostHog POST via /ph", async ({ page, context }) => {
    await context.addInitScript(([key]) => localStorage.setItem(key, "granted"), [CONSENT_KEY]);
    const phCalls: string[] = [];
    page.on("request", (r) => {
      const u = r.url();
      if (u.includes("/ph/") && r.method() === "POST") phCalls.push(u);
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    fs.writeFileSync(path.join(OUT, "ph-posts.txt"), phCalls.join("\n") || "(geen)");
    expect(page.url()).not.toMatch(/\/login$/);
  });
});
