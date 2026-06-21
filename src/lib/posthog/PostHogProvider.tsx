"use client";

import { PostHogProvider as PHProvider } from "posthog-js/react";
import posthog from "posthog-js";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

import {
  applyPostHogAnalyticsConsent,
  bootstrapCookielessSessionReplay,
  ensurePostHogClientInitialized,
} from "./clientInit";
import { useConsent } from "./ConsentContext";
import { isCookielessAnalyticsPath } from "@/lib/marketingPaths";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { consent } = useConsent();
  const pathname = usePathname();

  useEffect(() => {
    if (!ensurePostHogClientInitialized()) return;
    applyPostHogAnalyticsConsent(consent === "granted", pathname);
  }, [consent, pathname]);

  useEffect(() => {
    if (!ensurePostHogClientInitialized()) return;
    if (consent === "unknown") return;
    if (!isCookielessAnalyticsPath(pathname)) return;
    bootstrapCookielessSessionReplay(pathname);
  }, [consent, pathname]);

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
