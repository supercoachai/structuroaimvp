"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signUpPasswordlessWithLocalDevFallback } from "@/lib/auth/devSignupClient";
import { isSignupEmailFormatValid, normalizeSignupEmail } from "@/lib/auth/signupEmail";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import {
  applySignupAttributionFromSearchParams,
  getSignupAttributionSource,
  getStoredSignupCampaign,
  getStoredSignupSource,
  isAcquisitionSignupContext,
  isOrganicEuSignupContext,
  isTikTokSignupContext,
  persistSignupAttributionToProfile,
  queueSignupCompletedForAnalytics,
} from "@/lib/posthog/signupAttribution";
import { trackAcquisitionSignupStarted } from "@/lib/posthog/acquisitionAnalyticsClient";
import { captureMarketingEvent } from "@/lib/posthog/track";
import { trackRegistrationFunnelServer } from "@/lib/posthog/registrationFunnelClient";
import { resolveClientPostSignupPath } from "@/lib/postSignupRouting";
import {
  DEFAULT_STRIPE_TRIAL_DAYS,
  isEventSignupSource,
  resolveStripeTrialDaysForSignupSource,
} from "@/lib/stripe/trialConfig";
import { isRegistrationCheckoutEnabledClient } from "@/lib/stripe/registrationLaunch";
import { RegistrerenShell } from "./RegistrerenShell";
import { mapSignupError } from "./mapSignupError";
import { useClientMounted } from "@/hooks/useClientMounted";

