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

  it("gebruikt herkende voor generieke tiktok_promote zonder hook", () => {
    const campaign = resolveLpCampaign({ utmCampaign: "tiktok_promote" });
    expect(campaign.id).toBe("herkende");
    expect(campaign.defaultHero).toBe("A");
  });

  it("valt op tiktok-channel terug op herkende zonder herkenbare hook", () => {
    const campaign = resolveLpCampaign({ channel: "tiktok" });
    expect(campaign.id).toBe("herkende");
  });

  it("negeert ongesubstitueerde utm_content placeholder", () => {
    expect(
      resolveLpCampaign({ utmContent: "<video_id>", channel: "tiktok" }).id
    ).toBe("herkende");
    expect(
      resolveLpCampaign({ utmContent: "__VIDEO_ID__", channel: "tiktok" }).id
    ).toBe("herkende");
  });

  it("matcht campagne op utm_campaign cyclus", () => {
    const campaign = resolveLpCampaign({ utmCampaign: "cyclus" });
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
