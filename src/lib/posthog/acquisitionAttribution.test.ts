/**
 * Run: npx tsx src/lib/posthog/acquisitionAttribution.test.ts
 */
import assert from "node:assert/strict";

import { resolveAcquisitionAttribution } from "./acquisitionAttribution";

// /start blijft structuro_eu (regressie-check op organic-bron).
{
  const attr = resolveAcquisitionAttribution({
    pathname: "/start",
    searchParams: new URLSearchParams(),
    referrer: null,
  });
  assert.equal(attr.source, "structuro_eu");
}

// /tiktok blijft tiktok-attribution (regressie-check).
{
  const attr = resolveAcquisitionAttribution({
    pathname: "/tiktok",
    searchParams: new URLSearchParams(),
    referrer: null,
  });
  assert.equal(attr.is_tiktok, true);
  assert.equal(attr.source, "tiktok");
}

// Geldig whitelist-token: utm_source=tiktok_ads telt als TikTok.
{
  const attr = resolveAcquisitionAttribution({
    pathname: "/start",
    searchParams: new URLSearchParams({ utm_source: "tiktok_ads" }),
    referrer: null,
  });
  assert.equal(attr.is_tiktok, true);
  assert.equal(attr.source, "tiktok_ads");
}

// Substring met "tiktok" mag GEEN TikTok-attributie meer triggeren.
// Voorheen telde `tiktokclone` of `internal_tiktok_test` mee, wat het kanaal opblies.
{
  const attr = resolveAcquisitionAttribution({
    pathname: "/start",
    searchParams: new URLSearchParams({ utm_source: "tiktokclone" }),
    referrer: null,
  });
  assert.equal(attr.is_tiktok, false);
  assert.equal(attr.source, "tiktokclone");
}

{
  const attr = resolveAcquisitionAttribution({
    pathname: "/start",
    searchParams: new URLSearchParams({ utm_source: "internal_tiktok_test" }),
    referrer: null,
  });
  assert.equal(attr.is_tiktok, false);
  assert.equal(attr.source, "internal_tiktok_test");
}

// Referrer van tiktok.com blijft TikTok-attributie geven.
{
  const attr = resolveAcquisitionAttribution({
    pathname: "/start",
    searchParams: new URLSearchParams(),
    referrer: "https://www.tiktok.com/@iemand/video/123",
  });
  assert.equal(attr.is_tiktok, true);
}

console.log("acquisitionAttribution.test.ts: ok");
