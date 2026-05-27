"use client";

import posthog from "posthog-js";

let posthogInitOnce = false;

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
    person_profiles: "identified_only",
    /** Na opt_out: privacyvriendelijke telling zonder cookies (Paths, pageviews). */
    cookieless_mode: "on_reject",
    capture_performance: {
      web_vitals: false,
    },
    capture_pageview: false,
    capture_pageleave: false,
    autocapture: false,
    disable_session_recording: true,
    mask_all_text: true,
    mask_all_element_attributes: true,
    respect_dnt: true,
    persistence: "localStorage+cookie",
    cross_subdomain_cookie: false,
  });
  registerSiteGroup();
  posthogInitOnce = true;
  return true;
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
      registerSiteGroup();
    } else {
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
