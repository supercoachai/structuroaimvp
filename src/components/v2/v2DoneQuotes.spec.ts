import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  pickV2DoneQuote,
  takeNextV2DoneQuote,
  V2_DONE_QUOTE_INDEX_KEY,
  V2_DONE_QUOTES_EN,
  V2_DONE_QUOTES_NL,
} from "./v2DoneQuotes";

describe("v2DoneQuotes", () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
      },
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("heeft 100 zinnen per taal, zonder em-dash", () => {
    expect(V2_DONE_QUOTES_NL).toHaveLength(100);
    expect(V2_DONE_QUOTES_EN).toHaveLength(100);
    expect(V2_DONE_QUOTES_NL.every((q) => !q.includes("\u2014"))).toBe(true);
    expect(V2_DONE_QUOTES_EN.every((q) => !q.includes("\u2014"))).toBe(true);
  });

  it("rouleert en slaat de index op", () => {
    const first = takeNextV2DoneQuote("nl");
    const second = takeNextV2DoneQuote("nl");
    expect(first).toBe(pickV2DoneQuote("nl", 0));
    expect(second).toBe(pickV2DoneQuote("nl", 1));
    expect(window.localStorage.getItem(V2_DONE_QUOTE_INDEX_KEY)).toBe("2");
  });
});
