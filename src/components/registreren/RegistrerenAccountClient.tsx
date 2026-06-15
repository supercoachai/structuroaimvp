"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signUpWithLocalDevFallback } from "@/lib/auth/devSignupClient";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import {
  applySignupAttributionFromSearchParams,
  getSignupAttributionSource,
  getStoredSignupCampaign,
  getStoredSignupSource,
  persistSignupAttributionToProfile,
  queueSignupCompletedForAnalytics,
} from "@/lib/posthog/signupAttribution";
import { trackAcquisitionSignupStarted } from "@/lib/posthog/acquisitionAnalyticsClient";
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
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [trialDays, setTrialDays] = useState(DEFAULT_STRIPE_TRIAL_DAYS);
  const [eventSignupFlow, setEventSignupFlow] = useState(false);
  const mounted = useClientMounted();

  useEffect(() => {
    applySignupAttributionFromSearchParams(searchParams);
    const source = getStoredSignupSource();
    setTrialDays(resolveStripeTrialDaysForSignupSource(source));
    setEventSignupFlow(isEventSignupSource(source));
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
      const emailTrimmed = email.trim().toLowerCase();
      if (!nameTrimmed) {
        setError(t("registrerenPage.errNameRequired"));
        return;
      }
      if (password.length < 8) {
        setError(t("registrerenPage.errPasswordWeak"));
        return;
      }

      const { user } = await signUpWithLocalDevFallback(supabase, {
        email: emailTrimmed,
        password,
        fullName: nameTrimmed,
        signupSource: getStoredSignupSource(),
        signupCampaign: getStoredSignupCampaign(),
      });

      await persistSignupAttributionToProfile(user.id);
      queueSignupCompletedForAnalytics();
      await trackRegistrationFunnelServer("signup_completed", {
        source: getSignupAttributionSource(),
        utm_campaign: getStoredSignupCampaign(),
      });

      const { data: profile } = await supabase
        .from("profiles")
        .select("signup_source, subscription_status, subscription_current_period_end, created_at")
        .eq("id", user.id)
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

  if (!mounted || !sessionChecked) {
    return (
      <RegistrerenShell>
        <p className="text-center text-sm text-slate-500">{t("registrerenPage.loading")}</p>
      </RegistrerenShell>
    );
  }

  return (
    <RegistrerenShell error={error}>
      <div className="mx-auto mt-8 mb-6 w-[90%] max-w-[25.2rem] text-center">
        <p className="mb-3">
          <span className="inline-block rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">
            {t("registrerenPage.trialBadge", { days: String(trialDays) })}
          </span>
        </p>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
          {t("registrerenPage.accountHeading")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {t("registrerenPage.accountSubheading")}
        </p>
      </div>

      <div className="mx-auto w-[90%] max-w-[25.2rem] space-y-4">
        <div className="space-y-1">
          <label htmlFor="reg-name" className="block text-sm text-gray-500">
            {t("registrerenPage.nameLabel")}
          </label>
          <input
            id="reg-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder={t("registrerenPage.namePh")}
            required
            autoComplete="name"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="reg-email" className="block text-sm text-gray-500">
            {t("registrerenPage.emailLabel")}
          </label>
          <input
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder={t("registrerenPage.emailPh")}
            required
            autoComplete="email"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="reg-password" className="block text-sm text-gray-500">
            {t("login.password")}
          </label>
          <input
            id="reg-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder={t("registrerenPage.passwordPh")}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() => void handleAccountContinue()}
          className="flex w-full items-center justify-center rounded-xl border-none bg-blue-600 px-6 py-[15px] text-base font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-[0_12px_28px_rgba(37,99,235,0.28)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {loading ? t("registrerenPage.submitBusy") : t("registrerenPage.continueBtn")}
        </button>
      </div>

      {!eventSignupFlow ? (
        <p className="text-center text-sm text-slate-500">
          {t("registrerenPage.hasAccount")}{" "}
          <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-800">
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
        <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--st-bg)] text-sm text-slate-500">
          …
        </div>
      }
    >
      <RegistrerenAccountInner />
    </Suspense>
  );
}
