"use client";

import { useEffect } from "react";

import { captureUtmOnFirstVisit } from "@/lib/posthog/signupAttribution";

/** Eerste-touch UTM op elke app-route (sessionStorage tot signup). */
export function SignupAttributionCapture() {
  useEffect(() => {
    captureUtmOnFirstVisit();
  }, []);
  return null;
}
