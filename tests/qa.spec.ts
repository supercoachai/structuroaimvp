import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";

const PROTECTED = ["/", "/focus", "/shutdown", "/todo", "/settings", "/notificaties", "/abonnement"];
const PUBLIC_PAGES = ["/start", "/tiktok", "/login", "/registreren", "/consent", "/privacy", "/terms"];
const CONSENT_KEY = "structuro_analytics_consent";

type Captured = { errors: string[]; pageErrors: string[]; bad: string[] };

function capture(page: Page): Captured {
  const c: Captured = { errors: [], pageErrors: [], bad: [] };
  page.on("console", (m) => {
    if (m.type() === "error") c.errors.push(m.text());
  });
  page.on("pageerror", (e) => c.pageErrors.push(e.message));
  page.on("response", (r) => {
    const s = r.status();
    if (s >= 400) c.bad.push(`${s} ${r.request().method()} ${r.url()}`);
  });
  return c;
}

test.describe("Persona C — uitgelogd: protected routes", () => {
  for (const route of PROTECTED) {
    test(`uitgelogd ${route} -> /login`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/login/);
    });
  }
});

test.describe("Persona D-gate — geseede sessie: server ziet login", () => {
  test.use({ storageState: "tests/.auth/qa.json" });
  for (const route of ["/", "/focus", "/settings"]) {
    test(`ingelogd ${route} -> /onboarding (server)`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/onboarding/);
    });
  }
});

test("Acquisition server-backup: hyphen-route geeft 2xx (geen 404)", async ({ page, context }) => {
  await context.addInitScript(
    ([key]) => {
      try {
        window.localStorage.setItem(key, "granted");
      } catch {
        /* ignore */
      }
    },
    [CONSENT_KEY]
  );
  const analyticsCalls: string[] = [];
  page.on("response", (r) => {
    const u = r.url();
    if (u.includes("/api/analytics/")) analyticsCalls.push(`${r.status()} ${u}`);
  });
  await page.goto("/start", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  const hyphenOk = analyticsCalls.find(
    (c) => c.includes("/api/analytics/acquisition-landing") && /^2/.test(c)
  );
  const underscore404 = analyticsCalls.find(
    (c) => c.includes("/api/analytics/acquisition_landing") && c.startsWith("404")
  );
  test.info().annotations.push({ type: "analytics-calls", description: analyticsCalls.join(" | ") || "(geen)" });
  fs.writeFileSync(
    path.join("tests", ".auth", "acquisition-calls.txt"),
    analyticsCalls.join("\n") || "(geen acquisition analytics-calls)"
  );
  expect(underscore404, "underscore-route mag niet meer 404'en").toBeFalsy();
  expect(hyphenOk, `analytics-calls: ${analyticsCalls.join(" | ")}`).toBeTruthy();
});

test("Login: OAuth-knoppen zichtbaar (Google/Microsoft indien enabled)", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  const oauthButtons = page.locator('button[type="button"]').filter({
    hasText: /Google|Microsoft|Apple/i,
  });
  const count = await oauthButtons.count();
  test.info().annotations.push({ type: "oauth-buttons", description: String(count) });
  expect(count).toBeGreaterThanOrEqual(1);
});

test.describe("Console/netwerk per publieke pagina", () => {
  for (const route of PUBLIC_PAGES) {
    test(`scan ${route}`, async ({ page }) => {
      const c = capture(page);
      const resp = await page.goto(route, { waitUntil: "networkidle" }).catch(() => null);
      await page.waitForTimeout(800);
      const summary = {
        route,
        finalUrl: page.url(),
        status: resp?.status() ?? null,
        consoleErrors: c.errors,
        pageErrors: c.pageErrors,
        http4xx5xx: c.bad,
      };
      fs.mkdirSync(path.join("tests", ".auth", "scans"), { recursive: true });
      fs.writeFileSync(
        path.join("tests", ".auth", "scans", `${route.replace(/\W+/g, "_") || "root"}.json`),
        JSON.stringify(summary, null, 2)
      );
      test.info().annotations.push({
        type: "scan",
        description: `${route} status=${summary.status} consoleErr=${c.errors.length} pageErr=${c.pageErrors.length} bad=${c.bad.length}`,
      });
      expect(c.pageErrors, `pageerrors op ${route}: ${c.pageErrors.join(" | ")}`).toHaveLength(0);
    });
  }
});

test.describe("A11y (axe WCAG 2.2 AA) — publieke routes", () => {
  for (const route of ["/login", "/start", "/registreren", "/consent"]) {
    test(`axe ${route}`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1200);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      const viol = results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.length,
        help: v.help,
      }));
      fs.mkdirSync(path.join("tests", ".auth", "axe"), { recursive: true });
      fs.writeFileSync(
        path.join("tests", ".auth", "axe", `${route.replace(/\W+/g, "_") || "root"}.json`),
        JSON.stringify(viol, null, 2)
      );
      test.info().annotations.push({
        type: "axe",
        description: `${route}: ${viol.length} violations -> ${viol.map((v) => `${v.id}(${v.impact},${v.nodes})`).join(", ")}`,
      });
    });
  }
});
