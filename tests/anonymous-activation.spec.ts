import { test, expect, type Page } from "@playwright/test";

/**
 * Anonieme activatie-funnel, headless tegen lokale dev.
 * Geen echte OAuth/Supabase-auth: we testen de anonieme (local-mode) flow.
 *
 * Keys uit de app:
 * - structuro_local_mode (cookie): markeert anonieme local-mode sessie
 * - structuro_tasks (localStorage): lokale taken
 * - structuro_user_name (localStorage): vooraf opgegeven aanspreeknaam
 * - structuro_onboarding_completed_local (localStorage): anonieme onboarding klaar
 */
const TASKS_KEY = "structuro_tasks";
const NAME_KEY = "structuro_user_name";
const COMPLETED_KEY = "structuro_onboarding_completed_local";
const VERSION_KEY = "structuro_onboarding_version_local";
const LOCAL_MODE_COOKIE = "structuro_local_mode";

function ctaLink(page: Page) {
  // De marketing-CTA is een Link naar /onboarding (hero + footer delen dezelfde href).
  return page.locator('a[href="/onboarding"]').first();
}

/**
 * Klik de CTA pas nadat de client-component gehydrateerd is. Zonder die wachttijd
 * vuurt Playwright de klik op de nog niet-interactieve anchor, waardoor de
 * onClick-handler (cookie + assign) niet draait en de anchor-default naar /login
 * leidt. We wachten daarom op load + een hydratiebuffer.
 */
async function clickCtaWhenHydrated(page: Page) {
  const cta = ctaLink(page);
  await expect(cta).toBeVisible({ timeout: 15_000 });
  await page.waitForLoadState("load").catch(() => {});
  await page.waitForTimeout(2500);
  await cta.click();
}

async function seedProgress(page: Page) {
  await page.evaluate(
    ({ tasksKey, nameKey, completedKey, versionKey }) => {
      const now = new Date().toISOString();
      const task = {
        id: "e2e-task-1",
        title: "Bestaande taak",
        done: false,
        started: false,
        priority: null,
        dueAt: null,
        duration: null,
        source: "regular",
        completedAt: null,
        reminders: [],
        repeat: "none",
        impact: "🌱",
        energyLevel: "medium",
        estimatedDuration: null,
        microSteps: [],
        notToday: false,
        created_at: now,
        updated_at: now,
      };
      try {
        localStorage.setItem(tasksKey, JSON.stringify([task]));
        localStorage.setItem(nameKey, "TestNaam");
        localStorage.setItem(completedKey, "1");
        localStorage.setItem(versionKey, "999");
      } catch {
        /* ignore */
      }
    },
    {
      tasksKey: TASKS_KEY,
      nameKey: NAME_KEY,
      completedKey: COMPLETED_KEY,
      versionKey: VERSION_KEY,
    }
  );
}

