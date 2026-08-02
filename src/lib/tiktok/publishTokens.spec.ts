import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createOAuthState,
  openTikTokTokens,
  packOAuthStateCookie,
  sealTikTokTokens,
  tokensFromOAuthResponse,
  verifyOAuthStateCookie,
} from "@/lib/tiktok/publishTokens";

describe("tiktok publishTokens", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sealt en opent tokens roundtrip", () => {
    vi.stubEnv("STRUCTURO_ACTIVITY_ADMIN_SECRET", "test-admin-secret");
    const tokens = tokensFromOAuthResponse({
      access_token: "act.demo",
      refresh_token: "rft.demo",
      open_id: "oid-1",
      scope: "user.info.basic,video.publish",
      expires_in: 3600,
      refresh_expires_in: 86400,
    });
    const sealed = sealTikTokTokens(tokens);
    expect(sealed).toBeTruthy();
    const opened = openTikTokTokens(sealed);
    expect(opened?.access_token).toBe("act.demo");
    expect(opened?.open_id).toBe("oid-1");
  });

  it("weigert ongeldige seal", () => {
    vi.stubEnv("STRUCTURO_ACTIVITY_ADMIN_SECRET", "test-admin-secret");
    expect(openTikTokTokens("not.valid.payload")).toBeNull();
  });

  it("valideert oauth state cookie", () => {
    vi.stubEnv("STRUCTURO_ACTIVITY_ADMIN_SECRET", "test-admin-secret");
    const state = createOAuthState();
    const cookie = packOAuthStateCookie(state);
    expect(verifyOAuthStateCookie(cookie, state)).toBe(true);
    expect(verifyOAuthStateCookie(cookie, "other")).toBe(false);
    expect(verifyOAuthStateCookie("tampered.sig", state)).toBe(false);
  });
});
