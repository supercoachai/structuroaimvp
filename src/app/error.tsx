"use client";

import { RouteSegmentError } from "@/components/posthog/RouteSegmentError";

/** Hoofd-app shell: dagstart, todo, focus, settings, etc. */
export default function AppShellError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteSegmentError error={error} reset={reset} route="app-shell" />;
}
