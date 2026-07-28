import { describe, expect, it } from "vitest";

import { isV2LabPath } from "./v2LabAccess";

describe("isV2LabPath", () => {
  it("marks exact /v2 lab index as lab", () => {
    expect(isV2LabPath("/v2")).toBe(true);
    expect(isV2LabPath("/v2/")).toBe(true);
  });

  it("marks jasper as lab", () => {
    expect(isV2LabPath("/v2/jasper")).toBe(true);
    expect(isV2LabPath("/v2/jasper/x")).toBe(true);
  });

  it("keeps live shell routes public/product", () => {
    expect(isV2LabPath("/v2/onboarding")).toBe(false);
    expect(isV2LabPath("/v2/home")).toBe(false);
    expect(isV2LabPath("/v2/dagstart")).toBe(false);
    expect(isV2LabPath("/v2/login")).toBe(false);
  });
});
