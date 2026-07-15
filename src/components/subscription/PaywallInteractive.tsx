"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/Toast";
import {
  JASPER_OFFER_DISCOUNTED_MONTHS,
  getJasperOffer,
} from "@/lib/jasper/jasperOffer";
import type { RetentionPaywallReason } from "@/lib/retentionPaywallAccess";
import type { RetentionStats } from "@/lib/retentionStats";
import type { WalletKind } from "@/lib/stripe/walletBootstrap";
import { WALLET_UNAVAILABLE_MESSAGE } from "@/lib/stripe/walletErrors";
import { StripeWalletButtons } from "./StripeWalletButtons";

type DoneMode = "stay" | "stop" | null;

type PaywallInteractiveProps = {
  reason: RetentionPaywallReason;
  visibleWallets: WalletKind[];
  stats: RetentionStats | null;
  /** Jasper-podcast-aanbieding: toon 3-maands kortingsprijs onder de CTA. */
  jasperOffer?: boolean;
};

export function PaywallInteractive({
  reason,
  visibleWallets,
  stats,
  jasperOffer = false,
}: PaywallInteractiveProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [walletFallback, setWalletFallback] = useState(false);
  const [doneMode, setDoneMode] = useState<DoneMode>(null);

  const startCheckout = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan: "monthly" }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        toast(data.error ?? "Kon de betaalpagina niet openen.");
        return;
      }
      window.location.href = data.url;
    } catch {
      toast("Kon de betaalpagina niet openen.");
    } finally {
      setBusy(false);
    }
  }, []);

  const handleStaySuccess = useCallback(() => {
    setDoneMode("stay");
  }, []);

  const handleWalletUnavailable = useCallback(() => {
    setWalletFallback(true);
  }, []);

  const handleWalletError = useCallback((msg: string) => {
    toast.error(msg, { durationMs: 5000 });
  }, []);

  const handleStop = useCallback(() => {
    setDoneMode("stop");
  }, []);

  const handleBackToApp = useCallback(() => {
    router.replace("/");
  }, [router]);

  const isTrialActive = reason === "trial_active";
  const primaryLabel = isTrialActive
    ? "Abonneer nu"
    : "Ik blijf, behoud mijn systeem";

  const doneTitle =
    doneMode === "stop" ? "Helemaal goed." : "Alles blijft staan.";
  const stopText =
    reason === "subscription_ended"
      ? "Je toegang is gestopt. Je account en alles erin bewaren we 30 dagen, je bent altijd welkom terug."
      : "Je toegang loopt nog tot vanavond. Je account en alles erin bewaren we 30 dagen, je bent altijd welkom terug.";
  const doneText =
    doneMode === "stop"
      ? stopText
      : stats
        ? `Je ${stats.daysActive} dagen, je ${stats.tasksCompleted} taken, je ${stats.openTasks} openstaande taken: allemaal nog van jou. Ga zo door.`
        : "Je voortgang blijft van jou. Ga zo door.";

  return (
    <>
      <section className="decision">
        <button
          type="button"
          className="btn-primary"
          disabled={busy}
          onClick={() => void startCheckout()}
        >
          {primaryLabel}
        </button>

        <StripeWalletButtons
          visibleWallets={visibleWallets}
          disabled={busy}
          onSuccess={handleStaySuccess}
          onUnavailable={handleWalletUnavailable}
          onError={handleWalletError}
        />

        {walletFallback ? (
          <div className="wallet-fallback">
            <p className="wallet-fallback-text">{WALLET_UNAVAILABLE_MESSAGE}</p>
            <button
              type="button"
              className="btn-primary"
              disabled={busy}
              onClick={() => void startCheckout()}
            >
              {primaryLabel}
            </button>
          </div>
        ) : null}

        {jasperOffer ? (
          <p className="price-sub">
            {(() => {
              const offer = getJasperOffer();
              return `${offer.discountedPrice} per maand de eerste ${JASPER_OFFER_DISCOUNTED_MONTHS} maanden, daarna ${offer.regularPrice} per maand. Maandelijks opzegbaar.`;
            })()}
          </p>
        ) : (
          <p className="price-sub">€12,99 per maand · maandelijks opzegbaar</p>
        )}
        <div className="secondary">
          {isTrialActive ? (
            <button type="button" onClick={handleBackToApp}>
              Terug naar Structuro
            </button>
          ) : (
            <button type="button" onClick={handleStop}>
              Nu stoppen
            </button>
          )}
        </div>
      </section>

      <div
        className={`done-state${doneMode ? " show" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!doneMode}
      >
        <div className="check">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M5 13l4 4L19 7"
              stroke="#fff"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2>{doneTitle}</h2>
        <p>{doneText}</p>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            if (doneMode === "stay") {
              // /?dagstart=open laat middleware de bounce overslaan: AppLayout
              // pikt de query-param op en opent de DagstartOverlay direct.
              router.replace("/?dagstart=open");
              return;
            }
            setDoneMode(null);
          }}
        >
          Open Structuro
        </button>
      </div>
    </>
  );
}
