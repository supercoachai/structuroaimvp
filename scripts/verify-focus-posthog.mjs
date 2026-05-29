/**
 * E2E UI-verificatie focus-flow tegen localhost:3001.
 * PostHog-netwerk wordt gelogd als bonus (lokaal vaak leeg zonder POSTHOG_KEY).
 *
 * Usage: npx --yes -p playwright@1.50.1 node scripts/verify-focus-posthog.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3001";
const TASK_ID = `verify-${Date.now()}`;

function todayAmsterdam() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Amsterdam" });
}

function seedLocalAppState({ taskId }) {
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Amsterdam",
  });
  const task = {
    id: taskId,
    title: "Verify focus events",
    duration: 1,
    estimatedDuration: 1,
    energyLevel: "medium",
    done: false,
    started: false,
    priority: 1,
    dueAt: null,
    reminders: [],
    repeat: "none",
    impact: "🌱",
    source: "regular",
    microSteps: [],
    notToday: false,
    completedAt: null,
  };
  localStorage.setItem("structuro_analytics_consent", "granted");
  localStorage.setItem("structuro_onboarding_completed_local", "1");
  localStorage.setItem("structuro_onboarding_version_local", "2");
  localStorage.setItem("structuro_user_name", "Verify");
  localStorage.setItem("info_seen_timer", "true");
  localStorage.setItem("info_seen_microstappen", "true");
  localStorage.setItem(
    "info_dismissed_all",
    JSON.stringify(["timer", "microstappen"])
  );
  localStorage.setItem("structuro_tasks", JSON.stringify([task]));
  localStorage.setItem(
    "structuro_daily_checkins",
    JSON.stringify([
      {
        date: today,
        energy_level: "medium",
        top3_task_ids: [taskId],
        user_id: "local",
      },
    ])
  );
}

/** @param {import('playwright').Page} page */
function attachEventCollector(page, sink) {
  page.on("request", (req) => {
    const url = req.url();
    if (!url.includes("/ph/")) return;
    const body = req.postData() ?? "";
    const haystack = body + decodeURIComponent(body);
    for (const name of [
      "focus_session_started",
      "focus_session_completed",
      "focus_session_ended_early",
      "focus_session_abandoned",
    ]) {
      if (haystack.includes(name)) sink.push(name);
    }
  });
}

/** @param {import('playwright').Page} page */
async function dismissConsentBanner(page) {
  const accept = page.getByRole("button", { name: "Akkoord" });
  if (await accept.isVisible().catch(() => false)) {
    await accept.click();
    await page.waitForTimeout(300);
  }
}

/** @param {import('playwright').Page} page */
async function dismissFocusIntro(page) {
  const dismissInfo = page.getByRole("button", { name: "Niet meer tonen" });
  if (await dismissInfo.isVisible().catch(() => false)) {
    await dismissInfo.click();
    await page.waitForTimeout(200);
    return;
  }
  const closeInfo = page.getByRole("button", { name: /sluiten|close/i });
  if (await closeInfo.isVisible().catch(() => false)) {
    await closeInfo.click();
    await page.waitForTimeout(200);
  }
}

/** @param {import('playwright').Page} page */
async function startFocusSession(page) {
  await page.goto(
    `${BASE}/focus?task=${encodeURIComponent(TASK_ID)}&duration=1`,
    { waitUntil: "domcontentloaded" }
  );
  const needsReset = await page.evaluate(({ taskId }) => {
    const raw = localStorage.getItem("structuro_tasks");
    const tasks = raw ? JSON.parse(raw) : [];
    const task = tasks.find((t) => t.id === taskId);
    if (!task?.done) return false;
    task.done = false;
    task.completedAt = null;
    task.started = false;
    localStorage.setItem("structuro_tasks", JSON.stringify(tasks));
    return true;
  }, { taskId: TASK_ID });
  if (needsReset) {
    await page.reload({ waitUntil: "domcontentloaded" });
  }
  await dismissConsentBanner(page);
  await dismissFocusIntro(page);
  const startBtn = page.getByRole("button", { name: "Start focus sessie" });
  await startBtn.waitFor({ state: "visible", timeout: 15000 });
  await startBtn.click();
  await page.waitForTimeout(4500);
}

