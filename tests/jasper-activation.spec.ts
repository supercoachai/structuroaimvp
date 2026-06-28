import { test, expect, type Page } from "@playwright/test";

/**
 * Jasper-activatie-funnel, headless tegen lokale dev.
 * Doel: runtime-bewijs dat een podcast-luisteraar van /jasper vloeiend de funnel
 * doorloopt en dat de gerepareerde routing-lek (vuile re-entry -> /registreren i.p.v.
 * de app invallen) klopt. Echte account-aanmaak (OAuth/e-mail) is niet headless te
 * reproduceren en wordt door unit tests gedekt.
 *
 * App-keys:
 * - structuro_local_mode (cookie): anonieme local-mode sessie
 * - structuro_onboarding_completed_local + _version_local (localStorage): onboarding klaar
 * - structuro_jasper_attribution (localStorage): Jasper-bezoek gemarkeerd
 */
const COMPLETED_KEY = "structuro_onboarding_completed_local";
const VERSION_KEY = "structuro_onboarding_version_local";
const NAME_KEY = "structuro_user_name";
const JASPER_LS_KEY = "structuro_jasper_attribution";
const LOCAL_MODE_COOKIE = "structuro_local_mode";

function ctaLink(page: Page) {
  // Desktop en mobiel renderen elk een CTA; pak de zichtbare (de andere is hidden).
  return page.locator('a[href="/onboarding"]').filter({ visible: true }).first();
}

async function clickCtaWhenHydrated(page: Page) {
  const cta = ctaLink(page);
  await expect(cta).toBeVisible({ timeout: 15_000 });
  await page.waitForLoadState("load").catch(() => {});
  await page.waitForTimeout(2500);
  await cta.click();
}

test.describe("Jasper-activatie-funnel", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("(a) verse Jasper-bezoeker: /jasper CTA -> /onboarding + local-mode cookie + jasper-attributie", async ({
    page,
    context,
  }) => {
    await page.goto("/jasper", { waitUntil: "domcontentloaded" });
    // Schone start: wis eventuele eerdere voortgang, herlaad zodat /jasper de
    // attributie vers zet (sessionStorage + localStorage-flag).
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        /* ignore */
      }
    });
    await page.goto("/jasper", { waitUntil: "domcontentloaded" });

    await clickCtaWhenHydrated(page);

    await page.waitForURL(/\/onboarding(\/|\?|$)/, {
      timeout: 20_000,
      waitUntil: "commit",
    });
    expect(page.url()).toMatch(/\/onboarding/);

    const cookies = await context.cookies();
    const localMode = cookies.find((c) => c.name === LOCAL_MODE_COOKIE);
    expect(localMode?.value).toBe("1");

    const jasperFlag = await page.evaluate(
      (k) => localStorage.getItem(k),
      JASPER_LS_KEY
    );
    expect(jasperFlag).toBe("1");
  });

  test("(b) vuile re-entry: afgeronde onboarding + Jasper-attributie -> /registreren, NIET de app", async ({
    page,
    context,
  }) => {
    // Reproduceer exact het gerapporteerde scenario: de luisteraar deed eerder al
    // de eerste dagstart (onboarding completed) en opent de flow opnieuw.
    await context.addCookies([
      {
        name: LOCAL_MODE_COOKIE,
        value: "1",
        url: "http://127.0.0.1:3000",
      },
    ]);
    await page.addInitScript(
      ({ completedKey, versionKey, nameKey, jasperKey }) => {
        try {
          localStorage.setItem(completedKey, "1");
          localStorage.setItem(versionKey, "999");
          localStorage.setItem(nameKey, "TestNaam");
          localStorage.setItem(jasperKey, "1");
          sessionStorage.setItem("signup_source", "jasper_podcast");
          sessionStorage.setItem("signup_utm_campaign", "jasper_podcast");
        } catch {
          /* ignore */
        }
      },
      {
        completedKey: COMPLETED_KEY,
        versionKey: VERSION_KEY,
        nameKey: NAME_KEY,
        jasperKey: JASPER_LS_KEY,
      }
    );

    await page.goto("/onboarding", { waitUntil: "commit" });

    // De redirect-effect moet naar /registreren sturen, niet de app (/).
    await page.waitForURL(/\/registreren(\/|\?|$)/, {
      timeout: 20_000,
      waitUntil: "commit",
    });
    expect(page.url()).toMatch(/\/registreren/);
    expect(new URL(page.url()).pathname).not.toBe("/");

    // De "Bewaar je dagstart"-variant met de juiste copy moet renderen.
    await expect(
      page.getByText("Bewaar je dagstart", { exact: false })
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByText("Registreer een gratis account om je dagstart te bewaren", {
        exact: false,
      })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("(c) echte account-aanmaak (dev e-mail): landt in de app, GEEN tweede dagstart, GEEN proeftijd-banner", async ({
    page,
    context,
  }) => {
    // De anonieme Jasper-luisteraar deed de eerste dagstart en maakt nu een account.
    // In dev geeft e-mail/wachtwoord direct een sessie (passwordless dev-fallback),
    // dus de volledige post-account routing is hier wel headless te verifieren.
    await context.addCookies([
      { name: LOCAL_MODE_COOKIE, value: "1", url: "http://127.0.0.1:3000" },
    ]);
    await page.addInitScript(
      ({ completedKey, versionKey, nameKey, jasperKey }) => {
        try {
          localStorage.setItem(completedKey, "1");
          localStorage.setItem(versionKey, "999");
          localStorage.setItem(nameKey, "TestNaam");
          localStorage.setItem(jasperKey, "1");
          sessionStorage.setItem("signup_source", "jasper_podcast");
          sessionStorage.setItem("signup_utm_campaign", "jasper_podcast");
        } catch {
          /* ignore */
        }
      },
      {
        completedKey: COMPLETED_KEY,
        versionKey: VERSION_KEY,
        nameKey: NAME_KEY,
        jasperKey: JASPER_LS_KEY,
      }
    );

    await page.goto(
      "/registreren?source=jasper_podcast&utm_source=jasper_podcast&utm_campaign=jasper_podcast",
      { waitUntil: "domcontentloaded" }
    );

    // Open de e-mail-fallback en maak een account aan met een uniek e-mailadres.
    const emailToggle = page.getByRole("button", {
      name: "Geen Google of Microsoft? Account met e-mail",
    });
    await expect(emailToggle).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1500);
    await emailToggle.click();

    const uniqueEmail = `jasper-e2e-${Date.now()}@example.com`;
    await page.locator("#signup-email").fill(uniqueEmail);
    await page.locator("#signup-password").fill("Test12345!");
    await page.getByRole("button", { name: "Account aanmaken" }).click();

    // Verwacht: de app op "/", niet de dagstart, niet de paywall.
    await page.waitForURL((url) => url.pathname === "/", {
      timeout: 30_000,
      waitUntil: "commit",
    });
    expect(new URL(page.url()).pathname).toBe("/");

    // Geen tweede dagstart-overlay en geen proeftijd-banner voor Jasper.
    await page.waitForTimeout(2500);
    await expect(page.getByText("Hoe is je energie?")).toHaveCount(0);
    await expect(page.getByText("gratis proeftijd")).toHaveCount(0);
  });
});
