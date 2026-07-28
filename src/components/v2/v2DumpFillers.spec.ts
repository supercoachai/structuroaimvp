import { describe, expect, it } from "vitest";

import {
  isFillerOnlyItem,
  prepareDumpItems,
  stripSpeechFillers,
} from "./v2DumpFillers";
import { prepareDumpItems as prepareViaSplit, splitDumpList } from "./v2DumpSplit";

describe("stripSpeechFillers", () => {
  it("strips NL hesitation sounds from a list", () => {
    expect(stripSpeechFillers("uh boodschappen en uhm was en ehm auto")).toBe(
      "boodschappen en was en auto",
    );
  });

  it("strips EN hesitation sounds", () => {
    expect(stripSpeechFillers("um milk and uh bread and hmm eggs")).toBe(
      "milk and bread and eggs",
    );
  });

  it("strips thinking phrases", () => {
    expect(stripSpeechFillers("even denken was doen")).toBe("was doen");
    expect(stripSpeechFillers("wait a second call the dentist")).toBe("call the dentist");
    expect(stripSpeechFillers("zeg maar de was")).toBe("de was");
    expect(stripSpeechFillers("you know buy milk")).toBe("buy milk");
  });

  it("keeps real short tasks", () => {
    expect(stripSpeechFillers("was")).toBe("was");
    expect(stripSpeechFillers("mail")).toBe("mail");
    expect(stripSpeechFillers("auto")).toBe("auto");
  });
});

describe("isFillerOnlyItem", () => {
  it("flags NL alone fillers and sounds", () => {
    expect(isFillerOnlyItem("uh")).toBe(true);
    expect(isFillerOnlyItem("uhm")).toBe(true);
    expect(isFillerOnlyItem("ehm")).toBe(true);
    expect(isFillerOnlyItem("hmm")).toBe(true);
    expect(isFillerOnlyItem("mmm")).toBe(true);
    expect(isFillerOnlyItem("ja")).toBe(true);
    expect(isFillerOnlyItem("nee")).toBe(true);
    expect(isFillerOnlyItem("oké")).toBe(true);
    expect(isFillerOnlyItem("oke")).toBe(true);
    expect(isFillerOnlyItem("nou")).toBe(true);
    expect(isFillerOnlyItem("dus")).toBe(true);
    expect(isFillerOnlyItem("eigenlijk")).toBe(true);
    expect(isFillerOnlyItem("even denken")).toBe(true);
    expect(isFillerOnlyItem("wacht even")).toBe(true);
    expect(isFillerOnlyItem("hoe heet het")).toBe(true);
    expect(isFillerOnlyItem("zeg maar")).toBe(true);
  });

  it("flags EN alone fillers", () => {
    expect(isFillerOnlyItem("uh")).toBe(true);
    expect(isFillerOnlyItem("um")).toBe(true);
    expect(isFillerOnlyItem("yeah")).toBe(true);
    expect(isFillerOnlyItem("yep")).toBe(true);
    expect(isFillerOnlyItem("okay")).toBe(true);
    expect(isFillerOnlyItem("so")).toBe(true);
    expect(isFillerOnlyItem("like")).toBe(true);
    expect(isFillerOnlyItem("wait")).toBe(true);
    expect(isFillerOnlyItem("you know")).toBe(true);
    expect(isFillerOnlyItem("I mean")).toBe(true);
    expect(isFillerOnlyItem("let me think")).toBe(true);
    expect(isFillerOnlyItem("what's it called")).toBe(true);
  });

  it("does not flag real short tasks", () => {
    expect(isFillerOnlyItem("was")).toBe(false);
    expect(isFillerOnlyItem("mail")).toBe(false);
    expect(isFillerOnlyItem("Bel mama")).toBe(false);
    expect(isFillerOnlyItem("buy milk")).toBe(false);
  });
});

describe("prepareDumpItems", () => {
  it("drops filler-only pieces from a spoken NL list", () => {
    expect(
      prepareViaSplit(
        "uh boodschappen doen en uhm was doen en ehm auto ophalen en ja en dokter bellen",
      ),
    ).toEqual([
      "boodschappen doen",
      "was doen",
      "auto ophalen",
      "dokter bellen",
    ]);
  });

  it("drops filler-only pieces from a spoken EN list", () => {
    expect(
      prepareViaSplit(
        "um buy milk and uh call dentist and like and walk the dog and yeah",
      ),
    ).toEqual(["buy milk", "call dentist", "walk the dog"]);
  });

  it("returns empty when the whole utterance is fillers", () => {
    expect(prepareViaSplit("uh uhm ehm")).toEqual([]);
    expect(prepareViaSplit("even nadenken")).toEqual([]);
    expect(prepareViaSplit("let me think")).toEqual([]);
    expect(prepareViaSplit("ja")).toEqual([]);
  });

  it("keeps a single real thought with leading filler", () => {
    expect(prepareViaSplit("uh Bel mama vandaag")).toEqual(["Bel mama vandaag"]);
  });

  it("uses injected splitter in the low-level helper", () => {
    expect(prepareDumpItems("uh was, auto, melk", splitDumpList)).toEqual([
      "was",
      "auto",
      "melk",
    ]);
  });
});
