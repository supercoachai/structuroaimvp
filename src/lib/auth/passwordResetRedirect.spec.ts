import { describe, expect, it } from "vitest";

import { buildPasswordResetRedirectUrl } from "@/lib/auth/passwordResetRedirect";

describe("buildPasswordResetRedirectUrl", () => {
  it("gebruikt directe wachtwoord-instellen URL op productiedomein", () => {
    const prev = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://www.structuro.ai";
    try {
      const url = buildPasswordResetRedirectUrl("https://example.com");
      expect(url).toBe("https://www.structuro.ai/auth/wachtwoord-instellen");
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = prev;
    }
  });
});
