import type { MetadataRoute } from "next";

import { CANONICAL_PRODUCTION_ORIGIN } from "@/lib/appUrl";

/**
 * robots.txt voor www.structuro.ai (product-host).
 *
 * SEO-grens: kennislaag en indexeerbare marketingcontent leven op
 * www.structuro.eu. Dit host mag crawlers de publieke ingangen laten zien
 * (onboarding, login, legal) zodat redirects en trials bereikbaar zijn.
 * De app-shell (dagstart, todo, focus, settings) blijft dicht: ingelogde
 * flows horen niet als dunne URL's in de index.
 *
 * Search-crawlers (Googlebot, Bingbot, OAI-SearchBot) vallen onder `*`.
 * Training-crawlers worden hier niet extra opengezet: de app is geen
 * kennisbron. Zie docs/seo/AI_CRAWLER_POLICY.md.
 *
 * Google hanteert longest-match: een specifieke Allow wint van `Disallow: /`.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/blog",
          "/onboarding",
          "/privacy",
          "/terms",
          "/login",
          "/registreren",
        ],
        disallow: "/",
      },
    ],
    sitemap: `${CANONICAL_PRODUCTION_ORIGIN}/sitemap.xml`,
  };
}
