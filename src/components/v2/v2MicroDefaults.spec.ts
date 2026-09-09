import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { v2DefaultMicroTitlesForThing, ensureV2ThingsHaveTasks } from "./v2MicroDefaults";
import { rememberRemovedV2Things } from "./v2RemovedThings";
import { V2_TASKS_KEY } from "./v2Tasks";

describe("v2DefaultMicroTitlesForThing", () => {
  it("geeft vaste stappen voor Structuro high-suggesties", () => {
    const steps = v2DefaultMicroTitlesForThing("Aan dat ene project beginnen");
    expect(steps.length).toBeGreaterThanOrEqual(2);
    expect(steps[0]).toMatch(/open/i);
  });

  it("geeft Engelse stappen voor EN-titel", () => {
    const steps = v2DefaultMicroTitlesForThing("Send that one email", "en");
    expect(steps[0]).toMatch(/open|start/i);
  });

  it("geeft generic fallback voor onbekende titel", () => {
    const steps = v2DefaultMicroTitlesForThing("Quantum fysica samenvatting");
    expect(steps).toHaveLength(3);
  });
});

describe("ensureV2ThingsHaveTasks", () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
        removeItem: (k: string) => {
          delete store[k];
        },
      },
    });
    window.localStorage.setItem(V2_TASKS_KEY, "[]");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("zaait een verwijderde titel niet opnieuw", () => {
    rememberRemovedV2Things(["💊 ritalin (10 mg)"]);
    const tasks = ensureV2ThingsHaveTasks(["💊 ritalin (10 mg)", "Was ophangen"]);
    expect(tasks.map((t) => t.title)).toEqual(["Was ophangen"]);
  });
});
