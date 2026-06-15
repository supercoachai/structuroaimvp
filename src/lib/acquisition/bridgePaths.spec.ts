import { describe, expect, it } from "vitest";

import {
  buildBridgeRegistrerenHref,
  buildOrganicStartUrl,
  bridgeChannelFromPath,
} from "./bridgePaths";

describe("bridgePaths", () => {
  it("herkent channel per pad", () => {
    expect(bridgeChannelFromPath("/tiktok")).toBe("tiktok");
    expect(bridgeChannelFromPath("/start")).toBe("organic");
    expect(bridgeChannelFromPath("/registreren")).toBeNull();
  });

  it("bouwt aparte registreren-URL's per channel", () => {
    const tiktok = buildBridgeRegistrerenHref(
      "tiktok",
      new URLSearchParams("utm_campaign=promo&utm_content=vid1")
    );
    expect(tiktok).toContain("source=tiktok");
    expect(tiktok).toContain("utm_source=tiktok");

    const organic = buildBridgeRegistrerenHref(
      "organic",
      new URLSearchParams("utm_content=zelftest_sticky")
    );
    expect(organic).toContain("source=structuro_eu");
    expect(organic).not.toContain("tiktok");
  });

  it("organische start URL gebruikt /start", () => {
    const url = buildOrganicStartUrl({ contentId: "hero", campaign: "weten", hero: "A" });
    expect(url).toContain("/start?");
    expect(url).toContain("utm_source=structuro_eu");
  });
});
