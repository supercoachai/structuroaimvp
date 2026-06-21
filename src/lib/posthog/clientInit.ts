"use client";

import posthog from "posthog-js";
import type { CaptureResult } from "posthog-js";

import { isCookielessAnalyticsPath } from "@/lib/marketingPaths";

import { posthogTracingHeaderHostnames } from "./tracingHeaders";
import { POSTHOG_PROXY_API_HOST } from "./proxyHost";
import { sanitizeCurrentUrl } from "./sanitizeCurrentUrl";
import { sanitizeExceptionContext } from "./sanitizeExceptionContext";

let posthogInitOnce = false;
let marketingReplayBootstrapped = false;
let replayOptInDone = false;

/** Release/omgeving op elke event (incl. $exception): "nieuw sinds commit X". */
const RELEASE_VERSION =
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.trim() || "local";
const RELEASE_ENVIRONMENT =
  process.env.NEXT_PUBLIC_VERCEL_ENV?.trim() || "development";

/**
 * Sanitiseer autocaptured $exception-events zonder PostHog's eigen velden te slopen.
 *
 * captureClientException sanitiseert handmatig, maar de autocapture-laag (capture_exceptions)
 * stuurt $exception-events die NIET door die functie gaan. Hier halen we alleen de custom
 * (niet-$) properties door de PII-filter; alle $-prefixed velden ($session_id, $exception_list,
 * $exception_*) blijven intact, anders verlies je correlatie en de stacktrace zelf.
 */
function sanitizeEventProperties(
  properties: Record<string, unknown>
): Record<string, unknown> {
  const out = { ...properties };
  const currentUrl = out.$current_url;
  if (typeof currentUrl === "string") {
    out.$current_url = sanitizeCurrentUrl(currentUrl);
  }
  return out;
}

function posthogBeforeSend(cr: CaptureResult | null): CaptureResult | null {
  if (!cr) return cr;
  if (!cr.properties || typeof cr.properties !== "object") return cr;

  if (cr.event === "$exception") {
    const preserved: Record<string, unknown> = {};
    const custom: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(cr.properties)) {
      if (key.startsWith("$")) preserved[key] = value;
      else custom[key] = value;
    }

    cr.properties = sanitizeEventProperties({
      ...preserved,
      ...sanitizeExceptionContext(custom),
      error_tracking: true,
    });
    return cr;
  }

  cr.properties = sanitizeEventProperties(cr.properties);
  return cr;
}

function clientApiHost(): string {
  const fromEnv = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim().replace(/\/+$/, "");
  // Direct posthog.com in env bypassed ad-blockers niet; same-origin /ph is de default.
  if (fromEnv && !/posthog\.com/i.test(fromEnv)) return fromEnv;
  return POSTHOG_PROXY_API_HOST;
}

function registerSiteGroup(): void {
  if (typeof window === "undefined") return;
  const hostname = window.location.hostname;
  let site = "dev";
  if (hostname.includes("structuro.eu")) site = "eu";
  else if (hostname.includes("structuro.ai")) site = "ai";
  posthog.register({ site });
}

const CROSS_DOMAIN_DID_PARAM = "_ph_did";

/** Anoniem distinct_id doorgegeven vanaf structuro.eu (cross-domain identity). */
function readCrossDomainDistinctId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = new URLSearchParams(window.location.search).get(
      CROSS_DOMAIN_DID_PARAM
    );
    const trimmed = raw?.trim();
    if (!trimmed || trimmed.length < 8 || trimmed.length > 64) return null;
    return trimmed;
  } catch {
    return null;
  }
}

/** Verwijder _ph_did uit de URL zodat hij niet meereist bij verdere navigatie. */
function stripCrossDomainDistinctIdFromUrl(): void {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    if (!params.has(CROSS_DOMAIN_DID_PARAM)) return;
    params.delete(CROSS_DOMAIN_DID_PARAM);
    const query = params.toString();
    const cleanUrl =
      window.location.pathname +
      (query ? `?${query}` : "") +
      window.location.hash;
    window.history.replaceState({}, "", cleanUrl);
  } catch {
    /* ignore */
  }
}

