import { describe, expect, it } from "vitest";

import { addUniqueDagstartThing, normalizeDagstartCustomThing } from "./v2Things";

describe("dagstart eigen taak", () => {
  it("normaliseert spaties en knipt te lange titels", () => {
    expect(normalizeDagstartCustomThing("  Mail   baas  ")).toBe("Mail baas");
    expect(normalizeDagstartCustomThing("x".repeat(300)).length).toBe(280);
  });

  it("voegt een eigen taak toe tot het energiemaximum", () => {
    expect(addUniqueDagstartThing([], "Bel tandarts", 1)).toEqual(["Bel tandarts"]);
    expect(addUniqueDagstartThing(["Bel tandarts"], "Bel tandarts", 2)).toEqual([
      "Bel tandarts",
    ]);
    expect(addUniqueDagstartThing(["Eén"], "Twee", 1)).toEqual(["Eén"]);
    expect(addUniqueDagstartThing(["Eén"], "ab", 2)).toEqual(["Eén", "ab"]);
    expect(addUniqueDagstartThing([], "x", 3)).toEqual([]);
  });
});
