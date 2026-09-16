import { CANONICAL_PRODUCTION_ORIGIN } from "@/lib/appUrl";

export const revalidate = 3600;

/**
 * Sitemap-index voor www.structuro.ai. De blog-sitemap (Opinly) is de enige
 * deelsitemap; app-shell en auth-flows horen niet in een sitemap.
 * Kennispagina's leven op www.structuro.eu met een eigen sitemap.
 */
export async function GET() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${CANONICAL_PRODUCTION_ORIGIN}/blog/sitemap.xml</loc>
  </sitemap>
</sitemapindex>
`;
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
