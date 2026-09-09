import { opinlyConfig } from "@opinly/next";
import { buildSitemapEntries, toSitemapXml } from "@opinly/shared";

import { getOpinlyClient } from "@/lib/opinly/client";

export const revalidate = 3600;

export async function GET() {
  const client = getOpinlyClient();
  const routes = client ? await client.routes() : [];
  const xml = toSitemapXml(buildSitemapEntries(routes, opinlyConfig));
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
