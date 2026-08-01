import { describe, expect, it } from "vitest";

import {
  appendAnonDistinctIdToPath,
  normalizeAnonDistinctId,
  readAnonDistinctIdFromCookieHeader,
  readAnonDistinctIdFromNextPath,
  stripAnonDistinctIdFromPath,
} from "./anonDistinctCookie";

const ANON = "019fbd91-7815-7c1a-a6f2-7ca895767c23";

describe("anonDistinctCookie", () => {
  it("normaliseert geldige UUID's", () => {
    expect(normalizeAnonDistinctId(ANON.toUpperCase())).toBe(ANON);
    expect(normalizeAnonDistinctId("nope")).toBeNull();
  });

  it("leest cookie header", () => {
    expect(
      readAnonDistinctIdFromCookieHeader(`st_attr=x; st_ph_did=${ANON}; other=1`)
    ).toBe(ANON);
    expect(readAnonDistinctIdFromCookieHeader("st_attr=x")).toBeNull();
  });

  it("plakt en stript _ph_did op next-path", () => {
    const withId = appendAnonDistinctIdToPath("/abonnement?name=1", ANON);
    expect(withId).toContain(`_ph_did=${ANON}`);
    expect(withId).toContain("name=1");
    expect(readAnonDistinctIdFromNextPath(withId)).toBe(ANON);
    expect(stripAnonDistinctIdFromPath(withId)).toBe("/abonnement?name=1");
  });

  it("laat path zonder query onaangeroerd bij strip", () => {
    expect(stripAnonDistinctIdFromPath("/onboarding")).toBe("/onboarding");
  });
});
