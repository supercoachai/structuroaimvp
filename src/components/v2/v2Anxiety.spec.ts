import { describe, expect, it } from "vitest";

import { v2IsAnxietyTitle } from "./v2Anxiety";

describe("v2IsAnxietyTitle", () => {
  it("herkent zware onderwerpen voor Mag later soft-label", () => {
    expect(v2IsAnxietyTitle("Belastingaangifte doen")).toBe(true);
    expect(v2IsAnxietyTitle("Incasso mail")).toBe(true);
    expect(v2IsAnxietyTitle("Mail beantwoorden")).toBe(false);
  });
});
