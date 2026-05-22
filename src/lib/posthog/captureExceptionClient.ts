"use client";

import posthog from "posthog-js";

import { ensurePostHogClientInitialized } from "./clientInit";
import { sanitizeExceptionContext } from "./sanitizeExceptionContext";

type ClientExceptionExtra = Record<string, unknown> & {
  componentStack?: string;
  digest?: string;
  route?: string;
};

/**
 * Client-side exception naar PostHog. Geen analytics-consent vereist (legitimate interest).
 * Stuurt geen user IDs of tokens mee; wel optioneel $session_id voor correlatie.
 */
export function captureClientException(
  error: unknown,
  extra?: ClientExceptionExtra
): void {
  if (typeof window === "undefined") return;
  if (!ensurePostHogClientInitialized()) return;

  const err = error instanceof Error ? error : new Error(String(error));
  let sessionId: string | undefined;
  try {
    sessionId = posthog.get_session_id?.() ?? undefined;
  } catch {
    /* ignore */
  }

  const sanitized = sanitizeExceptionContext(extra);
  const properties: Record<string, unknown> = {
    ...sanitized,
    error_tracking: true,
    legitimate_interest: true,
    runtime: "browser",
  };
  if (sessionId) properties.$session_id = sessionId;

  try {
    posthog.captureException(err, properties);
  } catch {
    /* ignore */
  }
}