function RegistrerenAccountInner() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState("");
  const [sessionChecked, setSessionChecked] = useState(false);
  const [trialDays, setTrialDays] = useState(DEFAULT_STRIPE_TRIAL_DAYS);
  const [eventSignupFlow, setEventSignupFlow] = useState(false);
  const [acquisitionFlow, setAcquisitionFlow] = useState(false);
  const [tiktokFlow, setTiktokFlow] = useState(false);
  const [organicEuFlow, setOrganicEuFlow] = useState(false);
  const mounted = useClientMounted();

  useEffect(() => {
    applySignupAttributionFromSearchParams(searchParams);
    const source = getStoredSignupSource();
    setTrialDays(resolveStripeTrialDaysForSignupSource(source));
    setEventSignupFlow(isEventSignupSource(source));
    setAcquisitionFlow(isAcquisitionSignupContext());
    setTiktokFlow(isTikTokSignupContext());
    setOrganicEuFlow(isOrganicEuSignupContext());
  }, [searchParams]);

  useEffect(() => {
    if (!isRegistrationCheckoutEnabledClient()) {
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled || !user?.id) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("signup_source, subscription_status, subscription_current_period_end, created_at")
          .eq("id", user.id)
          .maybeSingle();

        window.location.replace(
          resolveClientPostSignupPath(
            profile
              ? {
                  email: user.email,
                  profileRowReadOk: true,
                  subscription_status: profile.subscription_status as string | null,
                  subscription_current_period_end:
                    profile.subscription_current_period_end as string | null,
                  created_at: profile.created_at as string | null,
                  signup_source: profile.signup_source as string | null,
                }
              : null,
            user.email,
            { clientSide: true }
          )
        );
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setSessionChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleAccountContinue() {
    setError(null);
    setLoading(true);
    trackAcquisitionSignupStarted({ pathname: "/registreren", searchParams });

    try {
      const supabase = createClient();
      if (!supabase) {
        setError(t("login.noServer"));
        return;
      }

      const nameTrimmed = name.trim();
      const emailTrimmed = normalizeSignupEmail(email);
      if (!nameTrimmed) {
        setError(t("registrerenPage.errNameRequired"));
        return;
      }
      if (!emailTrimmed || !isSignupEmailFormatValid(email)) {
        setError(t("registrerenPage.errEmailInvalid"));
        return;
      }

      const result = await signUpPasswordlessWithLocalDevFallback(supabase, {
        email: emailTrimmed,
        fullName: nameTrimmed,
        signupSource: getStoredSignupSource(),
        signupCampaign: getStoredSignupCampaign(),
      });

      if (result.kind === "magic_link_sent") {
        setMagicLinkEmail(emailTrimmed);
        setMagicLinkSent(true);
        captureMarketingEvent("signup_magic_link_sent", {
          source: getSignupAttributionSource(),
          utm_campaign: getStoredSignupCampaign(),
          channel: "client",
          funnel: "launch",
        });
        return;
      }

      await persistSignupAttributionToProfile(result.user.id);
      queueSignupCompletedForAnalytics();
      await trackRegistrationFunnelServer("signup_completed", {
        source: getSignupAttributionSource(),
        utm_campaign: getStoredSignupCampaign(),
      });

      const { data: profile } = await supabase
        .from("profiles")
        .select("signup_source, subscription_status, subscription_current_period_end, created_at")
        .eq("id", result.user.id)
        .maybeSingle();

      window.location.assign(
        resolveClientPostSignupPath(
          profile
            ? {
                email: emailTrimmed,
                profileRowReadOk: true,
                subscription_status: profile.subscription_status as string | null,
                subscription_current_period_end:
                  profile.subscription_current_period_end as string | null,
                created_at: profile.created_at as string | null,
                signup_source: profile.signup_source as string | null,
              }
            : null,
          emailTrimmed,
          { clientSide: true }
        )
      );
    } catch (err: unknown) {
      setError(mapSignupError(err, t));
    } finally {
      setLoading(false);
    }
  }

  const storyFlow = organicEuFlow && !tiktokFlow;

  if (!mounted || !sessionChecked) {
    return (
      <RegistrerenShell visual={storyFlow ? "story" : "work"}>
        <p
          className={`text-center text-sm ${storyFlow ? "text-[var(--story-text-muted)]" : "text-slate-500"}`}
        >
          {t("registrerenPage.loading")}
        </p>
      </RegistrerenShell>
    );
  }

  if (magicLinkSent) {
    return (
      <RegistrerenShell visual={storyFlow ? "story" : "work"}>
        <div className="mx-auto w-full text-center">
          <h2
            className={`text-lg tracking-tight sm:text-xl ${storyFlow ? "st-story-serif font-semibold text-[var(--story-text)]" : "font-semibold text-slate-900"}`}
          >
            {t("registrerenPage.magicLinkSentTitle")}
          </h2>
          <p
            className={`mt-3 text-sm leading-relaxed ${storyFlow ? "text-[var(--story-text-muted)]" : "text-slate-600"}`}
          >
            {t("registrerenPage.magicLinkSentBody", { email: magicLinkEmail })}
          </p>
          <p
            className={`mt-2 text-xs ${storyFlow ? "text-[var(--story-text-muted)]" : "text-slate-500"}`}
          >
            {t("registrerenPage.magicLinkSentHint")}
          </p>
        </div>
      </RegistrerenShell>
    );
  }

  const headingKey = tiktokFlow
    ? "registrerenPage.accountHeadingTikTok"
    : acquisitionFlow
      ? "registrerenPage.accountHeadingAcquisition"
      : "registrerenPage.accountHeading";
  const subheadingKey = tiktokFlow
    ? "registrerenPage.accountSubheadingTikTok"
    : acquisitionFlow
      ? "registrerenPage.accountSubheadingAcquisition"
      : "registrerenPage.accountSubheading";
  const continueLabel = tiktokFlow
    ? t("registrerenPage.continueBtnTikTok", { days: String(trialDays) })
    : acquisitionFlow
      ? t("registrerenPage.continueBtnMagicLink")
      : t("registrerenPage.continueBtn");

  const inputClass = storyFlow
    ? "w-full rounded-xl border border-[var(--story-border)] bg-white px-4 py-3 text-base text-[var(--story-text)] placeholder:text-[var(--story-text-muted)] focus:border-[var(--story-accent)] focus:outline-none focus:ring-2 focus:ring-[rgba(45,90,86,0.18)]"
    : "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

  const labelClass = storyFlow
    ? "block text-sm text-[var(--story-text-muted)]"
    : "block text-sm text-gray-500";

  const primaryBtnClass = storyFlow
    ? "flex w-full items-center justify-center rounded-xl border-none bg-[var(--story-cta)] px-6 py-[15px] text-base font-semibold text-white shadow-[0_8px_20px_rgba(26,26,27,0.22)] transition-all duration-200 hover:bg-[var(--story-cta-hover)] hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
    : "flex w-full items-center justify-center rounded-xl border-none bg-blue-600 px-6 py-[15px] text-base font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-[0_12px_28px_rgba(37,99,235,0.28)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";

  return (
    <RegistrerenShell error={error} visual={storyFlow ? "story" : "work"}>
      <div className="mx-auto w-full text-center">
        {storyFlow || tiktokFlow || acquisitionFlow ? null : (
          <p className="mb-3">
            <span className="inline-block rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">
              {t("registrerenPage.trialBadge", { days: String(trialDays) })}
            </span>
          </p>
        )}
        {storyFlow ? (
          <p className="st-story-eyebrow mb-3 inline-flex items-center gap-2.5">
            <span className="st-story-eyebrow-pulse" aria-hidden />
            {t("registrerenPage.organicEyebrow")}
          </p>
        ) : null}
        <h2
          className={`text-lg tracking-tight sm:text-xl ${storyFlow ? "st-story-serif font-semibold text-[var(--story-text)]" : "font-semibold text-slate-900"}`}
        >
          {t(headingKey)}
        </h2>
        <p
          className={`mt-2 text-sm leading-relaxed ${storyFlow ? "text-[var(--story-text-muted)]" : "text-slate-600"}`}
        >
          {t(subheadingKey)}
        </p>
        {tiktokFlow ? (
          <p className="mt-2 text-xs font-medium text-slate-500">
            {t("registrerenPage.tiktokTrustLine", { days: String(trialDays) })}
          </p>
        ) : acquisitionFlow && !storyFlow ? (
          <p className="mt-2 text-xs font-medium text-slate-500">
            {t("registrerenPage.acquisitionTrustLine", { days: String(trialDays) })}
          </p>
        ) : null}
      </div>

      <div className="mx-auto w-full space-y-4 text-left">
        <div className="space-y-1">
          <label htmlFor="reg-name" className={labelClass}>
            {t("registrerenPage.nameLabel")}
          </label>
          <input
            id="reg-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder={t("registrerenPage.namePh")}
            required
            autoComplete="name"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="reg-email" className={labelClass}>
            {t("registrerenPage.emailLabel")}
          </label>
          <input
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder={t("registrerenPage.emailPh")}
            required
            autoComplete="email"
          />
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() => void handleAccountContinue()}
          className={primaryBtnClass}
        >
          {loading ? t("registrerenPage.submitBusy") : continueLabel}
        </button>
      </div>

      {!eventSignupFlow ? (
        <p
          className={`text-center text-sm ${storyFlow ? "text-[var(--story-text-muted)]" : "text-slate-500"}`}
        >
          {t("registrerenPage.hasAccount")}{" "}
          <Link
            href="/login"
            className={
              storyFlow
                ? "font-semibold text-[var(--story-accent)] hover:text-[#234845]"
                : "font-semibold text-blue-600 hover:text-blue-800"
            }
          >
            {t("registrerenPage.loginLink")}
          </Link>
        </p>
      ) : null}
    </RegistrerenShell>
  );
}

export default function RegistrerenAccountClient() {
  return (
      <Suspense
      fallback={
        <div className="st-story-bg flex min-h-[100dvh] items-center justify-center text-sm text-[var(--story-text-muted)]">
          …
        </div>
      }
    >
      <RegistrerenAccountInner />
    </Suspense>
  );
}
