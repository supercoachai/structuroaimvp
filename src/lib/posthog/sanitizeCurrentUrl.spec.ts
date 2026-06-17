import { describe, expect, it } from "vitest";

import { sanitizeCurrentUrl } from "./sanitizeCurrentUrl";

describe("sanitizeCurrentUrl", () => {
  it("redacteert recovery hash tokens", () => {
    const url =
      "https://www.structuro.ai/auth/wachtwoord-instellen#access_token=abc&refresh_token=def&type=recovery";
    expect(sanitizeCurrentUrl(url)).toBe(
      "https://www.structuro.ai/auth/wachtwoord-instellen#[redacted]"
    );
  });

  it("redacteert gevoelige query params", () => {
    const url =
      "https://www.structuro.ai/auth/callback?code=secret123&type=recovery";
    expect(sanitizeCurrentUrl(url)).toBe(
      "https://www.structuro.ai/auth/callback?code=%5Bredacted%5D&type=%5Bredacted%5D"
    );
  });

  it("laat schone URLs intact", () => {
    const url = "https://www.structuro.ai/start?utm_source=structuro_eu";
    expect(sanitizeCurrentUrl(url)).toBe(url);
  });
});
