import { describe, expect, it } from "vitest";

import { v2ActiveMicroStepIndex, v2EnergyToMicro } from "./v2FocusMicro";

describe("v2FocusMicro", () => {
  it("mapt journey-energie naar micro AI-energie", () => {
    expect(v2EnergyToMicro("low")).toBe("low");
    expect(v2EnergyToMicro("enough")).toBe("medium");
    expect(v2EnergyToMicro("high")).toBe("high");
    expect(v2EnergyToMicro(null)).toBeNull();
  });

  it("vindt de actieve microstap-index", () => {
    expect(v2ActiveMicroStepIndex([])).toBe(0);
    expect(
      v2ActiveMicroStepIndex([
        { id: "a", title: "A", done: true },
        { id: "b", title: "B", done: false },
        { id: "c", title: "C", done: false },
      ]),
    ).toBe(1);
    expect(
      v2ActiveMicroStepIndex([
        { id: "a", title: "A", done: true },
        { id: "b", title: "B", done: true },
      ]),
    ).toBe(2);
  });
});
