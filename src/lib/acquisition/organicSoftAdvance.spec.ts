import { describe, expect, it } from "vitest";

import {
  organicSoftAdvanceTarget,
  shouldSoftAdvanceOrganicLanding,
  softAdvanceHref,
} from "./organicSoftAdvance";

function params(query: string): URLSearchParams {
  return new URLSearchParams(query);
}

describe("shouldSoftAdvanceOrganicLanding", () => {
  it("soft-advances eu_v2 and prefixed variants", () => {
    expect(
      shouldSoftAdvanceOrganicLanding(params("utm_campaign=eu_v2"))
    ).toBe(true);
    expect(
      shouldSoftAdvanceOrganicLanding(params("utm_campaign=eu_v2_test"))
    ).toBe(true);
  });

  it("soft-advances website and waitlist_legacy", () => {
    expect(
      shouldSoftAdvanceOrganicLanding(params("utm_campaign=website"))
    ).toBe(true);
    expect(
      shouldSoftAdvanceOrganicLanding(params("utm_campaign=website_hero"))
    ).toBe(true);
    expect(
      shouldSoftAdvanceOrganicLanding(params("utm_campaign=waitlist_legacy"))
    ).toBe(true);
  });

  it("does not soft-advance bare /start or unknown campaigns", () => {
    expect(shouldSoftAdvanceOrganicLanding(params(""))).toBe(false);
    expect(
      shouldSoftAdvanceOrganicLanding(params("utm_campaign=tiktok_promote"))
    ).toBe(false);
    expect(
      shouldSoftAdvanceOrganicLanding(params("utm_campaign=random_test"))
    ).toBe(false);
  });
});

describe("organicSoftAdvanceTarget", () => {
  it("routes eu_v2 to v1 /onboarding", () => {
    expect(organicSoftAdvanceTarget(params("utm_campaign=eu_v2"))).toBe(
      "/onboarding"
    );
    expect(organicSoftAdvanceTarget(params("utm_campaign=eu_v2_ab"))).toBe(
      "/onboarding"
    );
  });

  it("routes website and waitlist_legacy to v1 /onboarding", () => {
    expect(organicSoftAdvanceTarget(params("utm_campaign=website"))).toBe(
      "/onboarding"
    );
    expect(
      organicSoftAdvanceTarget(params("utm_campaign=waitlist_legacy"))
    ).toBe("/onboarding");
  });
});

describe("softAdvanceHref", () => {
  it("preserves nl/en lang and first-touch UTMs on the target", () => {
    expect(
      softAdvanceHref(
        "/onboarding",
        params(
          "utm_source=structuro_eu&utm_medium=organic&utm_campaign=website&utm_content=nav&lang=nl"
        )
      )
    ).toBe(
      "/onboarding?lang=nl&utm_source=structuro_eu&utm_medium=organic&utm_campaign=website&utm_content=nav"
    );
    expect(
      softAdvanceHref("/onboarding", params("utm_campaign=eu_v2&lang=en"))
    ).toBe("/onboarding?lang=en&utm_campaign=eu_v2");
  });

  it("preserves UTMs without lang", () => {
    expect(
      softAdvanceHref("/onboarding", params("utm_campaign=website"))
    ).toBe("/onboarding?utm_campaign=website");
  });

  it("leaves href alone without lang or utms", () => {
    expect(softAdvanceHref("/onboarding", params(""))).toBe("/onboarding");
  });
});
