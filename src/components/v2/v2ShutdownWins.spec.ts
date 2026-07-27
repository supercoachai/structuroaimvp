import { describe, expect, it } from "vitest";

import { collectWins } from "./v2ShutdownWins";
import { emptyDraft, type V2Task } from "./v2Tasks";

function task(partial: Partial<V2Task> & { title: string }): V2Task {
  return {
    ...emptyDraft(),
    ...partial,
    title: partial.title,
  };
}

describe("collectWins", () => {
  it("lists only parent tasks completed today, not micro-steps", () => {
    const today = "2026-07-27";
    const tasks = [
      task({
        id: "a",
        title: "Eén pagina schrijven",
        done: true,
        completedDate: today,
        energy: "high",
        microSteps: [
          { id: "m1", title: "Document openen", done: true },
          { id: "m2", title: "Schrijven zonder editen", done: true },
          { id: "m3", title: "Stoppen bij één pagina", done: true },
        ],
      }),
      task({
        id: "b",
        title: "Open micro-parent",
        done: false,
        microSteps: [{ id: "m4", title: "Halve micro", done: true }],
      }),
      task({
        id: "c",
        title: "Gisteren klaar",
        done: true,
        completedDate: "2026-07-26",
        energy: "low",
      }),
    ];

    expect(collectWins(tasks, today)).toEqual([
      { id: "a", label: "Eén pagina schrijven", energy: "high" },
    ]);
  });

  it("skips blank titles", () => {
    expect(
      collectWins(
        [task({ title: "   ", done: true, completedDate: "2026-07-27" })],
        "2026-07-27",
      ),
    ).toEqual([]);
  });
});
