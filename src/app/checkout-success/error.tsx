"use client";

import { RouteSegmentError } from "@/components/posthog/RouteSegmentError";

/** Alias voor toekomstige success_url; redirect in page.tsx. */
export default function CheckoutSuccessError({
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
      route="/checkout-success"
      extra={{ flow: "checkout-success" }}
    />
  );
}
