"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";

import { toast } from "@/components/Toast";
import { StripeWalletButtons } from "@/components/subscription/StripeWalletButtons";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import {
  JASPER_OFFER_DISCOUNTED_MONTHS,
  getJasperOffer,
} from "@/lib/jasper/jasperOffer";
import { useI18n } from "@/lib/i18n";
import type { RetentionPaywallReason } from "@/lib/retentionPaywallAccess";
import type { RetentionStats } from "@/lib/retentionStats";
import { DEFAULT_STRIPE_TRIAL_DAYS } from "@/lib/stripe/trialConfig";
import type { RegisterPlanId } from "@/lib/stripe/registerPlans";
import {
  deviceHasWalletPay,
  preloadStripeWallet,
  type WalletKind,
} from "@/lib/stripe/walletBootstrap";
import { WALLET_UNAVAILABLE_MESSAGE } from "@/lib/stripe/walletErrors";
import { V2_CARD_TRIAL_DAYS } from "@/lib/stripe/v2CardTrial";
import { trackClientFunnelEvent } from "@/lib/posthog/clientFunnelAnalyticsClient";
import { resolveLoggedInInstallContinuePath } from "@/lib/pwaInstallHint";

import { V2Eyebrow, V2Header, V2Page } from "./V2Chrome";
import { useV2 } from "./V2Context";
import { v2Styles } from "./theme";
import { loadV2Tasks } from "./v2Tasks";

const CARD_TRIAL_LOGO_SRC = "/v2/logo-mark.png";

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
  /**
   * V2 card-trial: na eerste dagstart + account, nog geen Stripe.
   * Toont "Zeven dagen. Daarna kies je." i.p.v. expired-paywall.
   */
  startCardTrial?: boolean;
  /**
   * Lifecycle-mail (`?start_trial=1`): start meteen Stripe-checkout voor
   * dit ingelogde account (geen losse Stripe-URL in de mail).
   */
  autoStartTrial?: boolean;
};

