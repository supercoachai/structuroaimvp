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
        localStorage.setItem("structuro_locale", "nl");
        localStorage.setItem("structuro_lang", "nl");
      } catch {
        /* ignore */
      }
    },
    { journeyThings: things },
  );
}

async function seedV2Task(
  page: Page,
  title: string,
  microSteps: Array<{ id: string; title: string; done: boolean }> = [],
) {
  await page.addInitScript(
    ({ taskTitle, steps }) => {
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
        microSteps: steps,
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
    { taskTitle: title, steps: microSteps },
  );
}

test.describe("V2 focus-einde en snooze", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("focus: Afronden → Ik ben klaar → home", async ({ page }) => {
    await seedV2Journey(page, ["E2E focus ding"]);
    await page.goto("/focus?lang=nl", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("E2E focus ding")).toBeVisible({ timeout: 15_000 });
    // P0: één primary Start focus (AI/fallback estimate), geen drie gelijke duurknoppen.
    await page.getByRole("button", { name: /Start focus/i }).click();
    await expect(page.getByRole("button", { name: "Pauze" })).toBeVisible();
    await page.getByRole("button", { name: "Afronden" }).click();

    await expect(page.getByRole("button", { name: "Ik ben klaar" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Nog bezig" })).toBeVisible();
    // Finish: vinkje i.p.v. grijs "Tijd om te kiezen"-rondje.
    await expect(page.getByText("Tijd om te kiezen")).toHaveCount(0);
    await expect(
      page.getByText("Houd ingedrukt om af te ronden"),
    ).toBeVisible();
    // Hold-to-confirm: delay tussen mousedown/mouseup (geen snelle tap).
    await page.getByRole("button", { name: "Ik ben klaar" }).click({ delay: 1000 });

    // Laatste dagstart-taak: shutdown-ritueel i.p.v. done-overlay.
    await page.waitForURL(/\/shutdown(\?from=last-task|$)/, { timeout: 15_000 });
    await expect(page.getByText("Dagafsluiting")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Dit is gelukt vandaag.")).toBeVisible();
  });

  test("focus: toont microstappen en laat afvinken toe", async ({ page }) => {
    const title = "E2E micro focus";
    await seedV2Journey(page, [title]);
    await seedV2Task(page, title, [
      { id: "ms-1", title: "Eerste mini-stap", done: false },
      { id: "ms-2", title: "Tweede mini-stap", done: false },
    ]);
    await page.goto(`/v2/focus?thing=${encodeURIComponent(title)}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 });
    const list = page.getByRole("list", { name: "Microstappen" });
    await expect(list).toBeVisible();
    const first = page.getByRole("button", { name: /Eerste mini-stap/i });
    await expect(first).toHaveAttribute("aria-pressed", "false");
    await first.click();
    await expect(first).toHaveAttribute("aria-pressed", "true");
  });

  test("focus: soft voorstel bij lege microstappen", async ({ page }) => {
    const title = "E2E leeg micro";
    await seedV2Journey(page, [title]);
    await seedV2Task(page, title, []);
    await page.goto(`/v2/focus?thing=${encodeURIComponent(title)}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Opsplitsen in kleine stappen?")).toBeVisible();
    await expect(page.getByRole("button", { name: "Ja, stel voor" })).toBeVisible();
    await page.getByRole("button", { name: "Niet nu" }).click();
    await expect(page.getByText("Opsplitsen in kleine stappen?")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Toch opsplitsen?" })).toBeVisible();
  });

  test("todo: snooze Vanavond haalt taak uit actieve lijst, Weer actief zet terug", async ({
    page,
  }) => {
    const title = "E2E snooze taak";
    await seedV2Journey(page, []);
    await seedV2Task(page, title);
    await page.goto("/v2/todo", { waitUntil: "domcontentloaded" });

    await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 });
    // Expand rij (titelknop naast checkbox)
    await page.getByRole("button", { name: title }).click();
    await page.getByRole("button", { name: "Vanavond" }).click();

    await expect(page.getByText(/rust even|rusten even/i)).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByRole("button", { name: "Weer actief" })).toBeVisible();
    await page.getByRole("button", { name: "Weer actief" }).click();

    await expect(page.getByRole("button", { name: "Weer actief" })).toHaveCount(0);
    await expect(page.getByText(title)).toBeVisible();
    await expect(page.getByRole("button", { name: "Markeer als klaar" })).toBeVisible();
  });

  test("todo: laatste dagstart-taak vink start shutdown", async ({ page }) => {
    const title = "E2E laatste todo ding";
    await seedV2Journey(page, [title]);
    await seedV2Task(page, title);
    await page.goto("/todo?lang=nl", { waitUntil: "domcontentloaded" });

    await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /Markeer als klaar|Mark as done/i }).click();

    await page.waitForURL(/\/shutdown(\?from=last-task|$)/, { timeout: 15_000 });
    await expect(page.getByText("Dagafsluiting")).toBeVisible({ timeout: 10_000 });
  });
});
