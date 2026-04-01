'use client';

import Script from 'next/script';
import { useEffect } from 'react';
import { useConsent } from '@/contexts/ConsentContext';

/** Stel in Vercel: NEXT_PUBLIC_GA_MEASUREMENT_ID=G-... (fallback = productie-ID) */
const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? 'G-S21LBEY64B';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/**
 * Google tag + Consent Mode v2:
 * - Tag staat altijd op de pagina (Google "tag gevonden" / Tag Assistant), maar
 *   analytics is standaard uit tot de gebruiker "Ja, help mee" kiest.
 * @see https://developers.google.com/tag-platform/security/guides/consent
 */
export function GoogleAnalytics() {
  const { consentReady, analyticsConsent } = useConsent();

  useEffect(() => {
    if (!consentReady || typeof window === 'undefined' || !GA_MEASUREMENT_ID) return;
    if (analyticsConsent === 'pending') return;

    const tick = () => {
      if (typeof window.gtag !== 'function') return false;
      if (analyticsConsent === 'granted') {
        window.gtag('consent', 'update', {
          analytics_storage: 'granted',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
        });
      } else {
        window.gtag('consent', 'update', {
          analytics_storage: 'denied',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
        });
      }
      return true;
    };

    if (tick()) return;
    const id = window.setInterval(() => {
      if (tick()) window.clearInterval(id);
    }, 50);
    const t = window.setTimeout(() => window.clearInterval(id), 5000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(t);
    };
  }, [consentReady, analyticsConsent]);

  if (!GA_MEASUREMENT_ID || !consentReady) {
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
            gtag('consent', 'default', {
              'analytics_storage': 'denied',
              'ad_storage': 'denied',
              'ad_user_data': 'denied',
              'ad_personalization': 'denied'
            });
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `,
        }}
      />
    </>
  );
}
