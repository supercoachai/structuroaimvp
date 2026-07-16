"use client";

import { useCallback, useEffect, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";

import { toast } from "@/components/Toast";
import { StripeWalletButtons } from "@/components/subscription/StripeWalletButtons";
import {
  JASPER_OFFER_DISCOUNTED_MONTHS,
  getJasperOffer,
} from "@/lib/jasper/jasperOffer";
import type { RetentionPaywallReason } from "@/lib/retentionPaywallAccess";
import type { RetentionStats } from "@/lib/retentionStats";
import { DEFAULT_STRIPE_TRIAL_DAYS } from "@/lib/stripe/trialConfig";
import { preloadStripeWallet, type WalletKind } from "@/lib/stripe/walletBootstrap";
import { WALLET_UNAVAILABLE_MESSAGE } from "@/lib/stripe/walletErrors";

import { V2Eyebrow, V2Header, V2Page } from "./V2Chrome";
import { useV2 } from "./V2Context";
import { v2Styles } from "./theme";
import { loadV2Tasks } from "./v2Tasks";

type DoneMode = "stay" | "stop" | null;

type PaywallWhyAnchor = {
  why: string;
  outcome: string | null;
  sourceLabel: string | null;
};

/** Journey-why eerst (sterker anker), anders oudste taak-why. */
function resolvePaywallWhyAnchor(
  journeyWhy: string,
  journeyOutcome: string
): PaywallWhyAnchor | null {
  const why = journeyWhy.trim();
  if (why.length > 0) {
    return {
      why,
      outcome: journeyOutcome.trim() || null,
      sourceLabel: null,
    };
  }
  if (typeof window === "undefined") return null;
  const withWhy = loadV2Tasks().filter(
    (t) => t.why && t.why.trim().length > 0
  );
  if (withWhy.length === 0) return null;
  const task = [...withWhy].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  )[0];
  return {
    why: task.why!.trim(),
    outcome: task.outcome?.trim() || null,
    sourceLabel: task.title.trim() || null,
  };
}

