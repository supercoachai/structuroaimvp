import { describe, expect, it } from "vitest";

import { v2IsAnxietyTitle } from "./v2Anxiety";
import { v2DefaultMicroTitlesForThing } from "./v2MicroDefaults";
import {
  V2_THING_BANK,
  v2FindThingBankItemByTitle,
  v2LocalizedSuggestions,
  v2SeededShuffle,
  v2ThingBankStats,
} from "./v2ThingBank";

describe("v2ThingBank", () => {
  it("heeft 100 NL/EN items met microstappen", () => {
    const stats = v2ThingBankStats();
    expect(stats.total).toBe(100);
    expect(stats.low).toBe(40);
    expect(stats.enough).toBe(35);
    expect(stats.high).toBe(25);
    expect(V2_THING_BANK).toHaveLength(100);
    for (const item of V2_THING_BANK) {
      expect(item.title.nl.trim().length).toBeGreaterThan(0);
      expect(item.title.en.trim().length).toBeGreaterThan(0);
      expect(item.microSteps.nl.length).toBeGreaterThanOrEqual(2);
      expect(item.microSteps.en.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("heeft unieke ids", () => {
    const ids = V2_THING_BANK.map((i) => i.id);
    expect(new Set(ids).size).toBe(100);
  });

  it("vindt items op NL- en EN-titel", () => {
    expect(v2FindThingBankItemByTitle("Eén glas water pakken")?.id).toBe(
      "glass-of-water",
    );
    expect(v2FindThingBankItemByTitle("Grab a glass of water")?.id).toBe(
      "glass-of-water",
    );
  });

  it("geeft Engelse low-suggesties", () => {
    const titles = v2LocalizedSuggestions("low", "en").map((s) => s.title);
    expect(titles).toContain("Grab a glass of water");
    expect(titles.length).toBe(40);
  });

  it("seeded shuffle is stabiel per seed", () => {
    const a = v2SeededShuffle([1, 2, 3, 4, 5], "2026-07-22|low|en");
    const b = v2SeededShuffle([1, 2, 3, 4, 5], "2026-07-22|low|en");
    const c = v2SeededShuffle([1, 2, 3, 4, 5], "2026-07-23|low|en");
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it("day-seed verandert volgorde van suggesties", () => {
    const dayA = v2LocalizedSuggestions("low", "nl", "day-a").map((s) => s.title);
    const dayB = v2LocalizedSuggestions("low", "nl", "day-b").map((s) => s.title);
    expect(dayA).toHaveLength(40);
    expect(dayB).toHaveLength(40);
    expect(dayA).not.toEqual(dayB);
  });
});

describe("v2DefaultMicroTitlesForThing via bank", () => {
  it("geeft Engelse microstappen voor EN-titel", () => {
    const steps = v2DefaultMicroTitlesForThing("Start that one project", "en");
    expect(steps[0]).toBe("Open the project");
  });
});

describe("v2IsAnxietyTitle", () => {
  it("herkent NL en EN zware onderwerpen", () => {
    expect(v2IsAnxietyTitle("Belastingaangifte doen")).toBe(true);
    expect(v2IsAnxietyTitle("Tax return")).toBe(true);
    expect(v2IsAnxietyTitle("Mail beantwoorden")).toBe(false);
  });
});
