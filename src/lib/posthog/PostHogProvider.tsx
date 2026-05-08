"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect, useRef } from "react";
import { useConsent } from "./ConsentContext";

let posthogInitOnce = false;

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { consent } = useConsent();
  const prevConsentRef = useRef<typeof consent>(consent);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (consent !== "granted") return;

    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;

    if (!posthogInitOnce) {
      posthog.init(key, {
        api_host: `${window.location.origin}/ph`,
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