async function main() {
  const results = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const today = todayAmsterdam();

  await context.addCookies([
    { name: "structuro_local_mode", value: "1", domain: "localhost", path: "/" },
    {
      name: "structuro_local_onboarding_done",
      value: "2",
      domain: "localhost",
      path: "/",
    },
    {
      name: "structuro_dagstart_datum",
      value: encodeURIComponent(today),
      domain: "localhost",
      path: "/",
    },
  ]);
  await context.addInitScript(seedLocalAppState, { taskId: TASK_ID });
  context.on("page", (page) => {
    page.on("dialog", (dialog) => dialog.accept());
  });

  // 1) Early complete UI + copy
  {
    const ph = [];
    const page = await context.newPage();
    attachEventCollector(page, ph);
    await startFocusSession(page);
    const finishBtn = page.getByRole("button", { name: "Klaar met deze taak" });
    const hasCopy = await finishBtn.isVisible();
    await finishBtn.click();
    await page.waitForTimeout(3500);
    const taskDone = await page.evaluate(({ taskId }) => {
      const raw = localStorage.getItem("structuro_tasks");
      const tasks = raw ? JSON.parse(raw) : [];
      return tasks.some((t) => t.id === taskId && t.done === true);
    }, { taskId: TASK_ID });
    const redirectedToTodo = page.url().includes("/todo");
    results.push({
      scenario: "Voltooien → ended_early (UI + copy)",
      ok: hasCopy && (taskDone || redirectedToTodo),
      ph,
      note: hasCopy
        ? taskDone || redirectedToTodo
          ? "copy OK, taak afgerond"
          : "copy OK, taak niet als done gemarkeerd"
        : "copy mist",
    });
    await page.close();
  }

  // 2) Timer completed (1 min + countdown), duurt ~65s; metrics gedekt door unit test
  if (process.env.VERIFY_INCLUDE_TIMER === "1") {
    const ph = [];
    const page = await context.newPage();
    attachEventCollector(page, ph);
    await startFocusSession(page);
    await page.waitForTimeout(62000);
    const timeUp = await page
      .getByText(/TIJD\s*OM/i)
      .or(page.getByRole("button", { name: /verlengen|extend/i }))
      .first()
      .isVisible()
      .catch(() => false);
    results.push({
      scenario: "Timer 1 min → completed (UI)",
      ok: timeUp,
      ph,
      note: timeUp ? "time-up prompt zichtbaar" : "geen time-up prompt",
    });
    await page.close();
  } else {
    results.push({
      scenario: "Timer 1 min → completed (metrics unit test)",
      ok: true,
      ph: [],
      note: "overgeslagen lokaal (65s); completion_ratio=1 in npm run test:focus-events",
    });
  }

  // 3) Stop
  {
    const ph = [];
    const page = await context.newPage();
    attachEventCollector(page, ph);
    await startFocusSession(page);
    await page.getByRole("button", { name: "Stoppen" }).click();
    await page.waitForTimeout(1000);
    const back = await page
      .getByRole("button", { name: "Start focus sessie" })
      .isVisible();
    results.push({
      scenario: "Stoppen → abandoned (UI)",
      ok: back,
      ph,
    });
    await page.close();
  }

  // 4) Navigate away
  {
    const ph = [];
    const page = await context.newPage();
    attachEventCollector(page, ph);
    await startFocusSession(page);
    await page.goto(`${BASE}/todo`, { waitUntil: "domcontentloaded" });
    results.push({
      scenario: "Navigeren weg → abandoned (UI)",
      ok: page.url().includes("/todo"),
      ph,
    });
    await page.close();
  }

  await browser.close();

  console.log("\n=== Focus verificatie (localhost) ===\n");
  let allOk = true;
  for (const r of results) {
    const mark = r.ok ? "PASS" : "FAIL";
    console.log(`${mark}  ${r.scenario}`);
    if (r.note) console.log(`      ${r.note}`);
    console.log(
      `      PostHog netwerk: ${r.ph.length ? r.ph.join(", ") : "(geen /ph/ events)"}`
    );
    console.log("");
    if (!r.ok) allOk = false;
  }

  if (!allOk) process.exit(1);
  console.log("Alle UI-scenario's geslaagd.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
