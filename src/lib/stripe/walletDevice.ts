import type { WalletKind } from "@/lib/stripe/walletBootstrap";

/** Wallet-knoppen per apparaat (User-Agent). Zelfde logica client en server. */
export function getVisibleWalletButtonsFromUserAgent(
  userAgent: string
): WalletKind[] {
  if (/iPad|iPhone|iPod/i.test(userAgent)) return ["applePay"];
  if (/Android/i.test(userAgent)) return ["googlePay"];
  return ["applePay", "googlePay"];
}
