import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  advanceV2DoneQuote,
  pickV2DoneQuote,
  takeNextV2DoneQuote,
  V2_DONE_QUOTE_INDEX_KEY,
  V2_DONE_QUOTES_EN,
  V2_DONE_QUOTES_NL,
} from "./v2DoneQuotes";

function unique(list: readonly string[]): string[] {
  return [...new Set(list)];
}

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

  it("heeft 200 unieke zinnen per taal, zonder em-dash", () => {
    expect(V2_DONE_QUOTES_NL).toHaveLength(200);
    expect(V2_DONE_QUOTES_EN).toHaveLength(200);
    expect(unique(V2_DONE_QUOTES_NL)).toHaveLength(200);
    expect(unique(V2_DONE_QUOTES_EN)).toHaveLength(200);
    expect(V2_DONE_QUOTES_NL.every((q) => q.trim().length > 0)).toBe(true);
    expect(V2_DONE_QUOTES_EN.every((q) => q.trim().length > 0)).toBe(true);
    expect(V2_DONE_QUOTES_NL.every((q) => !q.includes("\u2014"))).toBe(true);
    expect(V2_DONE_QUOTES_EN.every((q) => !q.includes("\u2014"))).toBe(true);
  });

  it("rouleert cyclisch en slaat de index persistent op", () => {
    const first = takeNextV2DoneQuote("nl");
    const second = takeNextV2DoneQuote("nl");
    expect(first).toBe(pickV2DoneQuote("nl", 0));
    expect(second).toBe(pickV2DoneQuote("nl", 1));
    expect(first).not.toBe(second);
    expect(window.localStorage.getItem(V2_DONE_QUOTE_INDEX_KEY)).toBe("2");
  });

  it("wrapt na de laatste zin weer naar de eerste", () => {
    const n = V2_DONE_QUOTES_NL.length;
    window.localStorage.setItem(V2_DONE_QUOTE_INDEX_KEY, String(n - 1));
    const last = takeNextV2DoneQuote("nl");
    const wrapped = takeNextV2DoneQuote("nl");
    expect(last).toBe(pickV2DoneQuote("nl", n - 1));
    expect(wrapped).toBe(pickV2DoneQuote("nl", 0));
    expect(wrapped).not.toBe(last);
    expect(window.localStorage.getItem(V2_DONE_QUOTE_INDEX_KEY)).toBe(String(n + 1));
  });

  it("geeft nooit twee keer dezelfde zin achter elkaar, inclusief wrap", () => {
    const seen: string[] = [];
    const n = V2_DONE_QUOTES_NL.length;
    for (let i = 0; i < n + 1; i += 1) {
      seen.push(takeNextV2DoneQuote("nl"));
    }
    for (let i = 1; i < seen.length; i += 1) {
      expect(seen[i]).not.toBe(seen[i - 1]);
    }
    expect(seen[n]).toBe(seen[0]);
  });

  it("mag herhalen als de lijst één item is", () => {
    const list = ["Alleen dit."] as const;
    const first = advanceV2DoneQuote(list, 0);
    const second = advanceV2DoneQuote(list, first.nextIndex);
    expect(first.quote).toBe("Alleen dit.");
    expect(second.quote).toBe("Alleen dit.");
    expect(second.nextIndex).toBe(2);
  });

  it("slaat een directe herhaling over bij dubbele buren", () => {
    const list = ["A", "A", "B"] as const;
    const first = advanceV2DoneQuote(list, 0);
    expect(first.quote).toBe("A");
    const second = advanceV2DoneQuote(list, first.nextIndex);
    expect(second.quote).toBe("B");
    expect(second.quote).not.toBe(first.quote);
  });
});
