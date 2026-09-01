import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clearV2ShutdownInPlace,
  hasV2ShutdownInPlace,
  isLastDagstartThing,
  markV2ShutdownInPlace,
  v2ShutdownFromLastTask,
  v2ShutdownHref,
} from "./v2LastTaskShutdown";

describe("isLastDagstartThing", () => {
  it("is true when the only planned thing is completed", () => {
    expect(isLastDagstartThing(["Ritalin innemen"], "Ritalin innemen")).toBe(
      true,
    );
  });

  it("treats a case-insensitive title as the last remaining thing", () => {
    expect(isLastDagstartThing(["  Water  "], "water")).toBe(true);
  });

  it("is false when another planned thing remains", () => {
    expect(isLastDagstartThing(["Mail", "Water"], "Mail")).toBe(false);
  });

  it("is false when the title is not in the daystart plan", () => {
    expect(isLastDagstartThing(["Mail"], "Belastingaangifte")).toBe(false);
  });

  it("is false on an empty plan", () => {
    expect(isLastDagstartThing([], "Mail")).toBe(false);
  });

  it("is false when completing a leftover todo that is not in the plan", () => {
    expect(isLastDagstartThing(["Mail"], "Losse taak")).toBe(false);
  });
});

describe("v2 last-task shutdown routing", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses /shutdown?from=last-task outside /v2", () => {
    vi.stubGlobal("window", { location: { pathname: "/", search: "" } });
    expect(v2ShutdownHref()).toBe("/shutdown?from=last-task");
  });

  it("uses /v2/shutdown?from=last-task on v2 paths", () => {
    vi.stubGlobal("window", { location: { pathname: "/v2/focus", search: "" } });
    expect(v2ShutdownHref()).toBe("/v2/shutdown?from=last-task");
  });

  it("reads from=last-task from the query", () => {
    vi.stubGlobal("window", {
      location: { pathname: "/shutdown", search: "?from=last-task" },
    });
    expect(v2ShutdownFromLastTask()).toBe(true);
  });
});

describe("v2 last-task in-place flag", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubSession() {
    const store = new Map<string, string>();
    const sessionStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, String(v));
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    };
    vi.stubGlobal("window", { sessionStorage });
    vi.stubGlobal("sessionStorage", sessionStorage);
  }

  it("marks, reads and clears the in-place flag", () => {
    stubSession();
    expect(hasV2ShutdownInPlace()).toBe(false);
    markV2ShutdownInPlace();
    expect(hasV2ShutdownInPlace()).toBe(true);
    clearV2ShutdownInPlace();
    expect(hasV2ShutdownInPlace()).toBe(false);
  });
});
