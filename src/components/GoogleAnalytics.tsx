"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { hasAnalyticsConsent } from "@/lib/consentStorage";

/** Stel in Vercel: NEXT_PUBLIC_GA_MEASUREMENT_ID=G-… */
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "G-S21LBEY64B";

/**
 * GA4 alleen laden na analytics-toestemming (consentStorage).
 */
export function GoogleAnalytics() {
  const [allow, setAllow] = useState(false);

  useEffect(() => {
    const sync = () => setAllow(hasAnalyticsConsent());
    sync();
    const onConsent = () => sync();
    window.addEventListener("structuro_consent_changed", onConsent as EventListener);
    return () => window.removeEventListener("structuro_consent_changed", onConsent as EventListener);
  }, []);

  if (!GA_MEASUREMENT_ID || !allow) return null;

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent','default',{'analytics_storage':'denied','ad_storage':'denied'});
            gtag('consent','update',{'analytics_storage':'granted'});
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `,
        }}
      />
    </>
  );
}
