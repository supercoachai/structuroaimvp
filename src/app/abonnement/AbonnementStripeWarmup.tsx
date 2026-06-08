"use client";

import { useEffect } from "react";
import Script from "next/script";
import { preloadStripeWallet } from "@/lib/stripe/walletBootstrap";

export function AbonnementStripeWarmup() {
  useEffect(() => {
    preloadStripeWallet();
  }, []);

  return <Script src="https://js.stripe.com/v3/" strategy="beforeInteractive" />;
}
