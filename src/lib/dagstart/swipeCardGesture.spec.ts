import { describe, expect, it } from "vitest";
import {
  SWIPE_COMMIT_THRESHOLD,
  applySwipePointerMove,
  resolveSwipeCommit,
  shouldIgnoreSwipePointerDown,
  swipeActivationPx,
} from "./swipeCardGesture";

describe("swipeCardGesture", () => {
  it("gebruikt lagere activatiedrempel voor touch dan muis", () => {
    expect(swipeActivationPx("touch")).toBeLessThan(swipeActivationPx("mouse"));
  });

  it("negeert pointerdown op actieknoppen", () => {
    const card = { closest: () => null };
    const buttonChild = {
      closest: (sel: string) => (sel === "button" ? buttonChild : null),
    };
    expect(shouldIgnoreSwipePointerDown(buttonChild as unknown as EventTarget)).toBe(
      true
    );
    expect(shouldIgnoreSwipePointerDown(card as unknown as EventTarget)).toBe(false);
    expect(shouldIgnoreSwipePointerDown(null)).toBe(true);
  });

  it("activeert touch-drag na drempel en commit bij voldoende offset", () => {
    const base = {
      x: 0,
      active: false,
      startX: 100,
      pointerType: "touch" as const,
    };
    const below = applySwipePointerMove(base, 104, 0);
    expect(below).not.toBe("reset");
    if (below === "reset") return;
    expect(below.isDragging).toBe(false);

    const active = applySwipePointerMove(base, 108, 0);
    if (active === "reset") throw new Error("unexpected reset");
    expect(active.isDragging).toBe(true);
    expect(active.dragX).toBe(8);

    expect(resolveSwipeCommit(SWIPE_COMMIT_THRESHOLD + 1, false)).toBe("keep");
    expect(resolveSwipeCommit(-SWIPE_COMMIT_THRESHOLD - 1, false)).toBe("skip");
    expect(resolveSwipeCommit(20, false)).toBe("snap");
    expect(resolveSwipeCommit(SWIPE_COMMIT_THRESHOLD + 1, true)).toBe("blocked");
  });
});
