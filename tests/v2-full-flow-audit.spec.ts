import { test, expect, type Page, type ConsoleMessage } from "@playwright/test";

/**
 * Volledige v2-flow audit (2 rondes) tegen lokale dev (:3000).
 * Focus: ADHD-frictie, smooth transitions, conversiebrug naar /registreren.
 * Forceert NL via ?lang=nl (Playwright-browser is vaak EN).
 */

type Finding = { severity: "bug" | "friction" | "ok"; where: string; detail: string };

const ENERGY = {
  Laag: /^(Laag|Low)$/,
  Genoeg: /^(Genoeg|Okay)$/,
  Hoog: /^(Hoog|High)$/,
} as const;

async function clearV2(page: Page) {
  await page.goto("/v2?lang=nl", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  // Herlaad zodat locale-bootstrap opnieuw NL zet.
  await page.goto("/v2?lang=nl", { waitUntil: "domcontentloaded" });
}

async function runOnboarding(
  page: Page,
  energy: keyof typeof ENERGY,
  opts?: { adjust?: boolean; cycle?: boolean },
) {
  await page.goto("/v2/onboarding?lang=nl", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: /Hoe zit je energie|How is your energy/i }),
  ).toBeVisible({ timeout: 15_000 });

  // Force NL alleen als EN actief is (geen nodeloze klik op pressed NL).
  const enBtn = page.getByRole("button", { name: /English/i });
  if ((await enBtn.getAttribute("aria-pressed")) === "true") {
    await page.getByRole("button", { name: /Nederlands/i }).click();
    await expect(page.getByRole("heading", { name: /Hoe zit je energie/i })).toBeVisible();
  }

  if (opts?.cycle) {
    const hint = page.getByRole("button", {
      name: /Meer over cyclus meenemen|More about including your cycle/i,
    });
    await expect(hint).toBeVisible({ timeout: 10_000 });
    // Geen top Zonder/Cyclus-toggle meer
    await expect(page.getByRole("group", { name: /Cyclus-modus|Cycle mode/i })).toHaveCount(0);
    await hint.click();
    await expect(
      page.getByRole("heading", { name: /Je cyclus meenemen\?|Include your cycle\?/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Ja, meenemen|Yes, include it/i }).click();
  }

  const energyBtn = page.getByRole("button", { name: ENERGY[energy] });
  await expect(energyBtn).toBeVisible();
  await energyBtn.click();
  await expect(energyBtn).toHaveAttribute("aria-pressed", "true", { timeout: 10_000 });
  await expect(
    page.getByRole("button", { name: /Dit is goed|This looks good/i }),
  ).toBeVisible({ timeout: 10_000 });

  if (opts?.adjust) {
    await page.getByRole("button", { name: /Zelf aanpassen|Choose myself/i }).click();
    const confirm = page
      .getByRole("button", { name: /Dit kies ik|This is my pick|Dit is goed|This looks good/i })
      .first();
    await expect(confirm).toBeVisible({ timeout: 10_000 });
    // Als disabled (0 selectie), skip.
    if (await confirm.isDisabled()) {
      await page.getByRole("button", { name: /Niks kiezen|Pick nothing/i }).click();
    } else {
      await confirm.click();
    }
  } else {
    await page.getByRole("button", { name: /Dit is goed|This looks good/i }).click();
  }

  await expect(
    page.getByRole("button", { name: /Naar je dag|To your day/i }),
  ).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: /Naar je dag|To your day/i }).click();

  // Guest: soft account-save (Google / e-mail) na eerste onboarding.
  const accountSave = page.getByRole("button", {
    name: /Doorgaan met Google|Continue with Google/i,
  });
  const accountVisible = await accountSave
    .isVisible({ timeout: 8_000 })
    .catch(() => false);
  if (accountVisible) {
    await page.getByRole("button", { name: /Niet nu|Not now/i }).click();
  }

  await expect(page).toHaveURL(/\/v2\/home/, { timeout: 15_000 });
}

