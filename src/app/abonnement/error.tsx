"use client";

import { RouteSegmentError } from "@/components/posthog/RouteSegmentError";

/** Stripe checkout return (success_url wijst nu naar /abonnement?from=stripe). */
export default function AbonnementError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteSegmentError
      error={error}
      reset={reset}
      route="/abonnement"
      extra={{ flow: "checkout-return" }}
    />
  );
}