/** Idempotent PostHog init voor error tracking (ook zonder analytics-consent). */
export function ensurePostHogClientInitialized(): boolean {
  if (typeof window === "undefined") return false;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return false;
  if (posthogInitOnce) return true;

  const apiHost = clientApiHost();
  if (!apiHost) return false;

  // Cross-domain: start met het distinct_id dat structuro.eu meegaf, zodat de
  // bezoeker 1 persoon blijft. Bootstrap wordt genegeerd als er al een id is.
  const crossDomainDistinctId = readCrossDomainDistinctId();

  posthog.init(key, {
    api_host: apiHost,
    ui_host: "https://eu.posthog.com",
    __add_tracing_headers: posthogTracingHeaderHostnames(),
    ...(crossDomainDistinctId
      ? { bootstrap: { distinctID: crossDomainDistinctId } }
      : {}),
    /** Anonieme acquisitie-personen moeten bestaan om bij login te mergen. */
    person_profiles: "always",
    /** Na opt_out: privacyvriendelijke telling zonder cookies (Paths, pageviews). */
    cookieless_mode: "on_reject",
    capture_performance: {
      web_vitals: false,
    },
    capture_pageview: false,
    capture_pageleave: false,
    autocapture: false,
    /**
     * Exception autocapture: vangt unhandled errors + promise rejections buiten React-boundaries.
     * Console-errors uit (te noisy voor launch). Werkt onafhankelijk van analytics-consent
     * (legitimate interest). $exception-events worden door before_send gesanitised.
     */
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },
    before_send: posthogBeforeSend,
    session_recording: {
      maskAllInputs: true,
    },
    /** Start pas expliciet op acquisitie-routes (zelfde patroon als structuro.eu). */
    disable_session_recording: true,
    mask_all_text: true,
    mask_all_element_attributes: true,
    respect_dnt: true,
    persistence: "localStorage+cookie",
    cross_subdomain_cookie: false,
  });
  posthog.register({
    release: RELEASE_VERSION,
    environment: RELEASE_ENVIRONMENT,
  });
  registerSiteGroup();
  if (crossDomainDistinctId) {
    stripCrossDomainDistinctIdFromUrl();
  }
  posthogInitOnce = true;
  return true;
}

function optInCapturingOnce(): void {
  if (replayOptInDone) return;
  replayOptInDone = true;
  try {
    posthog.opt_in_capturing();
  } catch {
    /* ignore */
  }
}

function invokeStartSessionRecording(): void {
  try {
    posthog.set_config({ disable_session_recording: false });
    if (typeof posthog.startSessionRecording === "function") {
      posthog.startSessionRecording();
    }
  } catch {
    /* ignore */
  }
}

/**
 * Cookieless acquisitie/activatie: opt-in + recording na consent-deny.
 * posthog.opt_out_capturing() mag hier niet: bij cookieless_mode on_reject vernietigt
 * dat sessionRecording en blokkeert replay (consent.isOptedOut() blijft true).
 */
export function bootstrapCookielessSessionReplay(
  pathname?: string | null
): void {
  if (typeof window === "undefined" || !posthogInitOnce) return;
  const path = pathname ?? window.location.pathname;
  if (!isCookielessAnalyticsPath(path)) return;

  optInCapturingOnce();

  const start = () => invokeStartSessionRecording();

  if (!marketingReplayBootstrapped) {
    marketingReplayBootstrapped = true;
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(start, { timeout: 2500 });
    } else {
      setTimeout(start, 400);
    }
    return;
  }

  start();
}

/** Schakel product-analytics features in/uit zonder error tracking of replay te blokkeren. */
export function applyPostHogAnalyticsConsent(
  granted: boolean,
  pathname?: string | null
): void {
  if (!posthogInitOnce) return;
  try {
    if (granted) {
      optInCapturingOnce();
      posthog.set_config({
        capture_pageleave: true,
        capture_performance: { web_vitals: true },
      });
      registerSiteGroup();
      invokeStartSessionRecording();
    } else {
      posthog.set_config({
        capture_pageleave: false,
        capture_performance: { web_vitals: false },
      });
      bootstrapCookielessSessionReplay(pathname);
    }
  } catch {
    /* ignore */
  }
}

export function isPostHogClientInitialized(): boolean {
  return posthogInitOnce;
}
