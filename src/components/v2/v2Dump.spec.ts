import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  V2_DUMP_KEY,
  V2_DUMP_MAX,
  V2_DUMP_SOFT_WARN,
  addV2DumpItem,
  addV2DumpItems,
  isV2DumpVoiceItem,
  loadV2Dump,
  v2DumpAtMax,
  v2DumpCount,
  v2DumpLatestItem,
  v2DumpPreviewItems,
  v2DumpSoftWarn,
  type V2DumpItem,
} from "./v2Dump";
import { prepareDumpItems } from "./v2DumpSplit";

function item(partial: Partial<V2DumpItem> & { content: string }): V2DumpItem {
  return {
    id: partial.id ?? `dump-${partial.content}`,
    content: partial.content,
    createdAt: partial.createdAt ?? "2026-07-27T10:00:00.000Z",
    disposition: partial.disposition ?? null,
  };
}

describe("v2Dump limits", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("caps visible dump items at 15", () => {
    expect(V2_DUMP_MAX).toBe(15);
    expect(V2_DUMP_SOFT_WARN).toBe(12);

    let items: V2DumpItem[] = [];
    for (let i = 0; i < 20; i += 1) {
      items = addV2DumpItem(`gedachte ${i}`, items);
    }
    expect(v2DumpCount(items)).toBe(15);
    expect(v2DumpAtMax(items)).toBe(true);
    expect(v2DumpSoftWarn(items)).toBe(true);
  });

  it("does not count today-disposition toward the max", () => {
    const items = Array.from({ length: 14 }, (_, i) =>
      item({ id: `a-${i}`, content: `open ${i}` }),
    ).concat(item({ id: "today-1", content: "al vandaag", disposition: "today" }));

    expect(v2DumpCount(items)).toBe(14);
    expect(v2DumpAtMax(items)).toBe(false);
    const next = addV2DumpItem("nog één", items);
    expect(v2DumpCount(next)).toBe(15);
    expect(v2DumpAtMax(next)).toBe(true);
  });

  it("finds the latest dump item", () => {
    const older = item({
      id: "old",
      content: "oud",
      createdAt: "2026-07-27T09:00:00.000Z",
    });
    const newer = item({
      id: "new",
      content: "nieuw",
      createdAt: "2026-07-27T11:00:00.000Z",
    });
    expect(v2DumpLatestItem([older, newer])?.id).toBe("new");
    expect(v2DumpLatestItem([])).toBeNull();
  });

  it("adds multiple split items and truncates at max", () => {
    const existing = Array.from({ length: 13 }, (_, i) =>
      item({ id: `e-${i}`, content: `bestond ${i}` }),
    );
    const pieces = prepareDumpItems("was en auto en boodschappen en tuin");
    expect(pieces).toHaveLength(4);

    const result = addV2DumpItems(pieces, existing);
    expect(result.added).toBe(2);
    expect(result.truncated).toBe(2);
    expect(result.attempted).toBe(4);
    expect(v2DumpCount(result.items)).toBe(V2_DUMP_MAX);
    expect(result.items.map((i) => i.content).slice(-2)).toEqual(["was", "auto"]);
  });

  it("stores voice source on new items", () => {
    const next = addV2DumpItem("ingesproken", [], "voice");
    expect(next[0].source).toBe("voice");
    expect(isV2DumpVoiceItem(next[0])).toBe(true);
  });

  it("defaults typed source and preview shows newest two", () => {
    const a = item({
      id: "a",
      content: "oud",
      createdAt: "2026-07-27T09:00:00.000Z",
    });
    const b = item({
      id: "b",
      content: "mid",
      createdAt: "2026-07-27T10:00:00.000Z",
    });
    const c = item({
      id: "c",
      content: "nieuw",
      createdAt: "2026-07-27T11:00:00.000Z",
    });
    const typed = addV2DumpItem("getypt", [a, b, c]);
    expect(typed[typed.length - 1].source).toBe("text");
    expect(v2DumpPreviewItems([a, b, c]).map((i) => i.id)).toEqual(["c", "b"]);
  });

  it("preserves voice source from storage", () => {
    window.localStorage.setItem(
      V2_DUMP_KEY,
      JSON.stringify([
        {
          id: "d1",
          content: "hoi",
          createdAt: "2026-07-27T10:00:00.000Z",
          source: "voice",
        },
      ]),
    );
    const loaded = loadV2Dump();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].source).toBe("voice");
  });
});
