import type { BridgeChannel } from "@/lib/acquisition/bridgePaths";
import type { Locale } from "@/lib/i18n/types";

export type BridgePresentation = {
  /** Overschrijft campagne-CTA. Bevat expliciete trial-belofte voor organic. */
  ctaLabel?: string;
  /** Overschrijft de trust-regel onder de knop. */
  footerNote?: string;
  /** Geen trust-regel onder de knop. */
  hideFooterNote?: boolean;
};

/**
 * Kanaal-brede default-copy voor de acquisitie-bridge. Doctrine: als de belofte
 * een gratis proefperiode is (organic + tiktok), moet dat in de CTA of vlak
 * onder de CTA zichtbaar zijn. Vage "Start gratis" zonder trial-context is uit.
 * Campagnes kunnen via LpCampaign.ctaLabel nog een eigen framing forceren.
 */
export function getBridgePresentation(
  channel: BridgeChannel,
  locale: Locale = "nl"
): BridgePresentation {
  if (locale === "en") {
    return {
      ctaLabel: "Start 3 days free",
      footerNote:
        channel === "organic"
          ? "Then \u20AC12.99 per month. Cancel anytime."
          : "No commitment. You set the pace.",
    };
  }

  return {
    ctaLabel: "Start 3 dagen gratis",
    footerNote:
      channel === "organic"
        ? "Daarna \u20AC12,99 per maand. Opzegbaar wanneer je wilt."
        : "Geen verplichtingen. Jij bepaalt het tempo.",
  };
}
