export const revalidate = 3600;

const ORIGIN = "https://www.structuro.ai";
const LASTMOD = "2026-09-17";

/**
 * Product-ingangen op www.structuro.ai. Kennislaag (gidsen) leeft op
 * www.structuro.eu. Legal op .ai canonicaliseert naar .eu en hoort hier
 * niet in. /registreren is noindex (legacy) en blijft buiten de sitemap.
 * App-shell blijft buiten de sitemap.
 */
export async function GET() {
  const urls = ["/onboarding", "/login"];
  const body = urls
    .map(
      (path) => `  <url>
    <loc>${ORIGIN}${path}</loc>
    <lastmod>${LASTMOD}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
