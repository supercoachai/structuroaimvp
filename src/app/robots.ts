import type { MetadataRoute } from "next";

import { CANONICAL_PRODUCTION_ORIGIN } from "@/lib/appUrl";

/**
 * robots.txt voor www.structuro.ai (product-host).
 *
 * Kennislaag leeft op www.structuro.eu; hier is alleen de blog plus een
 * handvol publieke pagina's crawlbaar. De app-shell (dagstart, todo, focus,
 * settings) is bewust dicht: ingelogde flows horen niet in de index.
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
