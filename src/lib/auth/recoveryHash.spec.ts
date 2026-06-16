import { describe, expect, it } from "vitest";

import { parseAuthHashFragment } from "@/lib/auth/recoveryHash";

describe("parseAuthHashFragment", () => {
  it("herkent recovery tokens", () => {
    const parsed = parseAuthHashFragment(
      "#access_token=abc&refresh_token=def&type=recovery"
    );
    expect(parsed.hasAuthTokens).toBe(true);
    expect(parsed.hasRecoveryTokens).toBe(true);
    expect(parsed.hasAuthError).toBe(false);
  });

  it("herkent auth tokens zonder expliciet type=recovery", () => {
    const parsed = parseAuthHashFragment(
      "#access_token=abc&refresh_token=def"
    );
    expect(parsed.hasAuthTokens).toBe(true);
    expect(parsed.hasRecoveryTokens).toBe(true);
  });

  it("herkent otp_expired in hash", () => {
    const parsed = parseAuthHashFragment(
      "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid"
    );
    expect(parsed.hasAuthError).toBe(true);
    expect(parsed.errorCode).toBe("otp_expired");
  });
});
