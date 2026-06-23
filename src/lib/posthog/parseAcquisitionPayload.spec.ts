import { describe, expect, it } from "vitest";

import { parseAcquisitionEventPayload } from "./parseAcquisitionPayload";

const VISITOR_ID = "019ef600-b4cf-70b2-b5b8-a8960f546dbb";

describe("parseAcquisitionEventPayload", () => {
  it("accepteert lp_campaign en lp_hero velden", () => {
    const payload = parseAcquisitionEventPayload({
      visitor_id: VISITOR_ID,
      landing_path: "/tiktok",
      source: "tiktok",
      is_tiktok: true,
      has_ttclid: true,
      lp_campaign: "herkende",
      lp_hero: "A",
      lp_hero_source: "campaign-default",
    });

    expect(payload).toMatchObject({
      landing_path: "/tiktok",
      lp_campaign: "herkende",
      lp_hero: "A",
      lp_hero_source: "campaign-default",
    });
  });

  it("weigert ongeldige visitor_id", () => {
    expect(
      parseAcquisitionEventPayload({
        visitor_id: "not-a-uuid",
        landing_path: "/tiktok",
        source: "tiktok",
      })
    ).toBeNull();
  });
});
