export const WALLET_UNAVAILABLE_MESSAGE = "Wallet-betaling werkt hier niet.";

const CHECKOUT_FALLBACK_ERRORS = new Set([
  "not_available",
  "missing_payment_method",
  "invalid_json",
]);

export function isCheckoutFallbackError(code: string | undefined | null): boolean {
  if (!code) return true;
  return CHECKOUT_FALLBACK_ERRORS.has(code);
}

const WALLET_ERROR_NL: Record<string, string> = {
  not_available:
    "Wallet-betaling is tijdelijk niet beschikbaar. Klik op Ik blijf, behoud mijn systeem.",
  stripe_not_configured: "Betaling is niet geconfigureerd. Mail info@structuro.eu.",
  unauthorized: "Je bent niet ingelogd. Log opnieuw in en probeer het nog eens.",
  missing_payment_method:
    "Geen betaalmethode ontvangen. Klik op Ik blijf, behoud mijn systeem.",
  previous_refund_exists:
    "Voor een nieuw abonnement na een eerdere terugbetaling, mail info@structuro.eu.",
  invalid_json: "Betaling mislukt. Klik op Ik blijf, behoud mijn systeem.",
};

export function mapWalletError(code: string | undefined | null): string {
  if (!code) return "Betaling mislukt. Klik op Ik blijf, behoud mijn systeem.";
  return (
    WALLET_ERROR_NL[code] ??
    `Betaling mislukt (${code}). Klik op Ik blijf, behoud mijn systeem.`
  );
}
