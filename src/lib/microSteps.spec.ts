import { describe, expect, it } from "vitest";
import { normalizeMicroSteps, visibleMicroSteps } from "./microSteps";

describe("normalizeMicroSteps", () => {
  it("geeft lege array bij niet-array input", () => {
    expect(normalizeMicroSteps(null)).toEqual([]);
    expect(normalizeMicroSteps(undefined)).toEqual([]);
    expect(normalizeMicroSteps("x")).toEqual([]);
  });

  it("zet legacy string[] om naar MicroStep[]", () => {
    const result = normalizeMicroSteps(["Stap een", "Stap twee"]);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("Stap een");
    expect(result[0].done).toBe(false);
  });

  it("ontdubbelt identieke ids", () => {
    const result = normalizeMicroSteps([
      { id: "x", title: "A" },
      { id: "x", title: "B" },
    ]);
    const ids = result.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("filtert lege titels weg", () => {
    const result = normalizeMicroSteps([
      { id: "1", title: "Echt" },
      { id: "2", title: "   " },
    ]);
    expect(result).toHaveLength(1);
  });

  it("normaliseert minutes en difficulty", () => {
    const result = normalizeMicroSteps([
      { id: "1", title: "A", duration: "15", energyLevel: "high" },
    ]);
    expect(result[0].minutes).toBe(15);
    expect(result[0].difficulty).toBe("high");
  });
});

describe("visibleMicroSteps", () => {
  it("toont alleen stappen met een zichtbare titel", () => {
    const steps = normalizeMicroSteps([
      { id: "1", title: "Zichtbaar" },
      { id: "2", title: "Ook zichtbaar" },
    ]);
    expect(visibleMicroSteps(steps)).toHaveLength(2);
  });
});
