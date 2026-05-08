"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect, useRef } from "react";
import { useConsent } from "./ConsentContext";

let posthogInitOnce = false;

/** Zet NEXT_PUBLIC_POSTHOG_HOST (bijv. https://eu.i.posthog.com) voor directe EU API; leeg = first-party proxy `${origin}/ph`. */
function clientApiHost(): string {
  const fromEnv = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  if (typeof window !== "undefined") return `${window.location.origin}/ph`;
  return "";
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { consent } = useConsent();
  const prevConsentRef = useRef<typeof consent>(consent);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (consent !== "granted") return;

    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;

    if (!posthogInitOnce) {
      const apiHost = clientApiHost();
      if (!apiHost) return;
      posthog.init(key, {
        api_host: apiHost,
        ui_host: "https://eu.posthog.com",
        person_profiles: "identified_only",
        capture_pageview: false,
        capture_pageleave: true,
        autocapture: false,
        disable_session_recording: true,
        mask_all_text: true,
        mask_all_element_attributes: true,
        respect_dnt: true,
        persistence: "localStorage+cookie",
        cross_subdomain_cookie: false,
      });
      posthog.opt_in_capturing();
      posthogInitOnce = true;
    }
  }, [consent]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (consent === "denied") {
      posthog.opt_out_capturing();
      posthog.reset();
    } else if (prevConsentRef.current === "denied" && consent === "granted") {
      posthog.opt_in_capturing();
    }
    prevConsentRef.current = consent;
  }, [consent]);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
