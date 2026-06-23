/** First-touch attributie via cookie (30 dagen), gespiegeld naar sessionStorage. */

import { TIKTOK_BIO_DEFAULT_UTM } from "@/lib/acquisition/bridgePaths";
import {
  CAMPAIGN_KEY,
  SOURCE_KEY,
  normalizeSignupSource,
} from "@/lib/posthog/signupAttribution";

export const ST_ATTR_COOKIE = "st_attr";
const ST_ATTR_MAX_AGE_SEC = 60 * 60 * 24 * 30;

export type FirstTouchAttribution = {
  source: string;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_medium: string | null;
  utm_content: string | null;
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
      utm_source?: string | null;
      utm_campaign?: string | null;
      utm_medium?: string | null;
      utm_content?: string | null;
    };
    const source = normalizeSignupSource(parsed.source);
    const utm_source = parsed.utm_source
      ? sanitize(parsed.utm_source) || null
      : null;
    const campaign = parsed.utm_campaign
      ? sanitize(parsed.utm_campaign) || null
      : null;
    const utm_medium = parsed.utm_medium
      ? sanitize(parsed.utm_medium) || null
      : null;
    const utm_content = parsed.utm_content
      ? sanitize(parsed.utm_content) || null
      : null;
    return {
      source,
      utm_source,
      utm_campaign: campaign,
      utm_medium,
      utm_content,
    };
  } catch {
    return null;
  }
}

/** PostHog $set_once bij identify — first-touch attributie op de persoon. */
export function getFirstTouchSetOnceForPostHog(): Record<string, string> | null {
  if (typeof document === "undefined") return null;
  const parsed = parseStAttrCookie(readCookie(ST_ATTR_COOKIE));
  if (!parsed) return null;

  const out: Record<string, string> = {};
  const initialSource = parsed.utm_source || parsed.source;
  if (initialSource && initialSource !== "direct") {
    out.initial_utm_source = initialSource;
    out.$initial_utm_source = initialSource;
  }
  if (parsed.utm_campaign) {
    out.initial_utm_campaign = parsed.utm_campaign;
    out.$initial_utm_campaign = parsed.utm_campaign;
  }
  if (parsed.utm_medium) {
    out.initial_utm_medium = parsed.utm_medium;
    out.$initial_utm_medium = parsed.utm_medium;
  }
  if (parsed.utm_content) {
    out.initial_utm_content = parsed.utm_content;
    out.$initial_utm_content = parsed.utm_content;
  }
  if (parsed.source && parsed.source !== "direct") {
    out.signup_source = parsed.source;
  }

  return Object.keys(out).length > 0 ? out : null;
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
    const hasTtclid = !!sanitize(params.get("ttclid"));
    const fromTtclid = hasTtclid ? "tiktok" : "";
    const isTikTokPath =
      window.location.pathname === "/tiktok" ||
      window.location.pathname.startsWith("/tiktok/");
    const fromTikTokPath = isTikTokPath ? "tiktok" : "";
    const fromOrganicPath =
      window.location.pathname === "/start" ||
      window.location.pathname.startsWith("/start/")
        ? "structuro_eu"
        : "";

    // Kale /tiktok bio-link: geen eigen utm_source en geen ttclid in de URL.
    // Behandel als TikTok-bio-verkeer met defaults, zonder bestaande params
    // (bv. een specifieke video-link) te overschrijven.
    const isBareTikTokBio = isTikTokPath && !fromUtm && !hasTtclid;

    const utm_source =
      fromUtm || (isBareTikTokBio ? TIKTOK_BIO_DEFAULT_UTM.utm_source : null);
    const utm_medium =
      sanitize(params.get("utm_medium")) ||
      (isBareTikTokBio ? TIKTOK_BIO_DEFAULT_UTM.utm_medium : null);
    const utm_content = sanitize(params.get("utm_content")) || null;
    const source =
      fromUtm ||
      fromSource ||
      fromTtclid ||
      fromTikTokPath ||
      fromOrganicPath ||
      fromReferrer ||
      "direct";
    const campaign =
      sanitize(params.get("utm_campaign")) ||
      (isBareTikTokBio ? TIKTOK_BIO_DEFAULT_UTM.utm_campaign : null);

    const payload: FirstTouchAttribution = {
      source: normalizeSignupSource(source),
      utm_source,
      utm_campaign: campaign,
      utm_medium,
      utm_content,
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
