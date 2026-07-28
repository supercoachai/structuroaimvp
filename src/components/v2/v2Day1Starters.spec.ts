import { describe, expect, it } from "vitest";

import {
  V2_DAY1_STARTER_IDS,
  v2Day1StarterSuggestions,
  v2FindThingBankItemById,
} from "./v2ThingBank";

describe("V2 day-1 starters", () => {
  it("heeft 10 ids die in de bank bestaan", () => {
    expect(V2_DAY1_STARTER_IDS).toHaveLength(10);
    for (const id of V2_DAY1_STARTER_IDS) {
      expect(v2FindThingBankItemById(id), id).toBeTruthy();
    }
  });

  it("geeft NL-titels voor low, met water/frisse neus in de set", () => {
    const titles = v2Day1StarterSuggestions("low", "nl").map((s) => s.title);
    expect(titles).toContain("Eén glas water pakken");
    expect(titles).toContain("Twee minuten frisse neus");
    expect(titles).toContain("Schouders losschudden");
    expect(titles.length).toBe(10);
  });

  it("zet low-items vooraan bij low energie", () => {
    const starters = v2Day1StarterSuggestions("low", "nl", "seed-a");
    expect(starters[0]?.energy).toBe("low");
  });
});
