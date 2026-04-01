'use client';

import Script from 'next/script';
import { useConsent } from '@/contexts/ConsentContext';

/** Stel in Vercel: NEXT_PUBLIC_GA_MEASUREMENT_ID=G-... (fallback = productie-ID) */
const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? 'G-S21LBEY64B';

/**
 * Laadt gtag alleen na expliciete toestemming (ConsentContext).
 * Privacy-vriendelijke config: geen Google Signals / ad-personalization voor advertenties.
 */
export function GoogleAnalytics() {
  const { consentReady, hasAnalyticsConsent } = useConsent();

  if (!GA_MEASUREMENT_ID || !consentReady || !hasAnalyticsConsent) {
    return null;
  }

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
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              allow_google_signals: false,
              allow_ad_personalization_signals: false
            });
          `,
        }}
      />
    </>
  );
}
