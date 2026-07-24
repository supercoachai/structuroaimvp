import { describe, expect, it } from "vitest";

import { collectWins } from "./v2ShutdownWins";
import type { V2Task } from "./v2Tasks";

function task(partial: Partial<V2Task> & { title: string }): V2Task {
  return {
    id: partial.id ?? "t1",
    title: partial.title,
    done: partial.done ?? false,
    dueDate: null,
    repeat: "none",
    repeatIntervalDays: null,
    priority: null,
    energy: partial.energy ?? "medium",
    microSteps: partial.microSteps ?? [],
    why: null,
    outcome: null,
    snoozeUntil: null,
    durationBucket: null,
    createdAt: partial.createdAt ?? "2026-01-01T00:00:00.000Z",
  };
}

describe("collectWins", () => {
  it("lists only completed parent tasks, not micro-steps", () => {
    const tasks = [
      task({
        id: "a",
        title: "Eén pagina schrijven",
        done: true,
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
    ];

    expect(collectWins(tasks)).toEqual([
      { id: "a", label: "Eén pagina schrijven", energy: "high" },
    ]);
  });

  it("skips blank titles", () => {
    expect(collectWins([task({ title: "   ", done: true })])).toEqual([]);
  });
});
