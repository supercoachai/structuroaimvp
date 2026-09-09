import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { emptyDraft } from "./v2Tasks";
import {
  dropOpenTasksWithTitle,
  forgetRemovedV2Things,
  isRemovedV2Thing,
  omitRemovedOpenV2Tasks,
  rememberRemovedV2Things,
  V2_REMOVED_THINGS_KEY,
} from "./v2RemovedThings";

function stubStorage() {
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
  return store;
}

describe("v2RemovedThings", () => {
  beforeEach(() => {
    stubStorage();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("onthoudt een verwijderde titel ook de volgende dag", () => {
    rememberRemovedV2Things(["💊 ritalin (10 mg)"], "2026-09-03");
    expect(isRemovedV2Thing("💊 Ritalin (10 mg)", "2026-09-03")).toBe(true);
    expect(isRemovedV2Thing("💊 ritalin (10 mg)", "2026-09-04")).toBe(true);
  });

  it("haalt alle open kopieën van een titel weg", () => {
    const a = { ...emptyDraft(), title: "Was ophangen" };
    const b = { ...emptyDraft(), title: "was ophangen" };
    const done = {
      ...emptyDraft(),
      title: "Was ophangen",
      done: true,
      completedDate: "2026-09-09",
    };
    const other = { ...emptyDraft(), title: "Mail" };
    expect(
      dropOpenTasksWithTitle([a, b, done, other], "Was ophangen").map((t) => t.id),
    ).toEqual([done.id, other.id]);
  });

  it("laat dagstart dezelfde titel opnieuw kiezen", () => {
    rememberRemovedV2Things(["Ritalin innemen"], "2026-09-03");
    forgetRemovedV2Things(["ritalin innemen"], "2026-09-03");
    expect(isRemovedV2Thing("Ritalin innemen", "2026-09-03")).toBe(false);
  });

  it("haalt open verwijderde rijen weg, houdt voltooide", () => {
    rememberRemovedV2Things(["Ritalin"], "2026-09-03");
    const open = { ...emptyDraft(), title: "Ritalin" };
    const done = {
      ...emptyDraft(),
      title: "Ritalin",
      done: true,
      completedDate: "2026-09-03",
    };
    const other = { ...emptyDraft(), title: "Was ophangen" };
    expect(
      omitRemovedOpenV2Tasks([open, done, other], "2026-09-03").map((t) => t.id),
    ).toEqual([done.id, other.id]);
  });

  it("schrijft naar localStorage", () => {
    rememberRemovedV2Things(["Mail"], "2026-09-03");
    const raw = window.localStorage.getItem(V2_REMOVED_THINGS_KEY);
    expect(raw).toContain("mail");
  });
});
