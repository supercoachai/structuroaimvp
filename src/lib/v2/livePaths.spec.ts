import { describe, expect, it } from "vitest";

import {
  isV2LiveShellPath,
  mapLegacyV2PathToLive,
  livePaths,
} from "./livePaths";

describe("mapLegacyV2PathToLive", () => {
  it("maps shell routes to canonical paths", () => {
    expect(mapLegacyV2PathToLive("/v2/home")).toBe("/");
    expect(mapLegacyV2PathToLive("/v2/onboarding")).toBe("/onboarding");
    expect(mapLegacyV2PathToLive("/v2/todo")).toBe("/todo");
    expect(mapLegacyV2PathToLive("/v2/dump")).toBe("/dump");
    expect(mapLegacyV2PathToLive("/v2/stop-abonnement")).toBe(
      "/stop-abonnement"
    );
    expect(mapLegacyV2PathToLive("/v2/install")).toBe("/welkom/install");
  });

  it("keeps lab paths", () => {
    expect(mapLegacyV2PathToLive("/v2")).toBe("/v2");
    expect(mapLegacyV2PathToLive("/v2/jasper")).toBe("/v2/jasper");
  });
});

describe("isV2LiveShellPath", () => {
  it("recognizes canonical shell", () => {
    expect(isV2LiveShellPath("/")).toBe(true);
    expect(isV2LiveShellPath(livePaths.todo)).toBe(true);
    expect(isV2LiveShellPath("/tiktok")).toBe(false);
  });
});