test.describe("Anonieme activatie-funnel", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("(a) /start laadt en de hoofd-CTA is zichtbaar en klikbaar", async ({
    page,
  }) => {
    await page.goto("/start", { waitUntil: "domcontentloaded" });
    const cta = ctaLink(page);
    await expect(cta).toBeVisible({ timeout: 15_000 });
    await expect(cta).toBeEnabled();
  });

  test("(b) CTA-klik zet local-mode cookie en landt op /onboarding", async ({
    page,
    context,
  }) => {
    await page.goto("/start", { waitUntil: "domcontentloaded" });
    // Schone start: geen bestaande voortgang.
    await page.evaluate(() => {
      try {
        localStorage.clear();
      } catch {
        /* ignore */
      }
    });

    await clickCtaWhenHydrated(page);

    await page.waitForURL(/\/onboarding(\/|\?|$)/, { timeout: 20_000, waitUntil: "commit" });
    expect(page.url()).toMatch(/\/onboarding/);

    const cookies = await context.cookies();
    const localMode = cookies.find((c) => c.name === LOCAL_MODE_COOKIE);
    expect(localMode?.value).toBe("1");
  });

  test("(c) bestaande voortgang blijft behouden bij her-klik", async ({
    page,
  }) => {
    // Verse start: CTA voert door naar /onboarding.
    await page.goto("/start", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      try {
        localStorage.clear();
      } catch {
        /* ignore */
      }
    });
    await clickCtaWhenHydrated(page);
    await page.waitForURL(/\/onboarding(\/|\?|$)/, { timeout: 20_000, waitUntil: "commit" });

    // Simuleer voortgang die de gebruiker tijdens onboarding opbouwt.
    await seedProgress(page);

    // Terug naar /start en opnieuw op de CTA klikken.
    await page.goto("/start", { waitUntil: "domcontentloaded" });

    // Stub het /onboarding-document zodat app-code de localStorage niet muteert
    // en we puur de reset-beslissing van de CTA observeren.
    await page.route("**/onboarding", async (route) => {
      if (route.request().resourceType() === "document") {
        await route.fulfill({
          status: 200,
          contentType: "text/html",
          body: "<!doctype html><html><head><title>stub</title></head><body>stub</body></html>",
        });
      } else {
        await route.continue();
      }
    });

    await clickCtaWhenHydrated(page);
    await page.waitForURL(/\/onboarding(\/|\?|$)/, { timeout: 20_000, waitUntil: "commit" });

    const after = await page.evaluate(
      ({ tasksKey, nameKey, completedKey }) => ({
        tasksRaw: localStorage.getItem(tasksKey),
        name: localStorage.getItem(nameKey),
        completed: localStorage.getItem(completedKey),
      }),
      { tasksKey: TASKS_KEY, nameKey: NAME_KEY, completedKey: COMPLETED_KEY }
    );

    // Geen reset: voortgang en lokale taken blijven staan.
    expect(after.name).toBe("TestNaam");
    expect(after.completed).toBe("1");
    const tasks = JSON.parse(after.tasksRaw ?? "[]") as Array<{ id: string }>;
    expect(tasks.some((t) => t.id === "e2e-task-1")).toBe(true);
  });

  test("(f) directe /onboarding zonder cookie blijft op onboarding (hydratie-race)", async ({
    page,
    context,
  }) => {
    // Simuleert de anchor-default-navigatie die optreedt als een bezoeker de CTA
    // aanklikt vóór React-hydratie: dan draait de client-handler (cookie + assign)
    // niet en landt de browser direct op /onboarding zonder local-mode cookie.
    // De middleware-backstop moet lokale modus starten i.p.v. naar /login te bouncen.
    await context.clearCookies();
    const response = await page.goto("/onboarding", { waitUntil: "commit" });
    expect(response, "geen response voor /onboarding").toBeTruthy();

    await page.waitForURL(/\/onboarding(\/|\?|$)/, {
      timeout: 20_000,
      waitUntil: "commit",
    });
    expect(page.url()).toMatch(/\/onboarding/);
    expect(page.url()).not.toMatch(/\/login/);

    const cookies = await context.cookies();
    const localMode = cookies.find((c) => c.name === LOCAL_MODE_COOKIE);
    expect(localMode?.value).toBe("1");
  });

  test("(d) security headers smoke op /start", async ({ page }) => {
    const response = await page.goto("/start", {
      waitUntil: "domcontentloaded",
    });
    expect(response, "geen response voor /start").toBeTruthy();
    expect(response!.status()).toBeLessThan(400);
    const headers = response!.headers();
    // Basis security-header smoke (hergebruik van bestaande conventies).
    expect(headers["x-content-type-options"]).toBe("nosniff");
  });

  test.skip("(e) echte OAuth/magic-link signup", () => {
    // Bewust geskipt: vereist echte Supabase-auth, Google OAuth en e-mailbezorging.
    // Niet betrouwbaar headless te reproduceren. Handmatige smoke vóór deploy.
  });
});
