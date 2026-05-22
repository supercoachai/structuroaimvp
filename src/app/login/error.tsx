"use client";

import { RouteSegmentError } from "@/components/posthog/RouteSegmentError";

export default function LoginError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteSegmentError error={error} reset={reset} route="/login" />;
}
