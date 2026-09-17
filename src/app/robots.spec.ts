import { describe, expect, it } from "vitest";

import { CANONICAL_PRODUCTION_ORIGIN } from "@/lib/appUrl";

import robots from "./robots";
import { GET as sitemapGet } from "./sitemap.xml/route";

describe("product-host robots", () => {
  it("staat publieke ingangen plus llms.txt toe en houdt de rest dicht", () => {
    const map = robots();
    const star = Array.isArray(map.rules) ? map.rules[0] : map.rules;
    expect(star.userAgent).toBe("*");
    expect(star.allow).toEqual(
      expect.arrayContaining([
        "/onboarding",
        "/login",
        "/registreren",
        "/llms.txt",
        "/privacy",
        "/terms",
      ]),
    );
    expect(star.disallow).toBe("/");
    expect(map.sitemap).toBe(`${CANONICAL_PRODUCTION_ORIGIN}/sitemap.xml`);
  });
});

describe("product-host sitemap", () => {
  it("bevat alleen indexeerbare product-ingangen, geen noindex-registreren", async () => {
    const res = await sitemapGet();
    const xml = await res.text();
    expect(xml).toContain("https://www.structuro.ai/onboarding");
    expect(xml).toContain("https://www.structuro.ai/login");
    expect(xml).not.toContain("https://www.structuro.ai/registreren");
    expect(xml).not.toContain("/dagstart");
  });
});
