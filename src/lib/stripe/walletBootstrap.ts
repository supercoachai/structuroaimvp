import {
  loadStripe,
  type PaymentRequest,
  type PaymentRequestPaymentMethodEvent,
  type Stripe,
} from "@stripe/stripe-js";
import { resolveStripePublishableKey } from "@/lib/stripe/stripePublishable";

export type WalletKind = "applePay" | "googlePay";

import { getVisibleWalletButtonsFromUserAgent } from "@/lib/stripe/walletDevice";

/** Client-side: zelfde regels als server User-Agent detectie. */
export function getVisibleWalletButtonsForDevice(): WalletKind[] {
  if (typeof navigator === "undefined") return [];
  return getVisibleWalletButtonsFromUserAgent(navigator.userAgent);
}

const AMOUNT_CENTS = 1299;

const PAYMENT_REQUEST_BASE = {
  country: "NL" as const,
  currency: "eur" as const,
  total: {
    label: "Structuro · €12,99/maand",
    amount: AMOUNT_CENTS,
  },
  requestPayerEmail: true,
  requestPayerName: true,
};

let publishableKeyPromise: Promise<string | null> | null = null;
let stripePromise: Promise<Stripe | null> | null = null;
let walletInitPromise: Promise<WalletInitResult> | null = null;

/** Wordt per render bijgewerkt; init draait maar één keer per pagina-load. */
export const walletPaymentHandlers: {
  onPaymentMethod: ((ev: PaymentRequestPaymentMethodEvent) => void) | null;
} = { onPaymentMethod: null };

function getPublishableKey(): Promise<string | null> {
  if (!publishableKeyPromise) {
    publishableKeyPromise = resolveStripePublishableKey();
  }
  return publishableKeyPromise;
}

export function getSharedStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = getPublishableKey().then((key) =>
      key ? loadStripe(key) : null
    );
  }
  return stripePromise;
}

/** Start Stripe.js + domein-check zo vroeg mogelijk (niet-blokkerend). */
export function preloadStripeWallet(): void {
  if (typeof window === "undefined") return;
  void getSharedStripe();
  void ensureWalletPaymentRequests();
  void fetch("/api/stripe/ensure-payment-domain", {
    method: "POST",
    credentials: "include",
  }).catch(() => {});
}

function createPaymentRequest(stripe: Stripe, kind: WalletKind): PaymentRequest {
  const pr = stripe.paymentRequest({
    ...PAYMENT_REQUEST_BASE,
    disableWallets:
      kind === "applePay"
        ? ["googlePay", "link", "browserCard"]
        : ["applePay", "link", "browserCard"],
  });
  pr.on("paymentmethod", (ev) => {
    walletPaymentHandlers.onPaymentMethod?.(ev);
  });
  return pr;
}

export type WalletInitResult = {
  available: Record<WalletKind, boolean>;
  requests: Record<WalletKind, PaymentRequest | null>;
};

async function runWalletInit(kinds: WalletKind[]): Promise<WalletInitResult> {
  const empty: WalletInitResult = {
    available: { applePay: false, googlePay: false },
    requests: { applePay: null, googlePay: null },
  };

  if (!kinds.length) return empty;

  const stripe = await getSharedStripe();
  if (!stripe) return empty;

  const entries = await Promise.all(
    kinds.map(async (kind) => {
      const pr = createPaymentRequest(stripe, kind);
      const canPay = await pr.canMakePayment();
      const ready =
        kind === "applePay"
          ? Boolean(canPay?.applePay)
          : Boolean(canPay?.googlePay);
      return { kind, ready, pr: ready ? pr : null };
    })
  );

  const result = { ...empty };
  for (const { kind, ready, pr } of entries) {
    result.available[kind] = ready;
    result.requests[kind] = pr;
  }
  return result;
}

/** Eén gedeelde init per pagina-load; voorkomt dubbele Stripe-setup en UI-flitsen. */
export function ensureWalletPaymentRequests(): Promise<WalletInitResult> {
  const kinds = getVisibleWalletButtonsForDevice();
  if (!kinds.length) {
    return Promise.resolve({
      available: { applePay: false, googlePay: false },
      requests: { applePay: null, googlePay: null },
    });
  }
  if (!walletInitPromise) {
    walletInitPromise = runWalletInit(kinds);
  }
  return walletInitPromise;
}
