import { beforeEach, describe, expect, it, vi } from "vitest";

import { WELCOME_TASK_TITLE } from "@/lib/onboardingWelcomeTask";

import {
  buildOnboardingThingsWithCompanions,
  getOwnTaskExamples,
  getWelcomeTaskContent,
  isWelcomeTaskTitle,
  persistOnboardingOwnTask,
  v2EnergyToAiLevel,
} from "./v2OnboardingOwnTask";
import { loadV2Tasks, V2_TASKS_KEY } from "./v2Tasks";

vi.mock("./v2Things", async () => {
  const actual = await vi.importActual<typeof import("./v2Things")>("./v2Things");
  return {
    ...actual,
    v2StructuroThingPicks: vi.fn(
      (_energy: unknown, maxSlots: number) =>
        [
          "Companion A",
          "Companion B",
          "Companion C",
          WELCOME_TASK_TITLE,
          "Mijn eigen taak",
        ].slice(0, Math.max(maxSlots, 5)),
    ),
  };
});

function installStorage() {
  const store = new Map<string, string>();
  const localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  };
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("window", { localStorage });
  return store;
}

describe("v2OnboardingOwnTask", () => {
  beforeEach(() => {
    installStorage();
    vi.clearAllMocks();
  });

  it("welcome content volgt locale", () => {
    expect(getWelcomeTaskContent("nl").title).toBe(WELCOME_TASK_TITLE);
    expect(getWelcomeTaskContent("en").title.toLowerCase()).toContain("cancel");
    expect(isWelcomeTaskTitle(WELCOME_TASK_TITLE, "nl")).toBe(true);
    expect(isWelcomeTaskTitle("Abonnement opzeggen", "nl")).toBe(true);
  });

  it("own-task voorbeelden: 3 kaarten met elk 4 microstappen", () => {
    const nl = getOwnTaskExamples("nl");
    expect(nl).toHaveLength(3);
    expect(nl[0]?.id).toBe("cancel");
    expect(nl.every((e) => e.microSteps.length === 4)).toBe(true);
    expect(nl[1]?.title.toLowerCase()).toContain("mail");
  });

  it("low energy: alleen eigen taak", () => {
    expect(
      buildOnboardingThingsWithCompanions("Mijn eigen taak", "low", "nl"),
    ).toEqual(["Mijn eigen taak"]);
  });

  it("enough/high: companions zonder eigen/welkomst-titel", () => {
    expect(
      buildOnboardingThingsWithCompanions("Mijn eigen taak", "enough", "nl"),
    ).toEqual(["Mijn eigen taak", "Companion A"]);
    expect(
      buildOnboardingThingsWithCompanions("Mijn eigen taak", "high", "nl"),
    ).toEqual(["Mijn eigen taak", "Companion A", "Companion B"]);
  });

  it("persistOnboardingOwnTask schrijft microstappen", () => {
    const id = persistOnboardingOwnTask({
      title: "Mail beantwoorden",
      microStepTitles: ["Open inbox", "Schrijf antwoord", "Verstuur", "Check"],
      energy: "enough",
    });
    expect(id).toBeTruthy();
    const tasks = loadV2Tasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe("Mail beantwoorden");
    expect(tasks[0].energy).toBe("medium");
    expect(tasks[0].microSteps.map((s) => s.title)).toEqual([
      "Open inbox",
      "Schrijf antwoord",
      "Verstuur",
      "Check",
    ]);
    expect(localStorage.getItem(V2_TASKS_KEY)).toContain("Mail beantwoorden");
  });

  it("mapt energie naar AI-level", () => {
    expect(v2EnergyToAiLevel("low")).toBe("low");
    expect(v2EnergyToAiLevel("enough")).toBe("medium");
    expect(v2EnergyToAiLevel("high")).toBe("high");
  });
});
