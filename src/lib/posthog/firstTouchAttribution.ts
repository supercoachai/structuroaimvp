/** First-touch attributie via cookie (30 dagen), gespiegeld naar sessionStorage. */

import {
  CAMPAIGN_KEY,
  SOURCE_KEY,
  normalizeSignupSource,
} from "@/lib/posthog/signupAttribution";

export const ST_ATTR_COOKIE = "st_attr";
const ST_ATTR_MAX_AGE_SEC = 60 * 60 * 24 * 30;

export type FirstTouchAttribution = {
  source: string;
  utm_campaign: string | null;
};

function sanitize(raw: string | null | undefined, max = 64): string {
  const t = (raw ?? "").trim().slice(0, max);
  if (!t) return "";
  return t.replace(/[^a-zA-Z0-9_-]/g, "");
}

function mapReferrerToSource(referrer: string): string | null {
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (host.includes("linkedin.com")) return "linkedin";
    if (host.includes("instagram.com") || host === "l.instagram.com") return "instagram";
    if (host.includes("tiktok.com")) return "tiktok";
    if (host === "t.co" || host.includes("x.com") || host.includes("twitter.com")) return "x";
    if (host.startsWith("google.")) return "google";
  } catch {
    /* ignore */
  }
  return null;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, maxAgeSec: number): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSec}; SameSite=Lax`;
}

export function parseStAttrCookie(raw: string | null | undefined): FirstTouchAttribution | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as {
      source?: string;
      utm_campaign?: string | null;
    };
    const source = normalizeSignupSource(parsed.source);
    const campaign = parsed.utm_campaign
      ? sanitize(parsed.utm_campaign) || null
      : null;
    return { source, utm_campaign: campaign };
  } catch {
    return null;
  }
}

/** Server: lees st_attr uit Request cookies. */
export function parseStAttrFromRequest(request: Request): FirstTouchAttribution | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((p) => p.trim());
  for (const part of parts) {
    if (part.startsWith(`${ST_ATTR_COOKIE}=`)) {
      const raw = decodeURIComponent(part.slice(ST_ATTR_COOKIE.length + 1));
      return parseStAttrCookie(raw);
    }
  }
  return null;
}

/** Client first-touch: cookie + sessionStorage (alleen zetten als nog niet bestaat). */
export function captureFirstTouchAttribution(): void {
  if (typeof window === "undefined") return;

  try {
    const existingCookie = readCookie(ST_ATTR_COOKIE);
    if (existingCookie) {
      const parsed = parseStAttrCookie(existingCookie);
      if (parsed && !sessionStorage.getItem(SOURCE_KEY)) {
        sessionStorage.setItem(SOURCE_KEY, parsed.source);
        if (parsed.utm_campaign) {
          sessionStorage.setItem(CAMPAIGN_KEY, parsed.utm_campaign);
        }
      }
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const fromUtm = sanitize(params.get("utm_source"));
    const fromSource = sanitize(params.get("source"));
    const fromReferrer = document.referrer
      ? mapReferrerToSource(document.referrer)
      : null;
    const fromTtclid = sanitize(params.get("ttclid")) ? "tiktok" : "";
    const fromTikTokPath =
      window.location.pathname === "/tiktok" ||
      window.location.pathname.startsWith("/tiktok/")
        ? "tiktok"
        : "";
    const fromOrganicPath =
      window.location.pathname === "/start" ||
      window.location.pathname.startsWith("/start/")
        ? "structuro_eu"
        : "";
    const source =
      fromUtm ||
      fromSource ||
      fromTtclid ||
      fromTikTokPath ||
      fromOrganicPath ||
      fromReferrer ||
      "direct";
    const campaign = sanitize(params.get("utm_campaign")) || null;

    const payload: FirstTouchAttribution = {
      source: normalizeSignupSource(source),
      utm_campaign: campaign,
    };

    writeCookie(ST_ATTR_COOKIE, JSON.stringify(payload), ST_ATTR_MAX_AGE_SEC);

    if (!sessionStorage.getItem(SOURCE_KEY)) {
      sessionStorage.setItem(SOURCE_KEY, payload.source);
      if (payload.utm_campaign) {
        sessionStorage.setItem(CAMPAIGN_KEY, payload.utm_campaign);
      }
    }
  } catch {
    /* ignore */
  }
}
