import type { AcquisitionEventPayload } from "@/lib/posthog/acquisitionAnalytics";

/** UUID v1-v8: PostHog's anonieme distinct_id is v7, losse acquisitie-id's zijn v4. */
export const ACQUISITION_VISITOR_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitize(raw: unknown, max = 128): string {
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, max).replace(/[^a-zA-Z0-9_\-./:?&=%]/g, "");
}

function sanitizeLpToken(raw: unknown, max = 32): string | null {
  const t = sanitize(raw, max);
  return t || null;
}

export function parseAcquisitionEventPayload(
  body: unknown
): AcquisitionEventPayload | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const visitor_id = sanitize(b.visitor_id, 64);
  if (!ACQUISITION_VISITOR_UUID_RE.test(visitor_id)) return null;

  const landing_path = sanitize(b.landing_path, 200);
  if (!landing_path.startsWith("/")) return null;

  const source = sanitize(b.source, 64) || "direct";

  return {
    visitor_id,
    landing_path,
    source,
    utm_source: sanitize(b.utm_source as string) || null,
    utm_campaign: sanitize(b.utm_campaign as string) || null,
    utm_medium: sanitize(b.utm_medium as string) || null,
    utm_content: sanitize(b.utm_content as string) || null,
    referrer_domain: sanitize(b.referrer_domain as string) || null,
    is_tiktok: b.is_tiktok === true,
    has_ttclid: b.has_ttclid === true,
    entry_url: sanitize(b.entry_url as string, 512) || null,
    lp_campaign: sanitizeLpToken(b.lp_campaign),
    lp_hero: sanitizeLpToken(b.lp_hero, 8),
    lp_hero_source: sanitizeLpToken(b.lp_hero_source, 32),
  };
}
