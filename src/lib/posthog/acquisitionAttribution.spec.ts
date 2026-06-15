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