export type AbonnementV2ClientProps = {
  reason: RetentionPaywallReason;
  trialDays: number;
  trialDaysLeft?: number;
  visibleWallets: WalletKind[];
  jasperOffer?: boolean;
  stats: RetentionStats;
  /** True als er een echte sessie is (checkout mogelijk). */
  canCheckout: boolean;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function AbonnementV2Client({
  reason,
  trialDays,
  trialDaysLeft,
  visibleWallets,
  jasperOffer = false,
  stats,
  canCheckout,
}: AbonnementV2ClientProps) {
  const router = useRouter();
  const { state } = useV2();
  const [busy, setBusy] = useState(false);
  const [walletFallback, setWalletFallback] = useState(false);
  const [doneMode, setDoneMode] = useState<DoneMode>(null);
  const [whyAnchor, setWhyAnchor] = useState<PaywallWhyAnchor | null>(null);

  useEffect(() => {
    preloadStripeWallet();
  }, []);

  useEffect(() => {
    setWhyAnchor(resolvePaywallWhyAnchor(state.why, state.whyOutcome));
  }, [state.why, state.whyOutcome]);

  const isTrialActive = reason === "trial_active";
  // Altijd de granted trial van dit account (stats.trialDays = signup_source).
  const displayTrialDays =
    Number.isFinite(stats.trialDays) && stats.trialDays > 0
      ? stats.trialDays
      : Number.isFinite(trialDays) && trialDays > 0
        ? trialDays
        : DEFAULT_STRIPE_TRIAL_DAYS;
  const daysLeft =
    trialDaysLeft != null && Number.isFinite(trialDaysLeft) && trialDaysLeft > 0
      ? trialDaysLeft
      : displayTrialDays;

  const kicker = isTrialActive
    ? "Je proef loopt nog"
    : reason === "subscription_ended"
      ? "Je toegang is beëindigd"
      : "Je proefperiode is voorbij";

  const headline = isTrialActive
    ? `Nog ${daysLeft} ${daysLeft === 1 ? "dag" : "dagen"} gratis`
    : `Dit bouwde je in ${displayTrialDays} dagen op.`;

  const lead = isTrialActive ? (
    <>
      Je kunt Structuro nu alvast vastleggen. Dan ga je na je proef gewoon door,
      zonder onderbreking. Je voortgang blijft staan.
    </>
  ) : (
    <>
      {displayTrialDays} dagen lang hield Structuro je op koers. Je ritme, je lijsten,
      je rust: die blijven precies zoals ze nu zijn.{" "}
      <strong>Dit ritme blijft staan als je doorgaat.</strong>
    </>
  );

  const primaryLabel = isTrialActive
    ? "Abonneer nu"
    : "Ik blijf, behoud mijn systeem";

  const startCheckout = useCallback(async () => {
    if (!canCheckout) {
      toast("Log eerst in om te betalen.");
      router.push("/v2/login?next=/v2/abonnement");
      return;
    }
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
  }, [canCheckout, router]);

  const handleStaySuccess = useCallback(() => {
    setDoneMode("stay");
  }, []);

  const handleStop = useCallback(() => {
    setDoneMode("stop");
  }, []);

  const doneTitle =
    doneMode === "stop" ? "Helemaal goed." : "Alles blijft staan.";
  const stopText =
    reason === "subscription_ended"
      ? "Je toegang is gestopt. Je account en alles erin bewaren we 30 dagen, je bent altijd welkom terug."
      : "Je toegang loopt nog tot vanavond. Je account en alles erin bewaren we 30 dagen, je bent altijd welkom terug.";
  const doneText =
    doneMode === "stop"
      ? stopText
      : `Je ${stats.daysActive} dagen, je ${stats.tasksCompleted} taken, je ${stats.openTasks} openstaande taken: allemaal nog van jou. Ga zo door.`;

  return (
    <V2Page>
      <Script src="https://js.stripe.com/v3/" strategy="afterInteractive" />
      <V2Header exitHref="/v2/home" exitLabel="Naar home" />

      <div className="v2-abonnement v2-fade">
        {!canCheckout ? (
          <p className="v2-preview-badge">Preview · log in voor echte checkout</p>
        ) : null}
        <V2Eyebrow>{kicker}</V2Eyebrow>
        <h1 style={{ ...v2Styles.title, fontSize: "var(--fs-display)", marginTop: 8 }}>
          {headline}
        </h1>

        <section className="v2-abonnement__built" aria-label="Jouw Structuro tot nu toe">
          <p className="v2-abonnement__built-label">Jouw Structuro tot nu toe</p>
          <div className="v2-abonnement__stats">
            <Stat n={stats.daysActive} label="dagen op rij actief" />
            <Stat n={stats.tasksCompleted} label="taken afgevinkt" />
            <Stat n={stats.openTasks} label="openstaande taken" />
          </div>
          <div className="v2-abonnement__streak" aria-hidden>
            {Array.from({ length: stats.trialDays }, (_, i) => (
              <span key={i} data-on={i < stats.streakFilled ? "true" : "false"} />
            ))}
          </div>
        </section>

        <p style={{ ...v2Styles.body, marginTop: 4 }}>{lead}</p>

        {whyAnchor ? (
          <aside className="v2-abonnement__why" aria-label="Jouw waarom">
            <p className="v2-abonnement__why-label">Jouw waarom</p>
            <p className="v2-abonnement__why-text">
              {whyAnchor.sourceLabel
                ? `Bij “${whyAnchor.sourceLabel}” schreef je: “${whyAnchor.why}”`
                : `Je deed dit voor: “${whyAnchor.why}”`}
            </p>
            {whyAnchor.outcome ? (
              <p className="v2-abonnement__why-outcome">
                Dat levert je op: {whyAnchor.outcome}
              </p>
            ) : null}
            <p className="v2-abonnement__why-nudge">
              Dat verdwijnt niet. Als je doorgaat, blijft dit anker staan.
            </p>
          </aside>
        ) : null}

        <section className="v2-abonnement__decision">
          <button
            type="button"
            className="btn-primary w-full"
            disabled={busy}
            onClick={() => void startCheckout()}
          >
            {primaryLabel}
          </button>

          {canCheckout ? (
            <StripeWalletButtons
              visibleWallets={visibleWallets}
              disabled={busy}
              onSuccess={handleStaySuccess}
              onUnavailable={() => setWalletFallback(true)}
              onError={(msg) => toast.error(msg, { durationMs: 5000 })}
            />
          ) : null}

          {walletFallback ? (
            <div className="v2-abonnement__wallet-fallback">
              <p style={{ ...v2Styles.body, fontSize: 14, margin: 0 }}>
                {WALLET_UNAVAILABLE_MESSAGE}
              </p>
              <button
                type="button"
                className="btn-primary w-full"
                disabled={busy}
                onClick={() => void startCheckout()}
              >
                {primaryLabel}
              </button>
            </div>
          ) : null}

          {jasperOffer ? (
            <p className="v2-abonnement__price">
              {(() => {
                const offer = getJasperOffer();
                return `${offer.discountedPrice} per maand de eerste ${JASPER_OFFER_DISCOUNTED_MONTHS} maanden, daarna ${offer.regularPrice} per maand. Maandelijks opzegbaar.`;
              })()}
            </p>
          ) : (
            <p className="v2-abonnement__price">€12,99 per maand · maandelijks opzegbaar</p>
          )}

          <div className="v2-abonnement__secondary">
            {isTrialActive ? (
              <button type="button" className="v2-link" onClick={() => router.push("/v2/home")}>
                Terug naar Structuro
              </button>
            ) : (
              <button type="button" className="v2-link" onClick={handleStop}>
                Liever later beslissen
              </button>
            )}
          </div>
        </section>

        <p className="v2-abonnement__trust">
          Veilig betalen via iDEAL, creditcard, Apple Pay of Google Pay.
          <br />
          Je gegevens en lijsten blijven van jou.
        </p>
      </div>

      {doneMode ? (
        <div className="v2-abonnement__done" role="dialog" aria-modal="true">
          <div className="v2-abonnement__done-card">
            <div className="v2-abonnement__check" aria-hidden>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 13l4 4L19 7"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2 style={v2Styles.title}>{doneTitle}</h2>
            <p style={v2Styles.body}>{doneText}</p>
            <button
              type="button"
              className="btn-primary w-full"
              onClick={() => {
                if (doneMode === "stay") {
                  router.replace("/v2/dagstart");
                  return;
                }
                setDoneMode(null);
              }}
            >
              Open Structuro
            </button>
          </div>
        </div>
      ) : null}
    </V2Page>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="v2-abonnement__stat">
      <div className="v2-abonnement__stat-n">{n}</div>
      <div className="v2-abonnement__stat-l">{label}</div>
    </div>
  );
}

/** Na Stripe-return: sync en door naar v2-home. */
export function AbonnementV2StripeSync({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    void (async () => {
      await sleep(1500);
      if (cancelled) return;
      try {
        await fetch("/api/stripe/sync-subscription", {
          method: "POST",
          credentials: "include",
        });
      } catch {
        /* best-effort */
      }
      if (!cancelled) router.replace("/v2/home");
    })();
    return () => {
      cancelled = true;
    };
  }, [active, router]);

  return null;
}

/** Demo-stats voor v2 zonder login. Trial-lengte = productdefault (geen ADHD-café 14). */
export const V2_ABONNEMENT_DEMO_STATS: RetentionStats = {
  trialDays: DEFAULT_STRIPE_TRIAL_DAYS,
  daysActive: Math.min(2, DEFAULT_STRIPE_TRIAL_DAYS),
  tasksCompleted: 7,
  openTasks: 2,
  streakFilled: Math.min(2, DEFAULT_STRIPE_TRIAL_DAYS),
};
