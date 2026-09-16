export const revalidate = 3600;

/**
 * Sitemap voor www.structuro.ai. Bewust leeg-maar-geldig: de kennislaag
 * (gidsen én voormalige blogposts) leeft op www.structuro.eu met een eigen
 * sitemap. /blog/* is hier een 301 naar structuro.eu; de app-shell en
 * auth-flows horen niet in een sitemap.
 */
export async function GET() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>
`;
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
