"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type AbonnementStripeSyncProps = {
  redirectAfterStripe: boolean;
};

/** Na Stripe-checkout terug: sync abonnement en door naar dagstart. */
export function AbonnementStripeSync({
  redirectAfterStripe,
}: AbonnementStripeSyncProps) {
  const router = useRouter();

  useEffect(() => {
    if (!redirectAfterStripe) return;

    let cancelled = false;
    void (async () => {
      await sleep(1500);
      if (cancelled) return;
      try {
        await fetch("/api/stripe/sync-subscription", {
          method: "POST",
          credentials: "include",
        });
      } catch {
        /* best-effort */
      }
      if (!cancelled) router.replace("/dagstart");
    })();

    return () => {
      cancelled = true;
    };
  }, [redirectAfterStripe, router]);

  return null;
}
