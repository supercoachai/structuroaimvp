"use client";

import { PostHogProvider as PHProvider } from "posthog-js/react";
import posthog from "posthog-js";
import { useEffect, useRef } from "react";

import {
  applyPostHogAnalyticsConsent,
  ensurePostHogClientInitialized,
} from "./clientInit";
import { useConsent } from "./ConsentContext";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { consent } = useConsent();
  const prevConsentRef = useRef<typeof consent>(consent);

  useEffect(() => {
    ensurePostHogClientInitialized();
  }, []);

  useEffect(() => {
    if (consent === "unknown") return;
    applyPostHogAnalyticsConsent(consent === "granted");
    prevConsentRef.current = consent;
  }, [consent]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPageHide = () => {
      try {
        posthog.capture("app_pagehide", {}, { transport: "sendBeacon" });
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
