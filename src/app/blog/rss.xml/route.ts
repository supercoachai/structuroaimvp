import { opinlyConfig } from "@opinly/next";
import { buildRssItems } from "@opinly/shared";

import { getOpinlyClient } from "@/lib/opinly/client";

export const revalidate = 3600;

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function GET() {
  const client = getOpinlyClient();
  const items = client ? await client.rss({ limit: 50 }) : [];
  const feed = buildRssItems(items, opinlyConfig);
  const siteTitle = opinlyConfig.siteName || "Structuro";
  const blogUrl = opinlyConfig.blogUrl || "https://www.structuro.ai/blog";

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(siteTitle)} blog</title>
    <link>${escapeXml(blogUrl)}</link>
    <description>Artikelen van ${escapeXml(siteTitle)}</description>
    ${feed
      .map(
        (item) => `<item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.url)}</link>
      <guid>${escapeXml(item.url)}</guid>
      <pubDate>${escapeXml(new Date(item.date).toUTCString())}</pubDate>
      ${item.description ? `<description>${escapeXml(item.description)}</description>` : ""}
    </item>`
      )
      .join("\n    ")}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
