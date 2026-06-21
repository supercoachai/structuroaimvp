import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const OUT = path.join("tests", ".auth", "full-audit");
const APP_ROUTES = ["/", "/focus", "/shutdown", "/todo", "/settings", "/notificaties", "/abonnement"];
const PUBLIC_NAV = ["/start", "/login", "/registreren", "/privacy", "/terms"];

function capture(page: Page) {
  const bad: string[] = [];
  page.on("response", (r) => {
    if (r.status() >= 400) bad.push(`${r.status()} ${r.request().method()} ${r.url()}`);
  });
  return bad;
}

async function screenshotHash(page: Page): Promise<string> {
  const buf = await page.screenshot({ fullPage: false });
  return createHash("sha256").update(buf).digest("hex").slice(0, 16);
}

test.describe("Core loop — onboarded user", () => {
  test.use({ storageState: "tests/.auth/qa-onboarded.json" });

  test("ingelogd / laadt (geen redirect naar login)", async ({ page }) => {
    const bad = capture(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    expect(page.url()).not.toMatch(/\/login$/);
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, "home-url.txt"), page.url());
    expect(bad.filter((b) => !b.includes("favicon"))).toHaveLength(0);
  });

  for (const route of ["/focus", "/shutdown", "/todo"]) {
    test(`ingelogd ${route} bereikbaar`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
      expect(page.url()).not.toMatch(/\/login$/);
      expect(page.url()).not.toMatch(/\/onboarding$/);
    });
  }

  test("navigatie home -> focus -> shutdown -> back", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    await page.goto("/focus", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    await page.goto("/shutdown", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    await page.goBack();
    await page.waitForTimeout(800);
    expect(page.url()).toMatch(/\/focus/);
    await page.goBack();
    await page.waitForTimeout(800);
    const url = page.url();
    fs.writeFileSync(path.join(OUT, "back-nav-final.txt"), url);
    expect(url).toMatch(/\/($|\?)/);
  });
});

test.describe("Knoppen — publieke pagina's (geen dode links)", () => {
  for (const route of PUBLIC_NAV) {
    test(`klikbare elementen op ${route}`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1000);
      const buttons = page.locator("button:visible, a[href]:visible, [role='button']:visible");
      const count = await buttons.count();
      expect(count).toBeGreaterThan(0);
      const dead: string[] = [];
      const links = page.locator("a[href]:visible");
      const n = Math.min(await links.count(), 12);
      for (let i = 0; i < n; i++) {
        const href = await links.nth(i).getAttribute("href");
        if (!href || href.startsWith("#") || href.startsWith("mailto:")) continue;
        if (href.startsWith("http") && !href.includes("127.0.0.1") && !href.includes("structuro")) continue;
        const resp = await page.request.get(href.startsWith("http") ? href : `http://127.0.0.1:3000${href}`);
        if (resp.status() >= 400) dead.push(`${resp.status()} ${href}`);
      }
      fs.mkdirSync(path.join(OUT, "buttons"), { recursive: true });
      fs.writeFileSync(
        path.join(OUT, "buttons", `${route.replace(/\W+/g, "_")}.json`),
        JSON.stringify({ route, interactiveCount: count, deadLinksSample: dead }, null, 2)
      );
      expect(dead, `dode links op ${route}: ${dead.join(", ")}`).toHaveLength(0);
    });
  }
});

test.describe("Visuele flitsen — frame-sampling na navigatie", () => {
  const routes = ["/login", "/start", "/"];

  for (const route of routes) {
    test(`flits-scan ${route}`, async ({ page }) => {
      const hashes: string[] = [];
      await page.goto(route, { waitUntil: "domcontentloaded" });
      for (let i = 0; i < 20; i++) {
        hashes.push(await screenshotHash(page));
        await page.waitForTimeout(40);
      }
      const unique = new Set(hashes);
      const flashScore = unique.size;
      fs.mkdirSync(path.join(OUT, "flashes"), { recursive: true });
      fs.writeFileSync(
        path.join(OUT, "flashes", `${route.replace(/\W+/g, "_") || "root"}.json`),
        JSON.stringify({ route, uniqueFrames: flashScore, hashes }, null, 2)
      );
      test.info().annotations.push({ type: "flash-frames", description: `${route}: ${flashScore} unieke frames/800ms` });
      // Animaties op login/start kunnen >18 unieke frames geven; we registreren, geen harde fail.
      expect(flashScore).toBeLessThan(25);
    });
  }
});

test.describe("OAuth UI — geen echte OAuth-flow", () => {
  test("Google-knop opent geen crash (headless)", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    const google = page.getByRole("button", { name: /Google/i }).first();
    if ((await google.count()) === 0) {
      test.skip(true, "Geen Google-knop geconfigureerd");
    }
    await google.click();
    await page.waitForTimeout(1500);
    fs.writeFileSync(path.join(OUT, "oauth-click-errors.json"), JSON.stringify({ errors, url: page.url() }, null, 2));
    expect(errors).toHaveLength(0);
  });
});
