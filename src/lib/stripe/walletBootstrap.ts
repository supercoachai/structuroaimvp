import {
  loadStripe,
  type PaymentRequest,
  type PaymentRequestPaymentMethodEvent,
  type Stripe,
} from "@stripe/stripe-js";
import { resolveStripePublishableKey } from "@/lib/stripe/stripePublishable";
import { getVisibleWalletButtonsFromUserAgent } from "@/lib/stripe/walletDevice";

export type WalletKind = "applePay" | "googlePay";

/** Client-side: zelfde regels als server User-Agent detectie. */
export function getVisibleWalletButtonsForDevice(): WalletKind[] {
  if (typeof navigator === "undefined") return [];
  return getVisibleWalletButtonsFromUserAgent(navigator.userAgent);
}

/** Na proef / standaard abonnement (Apple Pay weigert vaak €0). */
const PAID_AMOUNT_CENTS = 1299;

export type WalletPaymentRequestOptions = {
  /**
   * Card-trial paywall: toon proef-copy. Amount blijft >0 zodat Apple Pay
   * op iOS een werkende sheet opent (Checkout €0-trial breekt wallets).
   */
  trialDays?: number;
  /** monthly (default) of yearly: sheet-label + bedrag. */
  plan?: "monthly" | "yearly";
};

/** Jaarprijs in centen (live Stripe yearly = €119). */
const YEARLY_AMOUNT_CENTS = 11900;

function paymentRequestBase(opts?: WalletPaymentRequestOptions) {
  const trialDays =
    typeof opts?.trialDays === "number" && opts.trialDays > 0
      ? Math.floor(opts.trialDays)
      : 0;
  const yearly = opts?.plan === "yearly";
  const amount = yearly ? YEARLY_AMOUNT_CENTS : PAID_AMOUNT_CENTS;
  const afterPrice = yearly ? "€119/jaar" : "€12,99/mnd";
  const label =
    trialDays > 0
      ? `Structuro · ${trialDays}d gratis, daarna ${afterPrice}`
      : yearly
        ? "Structuro · €119/jaar"
        : "Structuro · €12,99/maand";
  return {
    country: "NL" as const,
    currency: "eur" as const,
    total: {
      label,
      // Apple Pay + Payment Request: €0-sheets falen of blijven hangen (NL-bank).
      // We tonen de abonnementsprijs; wallet-subscribe start wél een trial zonder incasso.
      amount,
    },
    requestPayerEmail: true,
    requestPayerName: true,
  };
}

let publishableKeyPromise: Promise<string | null> | null = null;
let stripePromise: Promise<Stripe | null> | null = null;
const walletInitByKey = new Map<string, Promise<WalletInitResult>>();

/** Wordt per render bijgewerkt; init draait per config-key. */
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

function walletInitKey(opts?: WalletPaymentRequestOptions): string {
  const trialDays =
    typeof opts?.trialDays === "number" && opts.trialDays > 0
      ? Math.floor(opts.trialDays)
      : 0;
  const plan = opts?.plan === "yearly" ? "yearly" : "monthly";
  return trialDays > 0 ? `trial:${trialDays}:${plan}` : `default:${plan}`;
}

/** Start Stripe.js + domein-check zo vroeg mogelijk (niet-blokkerend). */
export function preloadStripeWallet(opts?: WalletPaymentRequestOptions): void {
  if (typeof window === "undefined") return;
  void getSharedStripe();
  void ensureWalletPaymentRequests(opts);
  void fetch("/api/stripe/ensure-payment-domain", {
    method: "POST",
    credentials: "include",
  }).catch(() => {});
}

function createPaymentRequest(
  stripe: Stripe,
  kind: WalletKind,
  opts?: WalletPaymentRequestOptions
): PaymentRequest {
  const pr = stripe.paymentRequest({
    ...paymentRequestBase(opts),
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

async function runWalletInit(
  kinds: WalletKind[],
  opts?: WalletPaymentRequestOptions
): Promise<WalletInitResult> {
  const empty: WalletInitResult = {
    available: { applePay: false, googlePay: false },
    requests: { applePay: null, googlePay: null },
  };

  if (!kinds.length) return empty;

  const stripe = await getSharedStripe();
  if (!stripe) return empty;

  const entries = await Promise.all(
    kinds.map(async (kind) => {
      const pr = createPaymentRequest(stripe, kind, opts);
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

/** Eén gedeelde init per config-key; voorkomt dubbele Stripe-setup en UI-flitsen. */
export function ensureWalletPaymentRequests(
  opts?: WalletPaymentRequestOptions
): Promise<WalletInitResult> {
  const kinds = getVisibleWalletButtonsForDevice();
  if (!kinds.length) {
    return Promise.resolve({
      available: { applePay: false, googlePay: false },
      requests: { applePay: null, googlePay: null },
    });
  }
  const key = walletInitKey(opts);
  let pending = walletInitByKey.get(key);
  if (!pending) {
    pending = runWalletInit(kinds, opts);
    walletInitByKey.set(key, pending);
  }
  return pending;
}

/** True als Apple Pay of Google Pay op dit device beschikbaar is. */
export async function deviceHasWalletPay(
  opts?: WalletPaymentRequestOptions
): Promise<boolean> {
  const result = await ensureWalletPaymentRequests(opts);
  return result.available.applePay || result.available.googlePay;
}