const START_TRIAL_LOGIN_NEXT = `/login?next=${encodeURIComponent(
  "/abonnement?start_trial=1"
)}`;

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
  startCardTrial = false,
  autoStartTrial = false,
}: AbonnementV2ClientProps) {
  const router = useRouter();
  const { t } = useI18n();
  const { state } = useV2();
  const [busy, setBusy] = useState(false);
  const [walletFallback, setWalletFallback] = useState(false);
  const [doneMode, setDoneMode] = useState<DoneMode>(null);
  const [whyAnchor, setWhyAnchor] = useState<PaywallWhyAnchor | null>(null);
  const [liveWallets, setLiveWallets] = useState<WalletKind[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<RegisterPlanId>("monthly");
  const autoStartTrialRef = useRef(false);

  useEffect(() => {
    preloadStripeWallet(
      startCardTrial || autoStartTrial
        ? { trialDays: V2_CARD_TRIAL_DAYS }
        : undefined
    );
  }, [startCardTrial, autoStartTrial]);

  useEffect(() => {
    setWhyAnchor(resolvePaywallWhyAnchor(state.why, state.whyOutcome));
  }, [state.why, state.whyOutcome]);

  useEffect(() => {
    if (!startCardTrial || !canCheckout) return;
    trackClientFunnelEvent(ANALYTICS_EVENTS.trial_checkout_opened, {
      surface: "app",
      card_trial: true,
      trial_cohort: "card_7d",
    });
    void fetch("/api/lifecycle/mark-checkout-intent", {
      method: "POST",
      credentials: "include",
    }).catch(() => {
      /* best-effort */
    });
  }, [startCardTrial, canCheckout]);

  const startCheckout = useCallback(
    async (plan: RegisterPlanId = "monthly") => {
      if (!canCheckout) {
        toast("Log eerst in om te betalen.");
        router.push(
          autoStartTrial ? START_TRIAL_LOGIN_NEXT : "/login?next=/abonnement"
        );
        return;
      }
      trackClientFunnelEvent(ANALYTICS_EVENTS.paywall_checkout_clicked, {
        surface: "app",
        plan,
        card_trial: startCardTrial,
        trial_cohort: startCardTrial ? "card_7d" : "legacy",
      });
      setBusy(true);
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ plan, surface: "app" }),
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
    },
    [autoStartTrial, canCheckout, router, startCardTrial]
  );

  useEffect(() => {
    if (!autoStartTrial || !canCheckout || autoStartTrialRef.current) return;
    let cancelled = false;
    void (async () => {
      // Apple/Google Pay op hosted Checkout + €0-trial faalt vaak (bank-sheet
      // zonder knop). Blijf op de paywall als een wallet beschikbaar is.
      const hasWallet = await deviceHasWalletPay({
        trialDays: V2_CARD_TRIAL_DAYS,
      });
      if (cancelled) return;
      autoStartTrialRef.current = true;
      if (hasWallet) {
        router.replace("/abonnement");
        return;
      }
      void startCheckout("monthly");
    })();
    return () => {
      cancelled = true;
    };
  }, [autoStartTrial, canCheckout, router, startCheckout]);

  const handleStaySuccess = useCallback(() => {
    setDoneMode("stay");
  }, []);

  const handleCardTrialWalletSuccess = useCallback(() => {
    router.replace("/dagstart");
  }, [router]);

  const handleStop = useCallback(() => {
    setDoneMode("stop");
  }, []);

  // Zonder sessie: geen nep-trial of demostats. Eerlijke login-staat.
  // Card-trial mag wél als preview (CTA blijft disabled zonder sessie).
  if (!canCheckout && !startCardTrial) {
    return (
      <V2Page>
        <V2Header exitHref="/" exitLabel="Naar home" />
        <div className="v2-abonnement v2-fade">
          <V2Eyebrow>Abonnement</V2Eyebrow>
          <h1 style={{ ...v2Styles.title, fontSize: "var(--fs-display)", marginTop: 8 }}>
            Log in om te starten
          </h1>
          <p style={{ ...v2Styles.body, marginTop: 12 }}>
            Om je proefperiode of abonnement te bekijken, log je eerst in. Geen
            account? Start via de acquisitiepagina.
          </p>
          <section className="v2-abonnement__decision" style={{ marginTop: 24 }}>
            <button
              type="button"
              className="btn-primary w-full"
              onClick={() =>
                router.push(
                  "/onboarding?utm_source=structuro_eu&utm_medium=organic&utm_campaign=v2_abonnement"
                )
              }
            >
              Start gratis
            </button>
            <button
              type="button"
              className="v2-link"
              style={{ marginTop: 12 }}
              onClick={() =>
                router.push(
                  autoStartTrial
                    ? START_TRIAL_LOGIN_NEXT
                    : "/login?next=/abonnement"
                )
              }
            >
              Log in
            </button>
          </section>
        </div>
      </V2Page>
    );
  }

  if (startCardTrial) {
    const isYearly = selectedPlan === "yearly";
    const day7Price = isYearly
      ? t("v2.paywallTimelineYearlyPrice")
      : t("v2.paywallTimelineMonthlyPrice");
    const afterLine = isYearly
      ? t("v2.paywallAfterYearly")
      : t("v2.paywallAfterMonthly");

    return (
      <V2Page>
        <Script src="https://js.stripe.com/v3/" strategy="afterInteractive" />
        <header className="v2-card-trial__header">
          <Link href="/" className="v2-card-trial__brand">
            <Image
              src={CARD_TRIAL_LOGO_SRC}
              alt=""
              width={22}
              height={16}
              className="v2-card-trial__brand-logo"
              priority
            />
            Structuro
          </Link>
          <Link href="/dagstart" className="v2-card-trial__back">
            Terug
          </Link>
        </header>

        <div className="v2-abonnement v2-abonnement--card-trial v2-abonnement--card-trial-docked v2-fade">
          <p className="v2-card-trial__eyebrow">
            <span className="v2-card-trial__eyebrow-line" aria-hidden="true" />
            {t("v2.paywallEyebrow")}
          </p>
          <h1 className="v2-card-trial__title">
            {t("v2.paywallTitleBefore")}
            <span className="v2-card-trial__title-accent">
              {t("v2.paywallTitleAccent")}
            </span>
          </h1>
          <p className="v2-card-trial__lead">{t("v2.paywallLead")}</p>

          <div
            className="v2-card-trial__toggle"
            role="tablist"
            aria-label="Abonnementsperiode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={!isYearly}
              className={
                isYearly
                  ? "v2-card-trial__toggle-btn"
                  : "v2-card-trial__toggle-btn v2-card-trial__toggle-btn--active"
              }
              onClick={() => setSelectedPlan("monthly")}
            >
              {t("v2.paywallPlanMonthly")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isYearly}
              className={
                isYearly
                  ? "v2-card-trial__toggle-btn v2-card-trial__toggle-btn--active"
                  : "v2-card-trial__toggle-btn"
              }
              onClick={() => setSelectedPlan("yearly")}
            >
              <span className="v2-card-trial__toggle-label">
                {t("v2.paywallPlanYearly")}
              </span>
              <span className="v2-card-trial__toggle-bonus">
                {t("v2.paywallPlanYearlyBonus")}
              </span>
            </button>
          </div>

          <ol className="v2-card-trial__timeline" aria-label="Proefperiode">
            <li className="v2-card-trial__row v2-card-trial__row--now">
              <span className="v2-card-trial__dot" aria-hidden="true" />
              <div className="v2-card-trial__row-copy">
                <span className="v2-card-trial__row-title">
                  {t("v2.paywallTimelineToday")}
                </span>
                <span className="v2-card-trial__row-sub">
                  {t("v2.paywallTimelineTodaySub")}
                </span>
              </div>
              <span className="v2-card-trial__row-price">
                {t("v2.paywallTimelineFree")}
              </span>
            </li>
            <li className="v2-card-trial__row">
              <span className="v2-card-trial__dot" aria-hidden="true" />
              <div className="v2-card-trial__row-copy">
                <span className="v2-card-trial__row-title">
                  {t("v2.paywallTimelineDay6")}
                </span>
                <span className="v2-card-trial__row-sub">
                  {t("v2.paywallTimelineDay6Sub")}
                </span>
              </div>
              <span className="v2-card-trial__row-price">
                {t("v2.paywallTimelineFree")}
              </span>
            </li>
            <li className="v2-card-trial__row">
              <span className="v2-card-trial__dot" aria-hidden="true" />
              <div className="v2-card-trial__row-copy">
                <span className="v2-card-trial__row-title">
                  {t("v2.paywallTimelineDay7")}
                </span>
                <span className="v2-card-trial__row-sub">
                  {t("v2.paywallTimelineDay7Sub")}
                </span>
              </div>
              <span className="v2-card-trial__row-price">{day7Price}</span>
            </li>
          </ol>

          <p className="v2-card-trial__after">{afterLine}</p>
        </div>

        <section className="v2-card-trial__cta-dock">
          {canCheckout ? (
            <StripeWalletButtons
              visibleWallets={visibleWallets}
              disabled={busy}
              trialDays={V2_CARD_TRIAL_DAYS}
              plan={selectedPlan}
              onSuccess={handleCardTrialWalletSuccess}
              onUnavailable={() => setWalletFallback(true)}
              onError={(msg) => toast.error(msg, { durationMs: 5000 })}
            />
          ) : null}
          {walletFallback ? (
            <p className="v2-card-trial__trust v2-card-trial__trust--secondary">
              {WALLET_UNAVAILABLE_MESSAGE} Gebruik de knop hieronder, of iDEAL /
              kaart.
            </p>
          ) : null}
          <button
            type="button"
            className="btn-primary w-full v2-card-trial__cta"
            disabled={busy}
            onClick={() => void startCheckout(selectedPlan)}
          >
            {busy ? t("v2.paywallCardBusy") : t("v2.paywallCardCta")}
          </button>
          <p className="v2-card-trial__trust v2-card-trial__trust--secondary">
            {t("v2.paywallRefundBody")}
          </p>
        </section>
      </V2Page>
    );
  }

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
      Je proef loopt nog. Geen haast. Als je wilt doorgaan na je proef, kun je dat
      hier vastleggen. Je voortgang blijft staan.
    </>
  ) : (
    <>
      {displayTrialDays} dagen lang hield Structuro je op koers. Je ritme, je lijsten,
      je rust: die blijven precies zoals ze nu zijn.{" "}
      <strong>Dit ritme blijft staan als je doorgaat.</strong>
    </>
  );

  const primaryLabel = isTrialActive
    ? "Doorgaan met Structuro"
    : "Ik blijf, behoud mijn systeem";

  const doneTitle =
    doneMode === "stop" ? "Helemaal goed." : "Alles blijft staan.";
  const doneText =
    doneMode === "stop"
      ? "Je kunt deze pagina sluiten, of terug naar www.structuro.eu. Je account en alles erin bewaren we 30 dagen, je bent altijd welkom terug."
      : `Je ${stats.daysActive} dagen, je ${stats.tasksCompleted} taken, je ${stats.openTasks} openstaande taken: allemaal nog van jou. Ga zo door.`;

  return (
    <V2Page>
      <Script src="https://js.stripe.com/v3/" strategy="afterInteractive" />
      <V2Header exitHref="/" exitLabel="Naar home" />

      <div className="v2-abonnement v2-fade">
        <V2Eyebrow>{kicker}</V2Eyebrow>
        <h1 style={{ ...v2Styles.title, fontSize: "var(--fs-display)", marginTop: 8 }}>
          {headline}
        </h1>

        <section className="v2-abonnement__built" aria-label="Jouw Structuro tot nu toe">
          <p className="v2-abonnement__built-label">Jouw Structuro tot nu toe</p>
          <div className="v2-abonnement__stats">
            <Stat n={stats.daysActive} label="dagen actief" />
            <Stat n={stats.tasksCompleted} label="taken afgevinkt" />
            <Stat n={stats.openTasks} label="openstaande taken" />
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
          {isTrialActive ? (
            <>
              <button
                type="button"
                className="btn-primary w-full"
                onClick={() => router.push("/")}
              >
                Terug naar Structuro
              </button>
              <button
                type="button"
                className="v2-link"
                style={{ marginTop: 8 }}
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
                    className="v2-link"
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
            </>
          ) : (
            <>
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
                <button type="button" className="v2-link" onClick={handleStop}>
                  Liever later beslissen
                </button>
              </div>
            </>
          )}
        </section>

        <p className="v2-abonnement__trust">
          Veilig betalen via iDEAL, creditcard, Apple Pay of Google Pay.
          <br />
          {t("v2.paywallRetentionTrust")}
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
                  router.replace("/dagstart?start=energy");
                  return;
                }
                window.location.href = "https://www.structuro.eu";
              }}
            >
              {doneMode === "stop" ? "Naar structuro.eu" : "Open Structuro"}
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

