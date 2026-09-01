import { afterEach, describe, expect, it, vi } from "vitest";

import {
  V2_DONE_ACK_FADE_MS,
  V2_DONE_ACK_FOCUS_MS,
  V2_DONE_ACK_LINGER_MS,
  V2_DONE_ACK_REDUCED_MS,
  v2DoneAckFadeMs,
  v2DoneAckFocusMs,
  v2DoneAckLingerMs,
} from "./v2DoneAck";

function stubMotion(reduce: boolean) {
  vi.stubGlobal("window", {
    matchMedia: (query: string) => ({
      matches: reduce && query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
}

describe("v2DoneAck timings", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("geeft een korte linger zonder reduced motion", () => {
    stubMotion(false);
    expect(v2DoneAckLingerMs()).toBe(V2_DONE_ACK_LINGER_MS);
    expect(v2DoneAckFadeMs()).toBe(V2_DONE_ACK_FADE_MS);
    expect(v2DoneAckFocusMs()).toBe(V2_DONE_ACK_FOCUS_MS);
  });

  it("houdt een korte rust bij prefers-reduced-motion, zonder fade", () => {
    stubMotion(true);
    expect(v2DoneAckLingerMs()).toBe(V2_DONE_ACK_REDUCED_MS);
    expect(v2DoneAckFadeMs()).toBe(0);
    expect(v2DoneAckFocusMs()).toBe(V2_DONE_ACK_REDUCED_MS);
  });
});
