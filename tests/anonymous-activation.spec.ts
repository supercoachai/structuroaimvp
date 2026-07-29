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

  test("(a) /start redirect naar /onboarding", async ({ page }) => {
    await page.goto("/start", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/onboarding(\/|\?|$)/, {
      timeout: 20_000,
      waitUntil: "domcontentloaded",
    });
    expect(page.url()).toMatch(/\/onboarding/);
    expect(page.url()).not.toMatch(/\/start(\?|$)/);
  });

  test("(b) /start met UTM landt op /onboarding met local-mode cookie", async ({
    page,
    context,
  }) => {
    await page.goto(
      "/start?utm_source=structuro_eu&utm_medium=organic&utm_campaign=website&utm_content=e2e",
      { waitUntil: "domcontentloaded" }
    );
    await page.waitForURL(/\/onboarding(\/|\?|$)/, {
      timeout: 20_000,
      waitUntil: "domcontentloaded",
    });
    expect(page.url()).toMatch(/\/onboarding/);
    expect(page.url()).toMatch(/utm_source=structuro_eu/);
    expect(page.url()).not.toMatch(/\/v2\//);

    const cookies = await context.cookies();
    const localMode = cookies.find((c) => c.name === LOCAL_MODE_COOKIE);
    expect(localMode?.value).toBe("1");
  });

  test("(c) her-bezoek /start behoudt localStorage na redirect", async ({
    page,
  }) => {
    await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
    await seedProgress(page);

    await page.goto(
      "/start?utm_source=structuro_eu&utm_medium=organic&utm_campaign=website",
      { waitUntil: "domcontentloaded" }
    );
    await page.waitForURL(/\/onboarding(\/|\?|$)/, {
      timeout: 20_000,
      waitUntil: "domcontentloaded",
    });

    const after = await page.evaluate(
      ({ tasksKey, nameKey, completedKey }) => ({
        tasksRaw: localStorage.getItem(tasksKey),
        name: localStorage.getItem(nameKey),
        completed: localStorage.getItem(completedKey),
      }),
      { tasksKey: TASKS_KEY, nameKey: NAME_KEY, completedKey: COMPLETED_KEY }
    );

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
