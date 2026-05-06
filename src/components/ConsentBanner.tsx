"use client";

import { useEffect, useState } from "react";
import { readStoredConsent, writeConsent } from "@/lib/consentStorage";
import { useI18n } from "@/lib/i18n";

/**
 * Non-blokkerend; default geen GA4-tracking tot keuze.
 */
export default function ConsentBanner() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sync = () => {
      try {
        setVisible(readStoredConsent() === null && typeof window !== "undefined");
      } catch {
        setVisible(false);
      }
    };
    sync();
    window.addEventListener("structuro_consent_changed", sync as EventListener);
    return () =>
      window.removeEventListener("structuro_consent_changed", sync as EventListener);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="consent-banner-title"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[300] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1"
    >
      <div className="pointer-events-auto mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
        <p id="consent-banner-title" className="text-sm font-semibold text-slate-900">
          {t("consent.title")}
        </p>
        <p className="mt-1 text-xs leading-snug text-slate-600">{t("consent.body")}</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            className="min-h-[44px] rounded-xl bg-[#2C5BFF] px-3 py-2 text-sm font-semibold text-white hover:opacity-95"
            onClick={() => {
              writeConsent({ analytics: true, marketing: false });
              setVisible(false);
            }}
          >
            {t("consent.acceptAll")}
          </button>
          <button
            type="button"
            className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            onClick={() => {
              writeConsent({ analytics: false, marketing: false });
              setVisible(false);
            }}
          >
            {t("consent.essentialOnly")}
          </button>
          <details className="sm:contents">
            <summary className="min-h-[44px] cursor-pointer list-none rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 sm:border-0 sm:bg-transparent sm:p-0 sm:underline">
              {t("consent.adjust")}
            </summary>
            <div className="mt-3 flex flex-wrap gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 sm:mt-0 sm:w-full sm:border-0 sm:bg-transparent sm:p-0">
              <button
                type="button"
                className="min-h-[40px] rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
                onClick={() => writeConsent({ analytics: true, marketing: false })}
              >
                {t("consent.onlyAnalytics")}
              </button>
              <button
                type="button"
                className="min-h-[40px] rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
                onClick={() => writeConsent({ analytics: false, marketing: true })}
              >
                {t("consent.onlyMarketing")}
              </button>
              <button
                type="button"
                className="min-h-[40px] text-xs font-medium text-slate-500 underline"
                onClick={() => {
                  writeConsent({ analytics: false, marketing: false });
                  setVisible(false);
                }}
              >
                {t("consent.closeAdjust")}
              </button>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