/**
 * Na Stripe-return zonder bevestigde subscription: best-effort sync en
 * server-rerender. Zodra de status trialing/active is, toont de pagina de
 * succes-overlay (AbonnementV2StripeSuccess).
 */
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
      if (!cancelled) router.refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [active, router]);

  return null;
}

const V2_STRIPE_SUCCESS_SEEN_KEY = "v2_stripe_success_seen";

/**
 * Bevestigde checkout (trialing/active) via /abonnement?from=stripe:
 * eenmalige rustige succes-overlay in v2-stijl. Daarna: PWA-install op
 * mobiel (als nog niet gezien/dismissed), anders home.
 * Bij een herhaald bezoek (zelfde sessie) slaan we de overlay over.
 */
export function AbonnementV2StripeSuccess() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  const continueAfterCheckout = useCallback(() => {
    router.replace(resolveLoggedInInstallContinuePath());
  }, [router]);

  useEffect(() => {
    let alreadySeen = false;
    try {
      alreadySeen =
        window.sessionStorage.getItem(V2_STRIPE_SUCCESS_SEEN_KEY) === "1";
    } catch {
      /* privémodus: gewoon tonen */
    }
    if (alreadySeen) {
      continueAfterCheckout();
      return;
    }
    try {
      window.sessionStorage.setItem(V2_STRIPE_SUCCESS_SEEN_KEY, "1");
    } catch {
      /* negeren */
    }
    setVisible(true);
  }, [continueAfterCheckout]);

  if (!visible) return null;

  return (
    <V2Page>
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
          <h2 style={v2Styles.title}>Gelukt. Je proefperiode is gestart.</h2>
          <p style={v2Styles.body}>
            Zeven dagen gratis. We mailen je een dag voordat de eerste
            afschrijving komt.
          </p>
          <button
            type="button"
            className="btn-primary w-full"
            onClick={continueAfterCheckout}
          >
            Naar je dag
          </button>
        </div>
      </div>
    </V2Page>
  );
}

/** Demo-stats voor v2 zonder login. Trial-lengte = productdefault (geen ADHD-café 14). */
export const V2_ABONNEMENT_DEMO_STATS: RetentionStats = {
  trialDays: DEFAULT_STRIPE_TRIAL_DAYS,
  daysActive: Math.min(2, DEFAULT_STRIPE_TRIAL_DAYS),
  tasksCompleted: 7,
  openTasks: 2,
  streakFilled: Math.min(2, DEFAULT_STRIPE_TRIAL_DAYS),
};
