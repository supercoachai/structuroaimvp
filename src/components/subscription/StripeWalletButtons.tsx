"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PaymentRequest } from "@stripe/stripe-js";
import {
  ensureWalletPaymentRequests,
  walletPaymentHandlers,
  type WalletKind,
} from "@/lib/stripe/walletBootstrap";
import {
  isCheckoutFallbackError,
  mapWalletError,
} from "@/lib/stripe/walletErrors";

type StripeWalletButtonsProps = {
  visibleWallets: WalletKind[];
  disabled?: boolean;
  onSuccess: () => void;
  onError: (message: string) => void;
  onUnavailable: () => void;
};

export function StripeWalletButtons({
  visibleWallets,
  disabled = false,
  onSuccess,
  onError,
  onUnavailable,
}: StripeWalletButtonsProps) {
  const showApplePay = visibleWallets.includes("applePay");
  const showGooglePay = visibleWallets.includes("googlePay");

  const paymentRequestsRef = useRef<Record<WalletKind, PaymentRequest | null>>({
    applePay: null,
    googlePay: null,
  });
  const availableRef = useRef<Record<WalletKind, boolean>>({
    applePay: false,
    googlePay: false,
  });
  const readyRef = useRef(false);
  const callbacksRef = useRef({ onSuccess, onError, onUnavailable });
  const [walletBusy, setWalletBusy] = useState(false);

  callbacksRef.current = { onSuccess, onError, onUnavailable };

  useEffect(() => {
    walletPaymentHandlers.onPaymentMethod = (ev) => {
      void (async () => {
        const { onSuccess: ok, onError: err, onUnavailable: fallback } =
          callbacksRef.current;
        try {
          const res = await fetch("/api/stripe/wallet-subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ paymentMethodId: ev.paymentMethod.id }),
          });
          const data = (await res.json()) as { ok?: boolean; error?: string };
          if (!res.ok || !data.ok) {
            ev.complete("fail");
            if (isCheckoutFallbackError(data.error)) {
              fallback();
            } else {
              err(mapWalletError(data.error));
            }
            return;
          }
          ev.complete("success");
          ok();
        } catch {
          ev.complete("fail");
          fallback();
        }
      })();
    };

    let cancelled = false;
    void ensureWalletPaymentRequests().then((result) => {
      if (cancelled) return;
      paymentRequestsRef.current = result.requests;
      availableRef.current = result.available;
      readyRef.current = true;
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const waitForReady = useCallback(async (maxMs = 4000) => {
    if (readyRef.current) return true;
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      await new Promise((r) => setTimeout(r, 50));
      if (readyRef.current) return true;
    }
    return readyRef.current;
  }, []);

  const openWallet = useCallback(
    async (kind: WalletKind) => {
      if (disabled || walletBusy) return;

      const ready = await waitForReady();
      if (!ready) {
        onUnavailable();
        return;
      }

      const pr = paymentRequestsRef.current[kind];
      if (!pr || !availableRef.current[kind]) {
        onUnavailable();
        return;
      }

      setWalletBusy(true);
      try {
        const canPay = await pr.canMakePayment();
        const isReady =
          kind === "applePay" ? canPay?.applePay : canPay?.googlePay;
        if (!isReady) {
          onUnavailable();
          return;
        }
        await pr.show();
      } catch (err: unknown) {
        const name =
          typeof err === "object" && err && "name" in err
            ? String((err as { name?: string }).name)
            : "";
        if (name !== "AbortError") {
          onUnavailable();
        }
      } finally {
        setWalletBusy(false);
      }
    },
    [disabled, onUnavailable, waitForReady, walletBusy]
  );

  if (!showApplePay && !showGooglePay) return null;

  const rowClass =
    visibleWallets.length > 1 ? "wallet-row wallet-row--two" : "wallet-row wallet-row--one";

  return (
    <div className={rowClass} aria-label="Wallet-betaling">
      {showApplePay ? (
        <button
          type="button"
          className="apple-pay-btn"
          disabled={disabled || walletBusy}
          onClick={() => void openWallet("applePay")}
          aria-label="Apple Pay"
        >
          <ApplePayMark />
        </button>
      ) : null}
      {showGooglePay ? (
        <button
          type="button"
          className="samsung-pay-btn"
          disabled={disabled || walletBusy}
          onClick={() => void openWallet("googlePay")}
          aria-label="Google Pay"
        >
          <span className="samsung-label">GOOGLE</span>
          Pay
        </button>
      ) : null}
    </div>
  );
}

function ApplePayMark() {
  return (
    <span className="apple-pay-mark" aria-hidden>
      <svg viewBox="0 0 24 28" className="apple-pay-logo">
        <path
          fill="currentColor"
          d="M18.71 14.77c-.03-3.2 2.61-4.74 2.73-4.82-1.49-2.17-3.8-2.47-4.62-2.5-1.97-.2-3.84 1.16-4.84 1.16-.99 0-2.53-1.13-4.16-1.1-2.14.03-4.11 1.24-5.21 3.15-2.22 3.85-.57 9.55 1.6 12.68 1.06 1.53 2.32 3.25 3.98 3.19 1.6-.06 2.2-1.03 4.13-1.03 1.93 0 2.47 1.03 4.15.99 1.72-.03 2.81-1.56 3.86-3.1 1.22-1.77 1.72-3.49 1.75-3.58-.04-.02-3.36-1.29-3.39-5.12zM15.28 4.38c.87-1.05 1.46-2.52 1.3-3.98-1.26.05-2.78.84-3.68 1.88-.8.93-1.5 2.42-1.31 3.85 1.39.11 2.81-.71 3.69-1.75z"
        />
      </svg>
      <span className="apple-pay-text">Pay</span>
    </span>
  );
}
