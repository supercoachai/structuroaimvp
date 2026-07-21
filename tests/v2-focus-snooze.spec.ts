import { test, expect, type Page } from "@playwright/test";

/**
 * V2 focus-einde + snooze tegen lokale dev (:3000).
 * Seed localStorage (v2_journey / v2_tasks), geen echte auth.
 */

async function seedV2Journey(page: Page, things: string[]) {
  await page.addInitScript(
    ({ journeyThings }) => {
      const journey = {
        name: "E2E",
        energy: "enough",
        things: journeyThings,
        why: "",
        whyOutcome: "",
        todayDone: false,
        cyclusOptIn: false,
      };
      try {
        localStorage.setItem("v2_journey", JSON.stringify(journey));
      } catch {
        /* ignore */
      }
    },
    { journeyThings: things },
  );
}

async function seedV2Task(page: Page, title: string) {
  await page.addInitScript(
    ({ taskTitle }) => {
      const now = new Date().toISOString();
      const task = {
        id: "e2e-v2t-1",
        title: taskTitle,
        done: false,
        dueDate: null,
        repeat: "none",
        repeatIntervalDays: null,
        priority: null,
        energy: null,
        microSteps: [],
        why: null,
        outcome: null,
        snoozeUntil: null,
        durationBucket: null,
        createdAt: now,
      };
      try {
        localStorage.setItem("v2_tasks", JSON.stringify([task]));
      } catch {
        /* ignore */
      }
    },
    { taskTitle: title },
  );
}

test.describe("V2 focus-einde en snooze", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("focus: Afronden → Ik ben klaar → home", async ({ page }) => {
    await seedV2Journey(page, ["E2E focus ding"]);
    await page.goto("/v2/focus", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("E2E focus ding")).toBeVisible({ timeout: 15_000 });
    // P0: suggested/default is primary ("Kort, begin hier"), niet gelijke "Kort".
    await page.getByRole("button", { name: /Kort/i }).click();
    await expect(page.getByRole("button", { name: "Pauze" })).toBeVisible();
    await page.getByRole("button", { name: "Afronden" }).click();

    await expect(page.getByRole("button", { name: "Ik ben klaar" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Nog even bezig" })).toBeVisible();
    await page.getByRole("button", { name: "Ik ben klaar" }).click();

    await page.waitForURL(/\/v2\/home(\/|\?|$)/, { timeout: 15_000 });
    expect(page.url()).toMatch(/\/v2\/home/);
  });

  test("todo: snooze Vanavond haalt taak uit zichtbare lijst", async ({ page }) => {
    const title = "E2E snooze taak";
    await seedV2Journey(page, []);
    await seedV2Task(page, title);
    await page.goto("/v2/todo", { waitUntil: "domcontentloaded" });

    await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 });
    // Expand rij (titelknop naast checkbox)
    await page.getByRole("button", { name: title }).click();
    await page.getByRole("button", { name: "Vanavond" }).click();

    await expect(page.getByText(title)).toHaveCount(0, { timeout: 10_000 });
    await expect(page.getByText(/rust even|rusten even/i)).toBeVisible({
      timeout: 5_000,
    });
  });
});
