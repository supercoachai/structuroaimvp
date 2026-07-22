import { describe, expect, it } from "vitest";

import { v2DefaultMicroTitlesForThing } from "./v2MicroDefaults";

describe("v2DefaultMicroTitlesForThing", () => {
  it("geeft vaste stappen voor Structuro high-suggesties", () => {
    const steps = v2DefaultMicroTitlesForThing("Aan dat ene project beginnen");
    expect(steps.length).toBeGreaterThanOrEqual(2);
    expect(steps[0]).toMatch(/open/i);
  });

  it("geeft Engelse stappen voor EN-titel", () => {
    const steps = v2DefaultMicroTitlesForThing("Send that one email", "en");
    expect(steps[0]).toMatch(/open|start/i);
  });

  it("geeft generic fallback voor onbekende titel", () => {
    const steps = v2DefaultMicroTitlesForThing("Quantum fysica samenvatting");
    expect(steps).toHaveLength(3);
  });
});
