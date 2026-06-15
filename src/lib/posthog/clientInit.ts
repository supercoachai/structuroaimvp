"use client";

import posthog from "posthog-js";
import type { CaptureResult } from "posthog-js";

import { posthogTracingHeaderHostnames } from "./tracingHeaders";
import { sanitizeExceptionContext } from "./sanitizeExceptionContext";

let posthogInitOnce = false;

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
function exceptionBeforeSend(cr: CaptureResult | null): CaptureResult | null {
  if (!cr) return cr;
  if (cr.event !== "$exception") return cr;
  if (!cr.properties || typeof cr.properties !== "object") return cr;

  const preserved: Record<string, unknown> = {};
  const custom: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(cr.properties)) {
    if (key.startsWith("$")) preserved[key] = value;
    else custom[key] = value;
  }

  cr.properties = {
    ...preserved,
    ...sanitizeExceptionContext(custom),
    error_tracking: true,
  };
  return cr;
}

function clientApiHost(): string {
  const fromEnv = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  if (typeof window !== "undefined") return `${window.location.origin}/ph`;
  return "";
}

function registerSiteGroup(): void {
  if (typeof window === "undefined") return;
  const hostname = window.location.hostname;
  let site = "dev";
  if (hostname.includes("structuro.eu")) site = "eu";
  else if (hostname.includes("structuro.ai")) site = "ai";
  posthog.register({ site });
}

/** Idempotent PostHog init voor error tracking (ook zonder analytics-consent). */
export function ensurePostHogClientInitialized(): boolean {
  if (typeof window === "undefined") return false;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return false;
  if (posthogInitOnce) return true;

  const apiHost = clientApiHost();
  if (!apiHost) return false;

  posthog.init(key, {
    api_host: apiHost,
    ui_host: "https://eu.posthog.com",
    __add_tracing_headers: posthogTracingHeaderHostnames(),
    person_profiles: "identified_only",
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
    before_send: exceptionBeforeSend,
    session_recording: {
      maskAllInputs: true,
    },
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
  posthog.set_config({ disable_session_recording: true });
  posthogInitOnce = true;
  return true;
}

function setSessionRecordingEnabled(enabled: boolean): void {
  try {
    posthog.set_config({ disable_session_recording: !enabled });
    if (enabled) {
      if (typeof posthog.startSessionRecording === "function") {
        posthog.startSessionRecording();
      }
      return;
    }
    if (typeof posthog.stopSessionRecording === "function") {
      posthog.stopSessionRecording();
    }
  } catch {
    /* ignore */
  }
}

/** Schakel product-analytics features in/uit zonder error tracking te blokkeren. */
export function applyPostHogAnalyticsConsent(granted: boolean): void {
  if (!posthogInitOnce) return;
  try {
    if (granted) {
      posthog.opt_in_capturing();
      posthog.set_config({
        capture_pageleave: true,
        capture_performance: { web_vitals: true },
      });
      setSessionRecordingEnabled(true);
      registerSiteGroup();
    } else {
      setSessionRecordingEnabled(false);
      posthog.opt_out_capturing();
      posthog.set_config({
        capture_pageleave: false,
        capture_performance: { web_vitals: false },
      });
    }
  } catch {
    /* ignore */
  }
}

export function isPostHogClientInitialized(): boolean {
  return posthogInitOnce;
}