async function completeOneFocus(page: Page) {
  const start = page.getByRole("button", { name: /Start focus/i });
  await expect(start).toBeVisible({ timeout: 15_000 });
  const later = page.getByRole("button", { name: /^(Later|Not now)$/i });
  if (await later.isVisible().catch(() => false)) {
    await later.click();
  }
  await start.click();
  await expect(page).toHaveURL(/\/v2\/focus/, { timeout: 15_000 });
  await page.getByRole("button", { name: /Start focus/i }).click();
  await expect(page.getByRole("button", { name: /Pauze|Pause/i })).toBeVisible({
    timeout: 10_000,
  });
  await page.getByRole("button", { name: /Afronden|Finish|Done/i }).click();
  await expect(page.getByRole("button", { name: /Ik ben klaar|I('|’)m done|I'm done/i })).toBeVisible({
    timeout: 10_000,
  });
  await page.getByRole("button", { name: /Ik ben klaar|I('|’)m done|I'm done/i }).click();
  await expect(page).toHaveURL(/\/v2\/home/, { timeout: 15_000 });
}

function collectConsole(page: Page, bag: string[]) {
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() === "error") bag.push(msg.text());
  });
  page.on("pageerror", (err) => bag.push(String(err)));
}

test.describe("V2 full flow audit ×2", () => {
  test.setTimeout(180_000);

  test("ronde 1: onboarding genoeg → focus → account CTA → surfaces", async ({
    page,
  }) => {
    const findings: Finding[] = [];
    const errors: string[] = [];
    collectConsole(page, errors);
    await clearV2(page);

    await page.goto("/v2?lang=nl", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: /Start de reis|Start the journey/i })).toBeVisible();

    await runOnboarding(page, "Genoeg");

    // Guest: geen Uitloggen
    const logout = page.getByRole("button", { name: /Uitloggen|Log out|Logout/i });
    if (await logout.isVisible().catch(() => false)) {
      findings.push({
        severity: "bug",
        where: "home header",
        detail: "Uitloggen zichtbaar voor guest zonder account",
      });
    } else {
      findings.push({
        severity: "ok",
        where: "home header",
        detail: "Geen logout voor guest",
      });
    }

    // Shutdown-nudge is geen home-kaart meer (21:30 notificatie i.p.v. sticky card)
    const shutdownNudge = page.getByText(/dag is nog open|day is still open/i);
    if (await shutdownNudge.isVisible().catch(() => false)) {
      findings.push({
        severity: "bug",
        where: "home",
        detail: "Shutdown-nudge home-kaart nog zichtbaar",
      });
    } else {
      findings.push({
        severity: "ok",
        where: "home",
        detail: "Geen shutdown-nudge home-kaart",
      });
    }

    // Soft account-CTA op home is verwijderd (account-save zit in onboarding)
    const accountEarly = page.getByRole("link", { name: /Bewaar met Google|Save with Google/i });
    if (await accountEarly.isVisible().catch(() => false)) {
      findings.push({
        severity: "bug",
        where: "home",
        detail: "Account-CTA zichtbaar op home",
      });
    }

    await completeOneFocus(page);

    const account = page.getByRole("link", { name: /Bewaar met Google|Save with Google/i });
    if (await account.isVisible().catch(() => false)) {
      findings.push({
        severity: "bug",
        where: "account CTA",
        detail: "Home soft account-CTA nog zichtbaar na focus",
      });
    } else {
      findings.push({
        severity: "ok",
        where: "account CTA",
        detail: "Geen soft account-CTA op home na focus",
      });
    }

    for (const path of [
      "/v2/dump",
      "/v2/todo",
      "/v2/settings",
      "/v2/abonnement",
      "/v2/shutdown",
      "/v2/dagstart",
      "/v2/install",
      "/v2/login",
    ] as const) {
      await page.goto(`${path}?lang=nl`, { waitUntil: "domcontentloaded" });
      await expect(page.locator("body")).toBeVisible();
      const title = await page.title();
      if (/404|Error/i.test(title)) {
        findings.push({ severity: "bug", where: path, detail: `Title: ${title}` });
      } else {
        findings.push({ severity: "ok", where: path, detail: `Loaded: ${title}` });
      }
    }

    await page.goto("/v2/abonnement?lang=nl", { waitUntil: "domcontentloaded" });
    const trialCta = page.getByRole("button", { name: /Start 3 dagen gratis/i });
    await expect(trialCta).toBeVisible({ timeout: 10_000 });
    findings.push({
      severity: "ok",
      where: "abonnement",
      detail: "Primary guest CTA: Start 3 dagen gratis",
    });

    await page.goto(
      "/registreren?from=v2&utm_source=structuro_eu&utm_campaign=eu_v2&utm_medium=organic&utm_content=audit&lang=nl",
      { waitUntil: "domcontentloaded" },
    );
    await expect(page.locator("body")).toBeVisible();
    findings.push({
      severity: "ok",
      where: "/registreren",
      detail: `Title: ${await page.title()}`,
    });

    // eslint-disable-next-line no-console
    console.log("FINDINGS_R1", JSON.stringify({ findings, errors: errors.slice(0, 20) }));

    const bugs = findings.filter((f) => f.severity === "bug");
    expect(bugs, JSON.stringify(bugs, null, 2)).toEqual([]);
  });

  test("ronde 2: laag+adjust, hoog happy, dagstart, empty home", async ({ page }) => {
    const findings: Finding[] = [];
    const errors: string[] = [];
    collectConsole(page, errors);

    await clearV2(page);
    await runOnboarding(page, "Laag", { adjust: true });
    await expect(page.getByText(/Energie:\s*laag/i)).toBeVisible({ timeout: 10_000 });
    findings.push({ severity: "ok", where: "onboarding laag+adjust", detail: "Home bereikt" });

    await clearV2(page);
    await runOnboarding(page, "Hoog", { cycle: true });
    await expect(page.getByText(/Energie:\s*hoog/i)).toBeVisible({ timeout: 10_000 });
    const thingsCount = await page.evaluate(() => {
      try {
        return (JSON.parse(localStorage.getItem("v2_journey") || "{}").things || []).length;
      } catch {
        return -1;
      }
    });
    if (thingsCount !== 3) {
      findings.push({
        severity: "bug",
        where: "hoog energy",
        detail: `Verwacht 3 things, kreeg ${thingsCount}`,
      });
    } else {
      findings.push({ severity: "ok", where: "hoog energy", detail: "3 things" });
    }

    await page.goto("/v2/dagstart?lang=nl", { waitUntil: "networkidle" });
    await expect(
      page.getByRole("heading", { name: /Hoe zit je energie|How is your energy/i }),
    ).toBeVisible({ timeout: 15_000 });
    const cycleToggle = page.getByRole("group", { name: /Cyclus-modus|Cycle mode/i });
    if (await cycleToggle.isVisible().catch(() => false)) {
      findings.push({
        severity: "friction",
        where: "dagstart",
        detail: "Cyclus-toggle zichtbaar op dagstart (verwacht alleen soft discovery op guest-onboarding)",
      });
    }
    const cycleDiscover = page.getByRole("button", {
      name: /Meer over cyclus meenemen|More about including your cycle/i,
    });
    if (await cycleDiscover.isVisible().catch(() => false)) {
      findings.push({
        severity: "friction",
        where: "dagstart",
        detail: "Cyclus-discovery zichtbaar op dagstart (verwacht alleen guest-onboarding)",
      });
    }
    const genoeg = page.getByRole("button", { name: ENERGY.Genoeg });
    await genoeg.click();
    await expect(genoeg).toHaveAttribute("aria-pressed", "true", { timeout: 10_000 });
    await page.getByRole("button", { name: /Dit is goed|This looks good/i }).click();
    await expect(
      page.getByRole("button", { name: /Naar je dag|To your day/i }),
    ).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /Naar je dag|To your day/i }).click();
    await expect(page).toHaveURL(/\/v2\/home/, { timeout: 15_000 });
    findings.push({ severity: "ok", where: "dagstart", detail: "Door naar home" });

    await clearV2(page);
    await page.goto("/v2/onboarding?lang=nl", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: /Stoppen|Stop/i })).toBeVisible();
    findings.push({ severity: "ok", where: "onboarding stop", detail: "Stoppen-link aanwezig" });

    await page.evaluate(() => {
      const j = JSON.parse(localStorage.getItem("v2_journey") || "{}");
      j.things = [];
      j.energy = null;
      localStorage.setItem("v2_journey", JSON.stringify(j));
    });
    await page.goto("/v2/home?lang=nl", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("button", { name: /Doe je dagstart|Start your day/i }),
    ).toBeVisible({ timeout: 10_000 });
    findings.push({ severity: "ok", where: "home empty", detail: "Empty-state CTA aanwezig" });

    // eslint-disable-next-line no-console
    console.log("FINDINGS_R2", JSON.stringify({ findings, errors: errors.slice(0, 8) }));

    const bugs = findings.filter((f) => f.severity === "bug");
    expect(bugs, JSON.stringify(bugs, null, 2)).toEqual([]);
  });
});
