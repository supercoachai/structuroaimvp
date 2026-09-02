import { describe, expect, it } from "vitest";

import {
  isClientPersistableSignupSource,
  shouldApplySignupAttributionWrite,
  shouldWriteSignupSourceFromAuthCallback,
} from "./signupAttributionWritePolicy";

describe("isClientPersistableSignupSource", () => {
  it("staat marketingbronnen toe", () => {
    expect(isClientPersistableSignupSource("tiktok")).toBe(true);
    expect(isClientPersistableSignupSource("structuro_eu")).toBe(true);
  });

  it("weiger event-trial en gift_comp", () => {
    expect(isClientPersistableSignupSource("adhd_cafe")).toBe(false);
    expect(isClientPersistableSignupSource("jasper_podcast")).toBe(false);
    expect(isClientPersistableSignupSource("gift_comp")).toBe(false);
    expect(isClientPersistableSignupSource("direct")).toBe(false);
    expect(isClientPersistableSignupSource(null)).toBe(false);
  });
});

describe("shouldApplySignupAttributionWrite", () => {
  it("schrijft alleen als het profiel leeg is", () => {
    expect(
      shouldApplySignupAttributionWrite({
        currentSource: null,
        proposedSource: "tiktok",
      })
    ).toBe("write");
  });

  it("wijzigt een bestaande bron niet", () => {
    expect(
      shouldApplySignupAttributionWrite({
        currentSource: "tiktok",
        proposedSource: "structuro_eu",
      })
    ).toBe("already_set");
  });

  it("weiger self-grant van event-trial", () => {
    expect(
      shouldApplySignupAttributionWrite({
        currentSource: null,
        proposedSource: "adhd_cafe",
      })
    ).toBe("reject_entitlement");
    expect(
      shouldApplySignupAttributionWrite({
        currentSource: null,
        proposedSource: "jasper_podcast",
      })
    ).toBe("reject_entitlement");
    expect(
      shouldApplySignupAttributionWrite({
        currentSource: null,
        proposedSource: "gift_comp",
      })
    ).toBe("reject_entitlement");
  });

  it("slaat lege of direct bron over", () => {
    expect(
      shouldApplySignupAttributionWrite({
        currentSource: null,
        proposedSource: "",
      })
    ).toBe("skip_empty");
    expect(
      shouldApplySignupAttributionWrite({
        currentSource: null,
        proposedSource: "direct",
      })
    ).toBe("skip_empty");
  });
});

describe("shouldWriteSignupSourceFromAuthCallback", () => {
  it("schrijft first-touch inclusief event-QR op leeg profiel", () => {
    expect(
      shouldWriteSignupSourceFromAuthCallback({
        currentSource: null,
        attrSource: "adhd_cafe",
      })
    ).toBe(true);
  });

  it("weiger gift_comp uit de cookie", () => {
    expect(
      shouldWriteSignupSourceFromAuthCallback({
        currentSource: null,
        attrSource: "gift_comp",
      })
    ).toBe(false);
  });

  it("overschrijft een bestaande bron niet, behalve jasper op zwakke bron", () => {
    expect(
      shouldWriteSignupSourceFromAuthCallback({
        currentSource: "tiktok",
        attrSource: "adhd_cafe",
      })
    ).toBe(false);
    expect(
      shouldWriteSignupSourceFromAuthCallback({
        currentSource: "structuro_eu",
        attrSource: "jasper_podcast",
      })
    ).toBe(true);
    expect(
      shouldWriteSignupSourceFromAuthCallback({
        currentSource: "adhd_cafe",
        attrSource: "jasper_podcast",
      })
    ).toBe(false);
  });
});
