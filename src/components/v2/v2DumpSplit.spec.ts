import { describe, expect, it } from "vitest";

import { splitDumpList } from "./v2DumpSplit";

describe("splitDumpList", () => {
  it("returns empty for blank input", () => {
    expect(splitDumpList("")).toEqual([]);
    expect(splitDumpList("   ")).toEqual([]);
  });

  it("keeps a single thought intact", () => {
    expect(splitDumpList("Bel mama vandaag")).toEqual(["Bel mama vandaag"]);
  });

  it("keeps a two-item en-pair as one thought (use comma for two)", () => {
    expect(splitDumpList("was en auto")).toEqual(["was en auto"]);
    expect(splitDumpList("was, auto")).toEqual(["was", "auto"]);
  });

  it("keeps 'X en zeg dat…' as one thought", () => {
    expect(splitDumpList("Bel mama en zeg dat ik later kom")).toEqual([
      "Bel mama en zeg dat ik later kom",
    ]);
  });

  it("splits a spoken Dutch en-chain of short tasks", () => {
    expect(
      splitDumpList(
        "boodschappen doen en was doen en auto ophalen en dokter bellen en tuin water geven",
      ),
    ).toEqual([
      "boodschappen doen",
      "was doen",
      "auto ophalen",
      "dokter bellen",
      "tuin water geven",
    ]);
  });

  it("splits a long spoken list like 15 short items", () => {
    const spoken =
      "melk en brood en eieren en wasmiddel en postzegels en apotheek en garage en kapper en belasting en verzekering en sporttas en cadeau en planten water en vuilnis en stofzuigen";
    const parts = splitDumpList(spoken);
    expect(parts).toHaveLength(15);
    expect(parts[0]).toBe("melk");
    expect(parts[14]).toBe("stofzuigen");
  });

  it("splits comma lists and Oxford en/and", () => {
    expect(splitDumpList("was, auto, en boodschappen")).toEqual([
      "was",
      "auto",
      "boodschappen",
    ]);
    expect(splitDumpList("laundry, car, and groceries")).toEqual([
      "laundry",
      "car",
      "groceries",
    ]);
  });

  it("splits newlines and semicolons", () => {
    expect(splitDumpList("was doen\nauto ophalen\nboodschappen")).toEqual([
      "was doen",
      "auto ophalen",
      "boodschappen",
    ]);
    expect(splitDumpList("was; auto; boodschappen")).toEqual([
      "was",
      "auto",
      "boodschappen",
    ]);
  });

  it("splits numbered and bullet lists", () => {
    expect(splitDumpList("1. was 2. auto 3. boodschappen")).toEqual([
      "was",
      "auto",
      "boodschappen",
    ]);
    expect(splitDumpList("• was\n• auto\n• boodschappen")).toEqual([
      "was",
      "auto",
      "boodschappen",
    ]);
    expect(splitDumpList("- melk\n- brood\n- eieren")).toEqual([
      "melk",
      "brood",
      "eieren",
    ]);
  });

  it("splits spoken ordinals", () => {
    expect(
      splitDumpList("ten eerste was doen ten tweede auto ophalen ten derde boodschappen"),
    ).toEqual(["was doen", "auto ophalen", "boodschappen"]);
    expect(splitDumpList("first laundry second car third groceries")).toEqual([
      "laundry",
      "car",
      "groceries",
    ]);
  });

  it("splits English and-chains", () => {
    expect(
      splitDumpList("buy milk and call dentist and pick up kids and walk the dog"),
    ).toEqual(["buy milk", "call dentist", "pick up kids", "walk the dog"]);
  });

  it("splits dan/then chains with 3+ parts", () => {
    expect(splitDumpList("eerst was dan auto dan boodschappen")).toEqual([
      "eerst was",
      "auto",
      "boodschappen",
    ]);
  });

  it("does not split 'beter dan gisteren' (two-part dan)", () => {
    expect(splitDumpList("vandaag beter dan gisteren")).toEqual([
      "vandaag beter dan gisteren",
    ]);
  });

  it("does not over-split a narrative sentence with one en", () => {
    expect(
      splitDumpList("Ik moet nog even rustig nadenken over het gesprek van gisteren en morgen"),
    ).toEqual([
      "Ik moet nog even rustig nadenken over het gesprek van gisteren en morgen",
    ]);
  });

  it("strips trailing punctuation from items", () => {
    expect(splitDumpList("was., auto.; boodschappen!")).toEqual([
      "was",
      "auto",
      "boodschappen!",
    ]);
  });

  it("dedupes consecutive identical items", () => {
    expect(splitDumpList("was en was en auto")).toEqual(["was", "auto"]);
  });
});
