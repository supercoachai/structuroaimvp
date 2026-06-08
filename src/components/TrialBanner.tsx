"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hasFreeTrial, freeTrialDaysLeft } from "@/lib/freeTrialAccess";
import {
  eventSignupTrialDaysLeft,
  eventSignupTrialExpired,
} from "@/lib/eventSignupTrialAccess";
import { isEventSignupSource } from "@/lib/stripe/trialConfig";
import { useI18n } from "@/lib/i18n";

const SESSION_DISMISSED_KEY = "structuro_trial_banner_dismissed";
const EVENT_TRIAL_WARN_DAYS = 3;

function daysUntil(isoDate: string): number {
  const ms = new Date(isoDate).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

type TrialKind = "stripe" | "legacy" | "event_ending" | "event_expired";

export function TrialBanner() {
  const { t } = useI18n();
  const pathname = usePathname();
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [trialKind, setTrialKind] = useState<TrialKind | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (pathname?.startsWith("/abonnement")) return;
    if (pathname?.startsWith("/registreren")) return;
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(SESSION_DISMISSED_KEY)) {
      setDismissed(true);
      return;
    }

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select(
          "created_at, signup_source, subscription_status, subscription_current_period_end"
        )
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (!data) return;
          const status = data.subscription_status as string | null;
          const periodEnd = data.subscription_current_period_end as string | null;
          const createdAt = data.created_at as string | null;
          const signupSource = data.signup_source as string | null;

          if (status === "active" || status === "cancelled") return;

          // Café / event-QR: geen Stripe bij signup, meldingen pas laat in proef + na afloop
          if (
            isEventSignupSource(signupSource) &&
            (status === "none" || status === null || !status)
          ) {
            if (eventSignupTrialExpired(createdAt, signupSource)) {
              setTrialKind("event_expired");
              setDaysLeft(0);
              return;
            }
            const left = eventSignupTrialDaysLeft(createdAt, signupSource);
            if (left > 0 && left <= EVENT_TRIAL_WARN_DAYS) {
              setTrialKind("event_ending");
              setDaysLeft(left);
            }
            return;
          }

          if (status === "trialing" && periodEnd) {
            const days = daysUntil(periodEnd);
            if (days > 0 && days <= EVENT_TRIAL_WARN_DAYS) {
              setDaysLeft(days);
              setTrialKind("stripe");
            }
            return;
          }

          if (!hasFreeTrial(createdAt)) return;
          const left = freeTrialDaysLeft(createdAt);
          if (left > 0) {
            setDaysLeft(left);
            setTrialKind("legacy");
          }
        });
    });
  }, [pathname]);

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(SESSION_DISMISSED_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  if (dismissed || !trialKind) return null;
  if (trialKind !== "event_expired" && (daysLeft === null || daysLeft === 0)) {
    return null;
  }
  if (pathname?.startsWith("/abonnement") || pathname?.startsWith("/registreren")) {
    return null;
  }

  const isEventEnding = trialKind === "event_ending";
  const isEventExpired = trialKind === "event_expired";
  const isStripe = trialKind === "stripe";
  const isUrgent = daysLeft !== null && daysLeft <= 1;

  const label = isEventExpired
    ? t("trialBanner.eventExpired")
    : isEventEnding
      ? daysLeft === 1
        ? t("trialBanner.eventEndingLastDay")
        : t("trialBanner.eventEndingDaysLeft", { days: String(daysLeft) })
      : isStripe
        ? daysLeft === 1
          ? t("trialBanner.stripeLastDay")
          : t("trialBanner.stripeDaysLeft", { days: String(daysLeft ?? "") })
        : daysLeft === 1
          ? t("trialBanner.legacyLastDay")
          : t("trialBanner.legacyDaysLeft", { days: String(daysLeft) });

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex w-full shrink-0 items-center justify-between gap-3 px-4 py-2 text-xs font-medium ${
        isEventExpired
          ? "bg-amber-50 text-amber-900"
          : isEventEnding
            ? "bg-blue-50 text-blue-900"
            : isStripe
              ? "bg-blue-50 text-blue-900"
              : isUrgent
                ? "bg-red-50 text-red-900"
                : "bg-amber-50 text-amber-900"
      }`}
    >
      <span className="min-w-0 truncate">{label}</span>
      <div className="flex shrink-0 items-center gap-2">
        {isEventExpired || trialKind === "legacy" ? (
          <Link
            href="/abonnement"
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
              isEventExpired
                ? "bg-amber-600 text-white hover:bg-amber-700"
                : isUrgent
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-amber-500 text-white hover:bg-amber-600"
            }`}
          >
            {isEventExpired ? t("trialBanner.eventPayLink") : t("trialBanner.subscribeLink")}
          </Link>
        ) : isStripe ? (
          <Link
            href="/settings"
            className="rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-blue-800 underline-offset-2 hover:underline"
          >
            {t("trialBanner.manageLink")}
          </Link>
        ) : null}
        {!isEventExpired ? (
          <button
            type="button"
            onClick={handleDismiss}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs opacity-60 hover:opacity-100"
            aria-label={t("trialBanner.dismiss")}
          >
            ✕
          </button>
        ) : null}
      </div>
    </div>
  );
}
