import { describe, expect, it } from "vitest";

import { SECURITY_HEADERS } from "./securityHeaders";

function csp(): string {
  const row = SECURITY_HEADERS.find((h) => h.key === "Content-Security-Policy");
  if (!row) throw new Error("CSP header ontbreekt");
  return row.value;
}

describe("SECURITY_HEADERS", () => {
  it("laat Microsoft Clarity niet toe op de webapp (alleen structuro.eu)", () => {
    const value = csp();
    expect(value).not.toContain("clarity.ms");
    expect(value).not.toContain("c.bing.com");
  });

  it("laat de Opinly-pixel toe", () => {
    const value = csp();
    expect(value).toContain("https://static.opinly.ai");
    expect(value).toContain("https://*.opinly.ai");
  });
});
