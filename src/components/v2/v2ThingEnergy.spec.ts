import { describe, expect, it } from "vitest";

import {
  v2DayEnergyToTask,
  v2EnergyMeta,
  v2TaskEnergyToDay,
} from "./v2EnergyMeta";
import { v2FindThingBankItemByTitle } from "./v2ThingBank";

describe("v2EnergyMeta mapping", () => {
  it("maps task energy to day energy", () => {
    expect(v2TaskEnergyToDay("low")).toBe("low");
    expect(v2TaskEnergyToDay("medium")).toBe("enough");
    expect(v2TaskEnergyToDay("high")).toBe("high");
    expect(v2TaskEnergyToDay(null)).toBeNull();
  });

  it("maps day energy to task energy", () => {
    expect(v2DayEnergyToTask("low")).toBe("low");
    expect(v2DayEnergyToTask("enough")).toBe("medium");
    expect(v2DayEnergyToTask("high")).toBe("high");
    expect(v2DayEnergyToTask(null)).toBeNull();
  });

  it("returns battery meta levels 1–3", () => {
    expect(v2EnergyMeta("low")?.level).toBe(1);
    expect(v2EnergyMeta("enough")?.level).toBe(2);
    expect(v2EnergyMeta("high")?.level).toBe(3);
    expect(v2EnergyMeta(null)).toBeNull();
  });
});

describe("thing bank energy lookup", () => {
  it("finds energy for known NL titles", () => {
    expect(v2FindThingBankItemByTitle("Eén glas water pakken")?.energy).toBe(
      "low",
    );
  });

  it("returns undefined for unknown titles", () => {
    expect(v2FindThingBankItemByTitle("Onbekende vrije titel xyz")).toBeUndefined();
  });
});
