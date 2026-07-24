import { describe, expect, it } from "vitest";

import {
  compareV2TasksForList,
  completeV2TaskByTitle,
  emptyDraft,
  removeV2ThingFromList,
  type V2Task,
} from "./v2Tasks";

function task(partial: Partial<V2Task> & { title: string }): V2Task {
  return {
    ...emptyDraft(),
    ...partial,
    title: partial.title,
  };
}

describe("completeV2TaskByTitle", () => {
  it("marks matching open task done and completes microsteps", () => {
    const open = task({
      id: "t1",
      title: "Aan dat ene project beginnen",
      done: false,
      microSteps: [
        { id: "m1", title: "Open doc", done: false },
        { id: "m2", title: "Schrijf zin", done: true },
      ],
    });
    const next = completeV2TaskByTitle([open], "aan dat ene project beginnen");
    expect(next).toHaveLength(1);
    expect(next[0].done).toBe(true);
    expect(next[0].microSteps.every((s) => s.done)).toBe(true);
  });

  it("is a no-op when already done", () => {
    const done = task({ id: "t1", title: "Mail", done: true });
    const tasks = [done];
    const next = completeV2TaskByTitle(tasks, "Mail");
    expect(next).toBe(tasks);
  });

  it("creates a done task when title has no match", () => {
    const next = completeV2TaskByTitle([], "Nieuw ding");
    expect(next).toHaveLength(1);
    expect(next[0].title).toBe("Nieuw ding");
    expect(next[0].done).toBe(true);
  });
});

describe("removeV2ThingFromList", () => {
  it("removes the completed thing case-insensitively", () => {
    expect(
      removeV2ThingFromList(["Mail", "Water"], "mail"),
    ).toEqual(["Water"]);
  });

  it("returns empty when last thing is removed", () => {
    expect(removeV2ThingFromList(["Mail"], "Mail")).toEqual([]);
  });
});

describe("compareV2TasksForList", () => {
  it("sorts open by energy high → medium → low, then done last", () => {
    const low = task({ id: "1", title: "Laag", energy: "low", createdAt: "2026-01-01T00:00:00.000Z" });
    const high = task({ id: "2", title: "Hoog", energy: "high", createdAt: "2026-01-02T00:00:00.000Z" });
    const medium = task({
      id: "3",
      title: "Normaal",
      energy: "medium",
      createdAt: "2026-01-03T00:00:00.000Z",
    });
    const doneHigh = task({
      id: "4",
      title: "Klaar",
      energy: "high",
      done: true,
      createdAt: "2026-01-04T00:00:00.000Z",
    });
    const none = task({
      id: "5",
      title: "Geen",
      energy: null,
      createdAt: "2026-01-05T00:00:00.000Z",
    });

    const sorted = [low, doneHigh, none, high, medium].sort(compareV2TasksForList);
    expect(sorted.map((t) => t.id)).toEqual(["2", "3", "1", "5", "4"]);
  });
});
