'use client';

import { useConsent } from '@/contexts/ConsentContext';

/**
 * Subtiele AVG-conforme melding: GA4 wordt pas geladen na expliciete toestemming.
 * Geen dark patterns: "Nee" en "Ja" visueel in balans.
 */
export function ConsentBanner() {
  const {
    showConsentBanner,
    grantAnalyticsConsent,
    denyAnalyticsConsent,
    analyticsConsent,
  } = useConsent();

  if (!showConsentBanner) return null;

  const isChangingMind = analyticsConsent !== 'pending';

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[45] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 pointer-events-none"
      role="dialog"
      aria-labelledby="consent-banner-title"
      aria-describedby="consent-banner-desc"
    >
      <div className="mx-auto max-w-2xl pointer-events-auto rounded-2xl border border-slate-200/90 bg-white/95 shadow-lg backdrop-blur-sm px-4 py-3 sm:px-5 sm:py-4">
        <h2
          id="consent-banner-title"
          className="text-sm font-semibold text-slate-900"
        >
          {isChangingMind ? 'Analysevoorkeur aanpassen' : 'Helpen met anonieme statistieken?'}
        </h2>
        <p
          id="consent-banner-desc"
          className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed"
        >
          We willen graag begrijpen hoe de app gebruikt wordt om de flow te verbeteren. Als je
          akkoord gaat, laden we Google Analytics (GA4) pas nu — niet eerder. Je kunt dit altijd
          wijzigen onder Instellingen.
        </p>

        <details className="mt-2 group">
          <summary className="text-xs text-slate-500 cursor-pointer select-none hover:text-slate-700 list-none flex items-center gap-1">
            <span className="underline decoration-slate-300 group-open:decoration-slate-400">
              Meer over privacy (optioneel)
            </span>
          </summary>
          <p className="mt-2 text-[11px] sm:text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-2">
            GA4 gebruiken we alleen voor gebruiksstatistieken. Zet je analytics uit, dan wordt er
            geen meetscript geladen. In je privacyverklaring kun je verder uitleggen wat je meet en
            waarom (transparantie, AVG). IP-anonimisering is in GA4 standaard; advertentie-signalen
            schakelen we in de technische configuratie uit.
          </p>
        </details>

        <div className="mt-3 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end sm:items-center">
          <button
            type="button"
            onClick={denyAnalyticsConsent}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-semibold border-2 border-slate-200 bg-white text-slate-800 hover:bg-slate-50 transition-colors"
          >
            Nee, liever niet
          </button>
          <button
            type="button"
            onClick={grantAnalyticsConsent}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            Ja, help mee
          </button>
        </div>
      </div>
    </div>
  );
}
