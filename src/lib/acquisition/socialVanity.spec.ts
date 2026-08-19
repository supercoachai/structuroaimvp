import { describe, expect, it } from "vitest";

import {
  buildSocialVanityOnboardingPath,
  buildSocialVanityRedirectPath,
  isOrganicEuUtmSource,
  isSocialVanitySource,
  socialVanitySourceFromPath,
} from "./socialVanity";

describe("socialVanity", () => {
  it("herkent alleen tiktok en instagram", () => {
    expect(isSocialVanitySource("tiktok")).toBe(true);
    expect(isSocialVanitySource("instagram")).toBe(true);
    expect(isSocialVanitySource("structuro_eu")).toBe(false);
  });

  it("koppelt .ai/tiktok en .ai/instagram aan dezelfde hop als .eu", () => {
    expect(socialVanitySourceFromPath("/social/tiktok")).toBe("tiktok");
    expect(socialVanitySourceFromPath("/tiktok")).toBe("tiktok");
    expect(socialVanitySourceFromPath("/en/tiktok")).toBe("tiktok");
    expect(socialVanitySourceFromPath("/instagram")).toBe("instagram");
    expect(socialVanitySourceFromPath("/activiteit/tiktok-publish")).toBeNull();
    expect(socialVanitySourceFromPath("/api/admin/tiktok")).toBeNull();
  });

  it("stuurt beide bronnen naar dezelfde dagstart", () => {
    const tiktok = buildSocialVanityOnboardingPath("tiktok");
    const instagram = buildSocialVanityOnboardingPath("instagram");
    expect(tiktok.startsWith("/onboarding?")).toBe(true);
    expect(instagram.startsWith("/onboarding?")).toBe(true);
  });

  it("zet tiktok-attributie vast", () => {
    const url = new URL(buildSocialVanityOnboardingPath("tiktok"), "https://www.structuro.ai");
    expect(url.searchParams.get("utm_source")).toBe("tiktok");
    expect(url.searchParams.get("utm_medium")).toBe("organic");
    expect(url.searchParams.get("utm_campaign")).toBe("tiktok_bio");
    expect(url.searchParams.get("utm_content")).toBe("eu_vanity");
  });

  it("zet instagram-attributie vast, niet tiktok", () => {
    const url = new URL(
      buildSocialVanityOnboardingPath("instagram"),
      "https://www.structuro.ai"
    );
    expect(url.searchParams.get("utm_source")).toBe("instagram");
    expect(url.searchParams.get("utm_campaign")).toBe("ig_bio");
    expect(url.searchParams.get("utm_source")).not.toBe("tiktok");
  });

  it("behoudt extra query (video-id) en overschrijft verkeerde source", () => {
    const url = new URL(
      buildSocialVanityOnboardingPath(
        "tiktok",
        new URLSearchParams("utm_content=familie_post&utm_source=structuro_eu")
      ),
      "https://www.structuro.ai"
    );
    expect(url.searchParams.get("utm_source")).toBe("tiktok");
    expect(url.searchParams.get("utm_content")).toBe("familie_post");
  });

  it("houdt organisch EU op /tiktok uit tiktok-attributie", () => {
    expect(isOrganicEuUtmSource(new URLSearchParams("utm_source=structuro_eu"))).toBe(
      true
    );
    const url = new URL(
      buildSocialVanityRedirectPath(
        "/tiktok",
        new URLSearchParams("utm_source=structuro_eu&utm_campaign=eu_v2")
      )!,
      "https://www.structuro.ai"
    );
    expect(url.pathname).toBe("/onboarding");
    expect(url.searchParams.get("utm_source")).toBe("structuro_eu");
    expect(url.searchParams.get("utm_campaign")).toBe("eu_v2");
  });

  it("zet lang=en op /en/tiktok en forceert tiktok-bron", () => {
    const url = new URL(
      buildSocialVanityRedirectPath("/en/tiktok", new URLSearchParams("utm_content=bio"))!,
      "https://www.structuro.ai"
    );
    expect(url.pathname).toBe("/onboarding");
    expect(url.searchParams.get("utm_source")).toBe("tiktok");
    expect(url.searchParams.get("lang")).toBe("en");
    expect(url.searchParams.get("utm_content")).toBe("bio");
  });

  it("forceert tiktok op .eu-hop /social/tiktok ook bij leftover structuro_eu", () => {
    const url = new URL(
      buildSocialVanityRedirectPath(
        "/social/tiktok",
        new URLSearchParams("utm_source=structuro_eu")
      )!,
      "https://www.structuro.ai"
    );
    expect(url.searchParams.get("utm_source")).toBe("tiktok");
  });
});
