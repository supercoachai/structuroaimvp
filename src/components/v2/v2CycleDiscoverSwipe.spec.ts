import { describe, expect, it } from "vitest";

import {
  CYCLE_DISCOVER_SWIPE_CLOSE_PX,
  CYCLE_DISCOVER_SWIPE_OPEN_PX,
  isCycleDiscoverDragSlopExceeded,
  shouldCloseCycleDiscoverFromSwipe,
  shouldOpenCycleDiscoverFromSwipe,
} from "./v2CycleDiscoverSwipe";

describe("v2CycleDiscoverSwipe", () => {
  it("opent bij swipe omhoog voorbij drempel", () => {
    expect(shouldOpenCycleDiscoverFromSwipe(-CYCLE_DISCOVER_SWIPE_OPEN_PX)).toBe(
      true,
    );
    expect(
      shouldOpenCycleDiscoverFromSwipe(-(CYCLE_DISCOVER_SWIPE_OPEN_PX + 10)),
    ).toBe(true);
  });

  it("opent niet bij kleine omhoog-beweging of omlaag", () => {
    expect(
      shouldOpenCycleDiscoverFromSwipe(-(CYCLE_DISCOVER_SWIPE_OPEN_PX - 1)),
    ).toBe(false);
    expect(shouldOpenCycleDiscoverFromSwipe(40)).toBe(false);
    expect(shouldOpenCycleDiscoverFromSwipe(0)).toBe(false);
  });

  it("sluit bij swipe omlaag voorbij drempel", () => {
    expect(
      shouldCloseCycleDiscoverFromSwipe(CYCLE_DISCOVER_SWIPE_CLOSE_PX),
    ).toBe(true);
    expect(
      shouldCloseCycleDiscoverFromSwipe(CYCLE_DISCOVER_SWIPE_CLOSE_PX + 20),
    ).toBe(true);
  });

  it("sluit niet bij kleine omlaag-beweging of omhoog", () => {
    expect(
      shouldCloseCycleDiscoverFromSwipe(CYCLE_DISCOVER_SWIPE_CLOSE_PX - 1),
    ).toBe(false);
    expect(shouldCloseCycleDiscoverFromSwipe(-40)).toBe(false);
  });

  it("herkent drag-slop", () => {
    expect(isCycleDiscoverDragSlopExceeded(8)).toBe(true);
    expect(isCycleDiscoverDragSlopExceeded(7)).toBe(false);
  });
});
