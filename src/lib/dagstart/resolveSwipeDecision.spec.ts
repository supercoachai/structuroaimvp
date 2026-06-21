import { describe, expect, it } from "vitest";

import type { DagstartTaskCard } from "@/components/dagstart/design/types";

import { resolveSwipeDecision } from "./resolveSwipeDecision";

function card(id: string, deadline: string | null = null): DagstartTaskCard {
  return {
    id,
    title: id,
    appEnergy: "medium",
    energy: "normaal",
    minutes: 15,
    dueAt: deadline ? "2026-05-26T12:00:00Z" : null,
    deadline,
    overdue: false,
  };
}

describe("resolveSwipeDecision", () => {
  it("skip is altijd applied", () => {
    expect(
      resolveSwipeDecision({
        action: "skip",
        task: card("a"),
        keptIds: ["b", "c"],
        maxSlots: 2,
        extraDeadlineSlots: 0,
      })
    ).toBe("applied");
  });

  it("onbekende taak is blocked", () => {
    expect(
      resolveSwipeDecision({
        action: "keep",
        task: undefined,
        keptIds: [],
        maxSlots: 2,
        extraDeadlineSlots: 0,
      })
    ).toBe("blocked");
  });

  it("keep binnen de limiet is applied", () => {
    expect(
      resolveSwipeDecision({
        action: "keep",
        task: card("a"),
        keptIds: [],
        maxSlots: 2,
        extraDeadlineSlots: 0,
      })
    ).toBe("applied");
  });

  it("reeds gekozen taak is applied", () => {
    expect(
      resolveSwipeDecision({
        action: "keep",
        task: card("a"),
        keptIds: ["a"],
        maxSlots: 2,
        extraDeadlineSlots: 0,
      })
    ).toBe("applied");
  });

  it("slots vol zonder deadline is blocked", () => {
    expect(
      resolveSwipeDecision({
        action: "keep",
        task: card("c"),
        keptIds: ["a", "b"],
        maxSlots: 2,
        extraDeadlineSlots: 0,
      })
    ).toBe("blocked");
  });

  it("deadline boven de limiet is pending", () => {
    expect(
      resolveSwipeDecision({
        action: "keep",
        task: card("c", "Vandaag"),
        keptIds: ["a", "b"],
        maxSlots: 2,
        extraDeadlineSlots: 0,
      })
    ).toBe("pending");
  });

  it("reeds gekozen deadline blijft applied, ook boven de limiet", () => {
    expect(
      resolveSwipeDecision({
        action: "keep",
        task: card("a", "Vandaag"),
        keptIds: ["a", "b", "c"],
        maxSlots: 2,
        extraDeadlineSlots: 0,
      })
    ).toBe("applied");
  });
});
