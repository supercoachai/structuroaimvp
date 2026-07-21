import { describe, expect, it } from "vitest";

import { resolveAcquisitionAttribution } from "@/lib/posthog/acquisitionAttribution";

describe("resolveAcquisitionAttribution", () => {
  it("markeert TikTok via utm_source", () => {
    const result = resolveAcquisitionAttribution({
      pathname: "/registreren",
      searchParams: new URLSearchParams("utm_source=tiktok&utm_campaign=promo"),
      referrer: null,
    });
    expect(result.is_tiktok).toBe(true);
    expect(result.source).toBe("tiktok");
    expect(result.utm_campaign).toBe("promo");
  });

  it("markeert TikTok via ttclid zonder utm", () => {
    const result = resolveAcquisitionAttribution({
      pathname: "/registreren",
      searchParams: new URLSearchParams("ttclid=abc123"),
      referrer: null,
    });
    expect(result.is_tiktok).toBe(true);
    expect(result.has_ttclid).toBe(true);
    expect(result.source).toBe("tiktok");
  });

  it("markeert TikTok via referrer", () => {
    const result = resolveAcquisitionAttribution({
      pathname: "/registreren",
      searchParams: new URLSearchParams(),
      referrer: "https://www.tiktok.com/@structuro/video/123",
    });
    expect(result.is_tiktok).toBe(true);
    expect(result.source).toBe("tiktok");
  });

  it("markeert /tiktok route als TikTok-bron", () => {
    const result = resolveAcquisitionAttribution({
      pathname: "/tiktok",
      searchParams: new URLSearchParams(),
      referrer: null,
    });
    expect(result.is_tiktok).toBe(true);
    expect(result.source).toBe("tiktok");
  });

  it("vult bio-defaults aan op kale /tiktok (geen utm_source/ttclid)", () => {
    const result = resolveAcquisitionAttribution({
      pathname: "/tiktok",
      searchParams: new URLSearchParams(),
      referrer: null,
    });
    expect(result.source).toBe("tiktok");
    expect(result.utm_source).toBe("tiktok");
    expect(result.utm_medium).toBe("organic");
    expect(result.utm_campaign).toBe("tiktok_bio");
  });

  it("overschrijft expliciete utm_content/utm_source op /tiktok niet", () => {
    const result = resolveAcquisitionAttribution({
      pathname: "/tiktok",
      searchParams: new URLSearchParams(
        "utm_source=tiktok&utm_medium=paid_social&utm_campaign=tiktok_promote&utm_content=hook_42"
      ),
      referrer: null,
    });
    expect(result.utm_source).toBe("tiktok");
    expect(result.utm_medium).toBe("paid_social");
    expect(result.utm_campaign).toBe("tiktok_promote");
    expect(result.utm_content).toBe("hook_42");
  });

  it("past bio-defaults niet toe als alleen ttclid aanwezig is", () => {
    const result = resolveAcquisitionAttribution({
      pathname: "/tiktok",
      searchParams: new URLSearchParams("ttclid=abc123"),
      referrer: null,
    });
    expect(result.has_ttclid).toBe(true);
    expect(result.utm_campaign).toBeNull();
    expect(result.utm_medium).toBeNull();
  });

  it("markeert /start route als organische bron (geen TikTok)", () => {
    const result = resolveAcquisitionAttribution({
      pathname: "/start",
      searchParams: new URLSearchParams(
        "utm_source=structuro_eu&utm_medium=organic&utm_campaign=website"
      ),
      referrer: "https://www.structuro.eu/",
    });
    expect(result.is_tiktok).toBe(false);
    expect(result.source).toBe("structuro_eu");
  });

  it("/v2/onboarding is organische EU-entry (geen TikTok)", () => {
    const result = resolveAcquisitionAttribution({
      pathname: "/v2/onboarding",
      searchParams: new URLSearchParams(
        "utm_source=structuro_eu&utm_medium=organic&utm_campaign=eu_v2&utm_content=hero_primary"
      ),
      referrer: "https://www.structuro.eu/v2",
    });
    expect(result.is_tiktok).toBe(false);
    expect(result.source).toBe("structuro_eu");
    expect(result.utm_campaign).toBe("eu_v2");
  });

  it("kale /v2/onboarding zonder utm krijgt structuro_eu default", () => {
    const result = resolveAcquisitionAttribution({
      pathname: "/v2/onboarding",
      searchParams: new URLSearchParams(),
      referrer: null,
    });
    expect(result.is_tiktok).toBe(false);
    expect(result.source).toBe("structuro_eu");
  });

  it("direct verkeer blijft direct", () => {
    const result = resolveAcquisitionAttribution({
      pathname: "/registreren",
      searchParams: new URLSearchParams(),
      referrer: null,
    });
    expect(result.is_tiktok).toBe(false);
    expect(result.source).toBe("direct");
  });
});
