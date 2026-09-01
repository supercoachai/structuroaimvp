import { describe, expect, it } from "vitest";

import { formatV2HomeClock, formatV2HomeDateLabel } from "./v2HomeDate";

describe("formatV2HomeDateLabel", () => {
  it("zet Nederlandse datum met hoofdletter", () => {
    const d = new Date("2026-09-01T12:00:00+02:00");
    expect(formatV2HomeDateLabel(d, "nl")).toBe("Dinsdag 1 september");
  });

  it("zet Engelse datum met hoofdletter", () => {
    const d = new Date("2026-09-01T12:00:00+02:00");
    expect(formatV2HomeDateLabel(d, "en")).toBe("Tuesday 1 September");
  });
});

describe("formatV2HomeClock", () => {
  it("toont 24-uurs klok", () => {
    expect(formatV2HomeClock("2026-09-01T21:40:00+02:00", "nl")).toBe("21:40");
  });

  it("negeert ongeldige timestamps", () => {
    expect(formatV2HomeClock("niet-een-datum", "nl")).toBeNull();
    expect(formatV2HomeClock(null, "nl")).toBeNull();
  });
});
