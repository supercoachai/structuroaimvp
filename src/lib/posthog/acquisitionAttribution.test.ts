/**
 * Run: npx tsx src/lib/posthog/acquisitionAttribution.test.ts
 */
import assert from "node:assert/strict";

import { resolveAcquisitionAttribution } from "./acquisitionAttribution";

// Kale /jasper bezoek zonder utm: default attributie is jasper_podcast.
{
  const attr = resolveAcquisitionAttribution({
    pathname: "/jasper",
    searchParams: new URLSearchParams(),
    referrer: null,
  });
  assert.equal(attr.source, "jasper_podcast");
  assert.equal(attr.utm_source, "jasper_podcast");
  assert.equal(attr.utm_campaign, "jasper_podcast");
  assert.equal(attr.utm_medium, "podcast");
  assert.equal(attr.is_tiktok, false);
}

// /jasper met expliciete utm_source: URL wint (geen Jasper-default).
{
  const params = new URLSearchParams({
    utm_source: "spotify",
    utm_campaign: "afl_42",
  });
  const attr = resolveAcquisitionAttribution({
    pathname: "/jasper",
    searchParams: params,
    referrer: null,
  });
  assert.equal(attr.source, "spotify");
  assert.equal(attr.utm_source, "spotify");
  assert.equal(attr.utm_campaign, "afl_42");
  assert.equal(attr.is_tiktok, false);
}

// /start blijft structuro_eu (Jasper-pad mag andere defaults niet kapot maken).
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
