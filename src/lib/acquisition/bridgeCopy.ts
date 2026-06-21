import type { BridgeChannel } from "@/lib/acquisition/bridgePaths";

export type BridgePresentation = {
  /** Overschrijft campagne-CTA (bijv. geen proefdagen op organische bridge). */
  ctaLabel?: string;
  /** Overschrijft de trust-regel onder de knop. */
  footerNote?: string;
  /** Geen trust-regel onder de knop. */
  hideFooterNote?: boolean;
};

export function getBridgePresentation(channel: BridgeChannel): BridgePresentation {
  if (channel === "organic") {
    return {
      ctaLabel: "Start gratis",
      hideFooterNote: true,
    };
  }
  return {
    ctaLabel: "Start met Structuro",
    footerNote: "Geen verplichtingen. Jij bepaalt het tempo.",
  };
}
