import { describe, expect, it } from "vitest";

import {
  buildOrganicStartUrl,
  buildTikTokLandingUrl,
  resolveLpCampaign,
  resolveLpVariant,
} from "./lpConfig";

describe("lpConfig", () => {
  it("valt terug op cyclus zonder params", () => {
    const campaign = resolveLpCampaign({});
    expect(campaign.id).toBe("cyclus");
    expect(campaign.defaultHero).toBe("B");
  });

  it("matcht campagne op utm_content", () => {
    const campaign = resolveLpCampaign({ utmContent: "hook_week3_cyclus" });
    expect(campaign.id).toBe("cyclus");
    expect(campaign.defaultHero).toBe("B");
  });

  it("gebruikt ?hero= boven campagne-default", () => {
    const variant = resolveLpVariant({
      utmContent: "hook_40min_staren",
      hero: "B",
    });
    expect(variant.campaign.id).toBe("staren");
    expect(variant.hero.id).toBe("B");
    expect(variant.heroSource).toBe("query");
  });

  it("bouwt landing URL met campaign en hero", () => {
    const url = buildTikTokLandingUrl({
      contentId: "week3_v2",
      campaign: "cyclus",
      hero: "B",
    });
    expect(url).toContain("/tiktok?");
    expect(url).toContain("utm_content=week3_v2");
    expect(url).toContain("campaign=cyclus");
    expect(url).toContain("hero=B");
  });

  it("bouwt organische start URL zonder tiktok pad", () => {
    const url = buildOrganicStartUrl({
      contentId: "zelftest_sticky",
      campaign: "weten",
      hero: "A",
    });
    expect(url).toContain("/start?");
    expect(url).not.toContain("/tiktok");
    expect(url).toContain("utm_source=structuro_eu");
  });
});
