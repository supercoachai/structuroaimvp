"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clearStructuroLocalModeCookie } from "@/lib/localModeSession";
import { markCheckoutStarted } from "@/lib/checkoutReturnStorage";
import { useI18n } from "@/lib/i18n";
import { setCreateWelcomeTaskFlag } from "@/lib/onboardingWelcomeTask";
import {
  defaultRegisterPlanId,
  REGISTER_PLANS,
  type RegisterPlanId,
} from "@/lib/stripe/registerPlans";
import { profileHasAppAccess } from "@/lib/subscriptionAccess";
import { requiresPaidSubscriptionBeforeOnboarding } from "@/lib/registrationGate";
import { isRegistrationCheckoutEnabledClient } from "@/lib/stripe/registrationLaunch";
import { RegistrerenShell } from "./RegistrerenShell";
import { trackRegistrationFunnelServer } from "@/lib/posthog/registrationFunnelClient";
import {
  applySignupAttributionFromSearchParams,
  getStoredSignupSource,
  resolveRegistrationTrialDays,
} from "@/lib/posthog/signupAttribution";
import { hasEventSignupAppTrial } from "@/lib/eventSignupTrialAccess";
import { isEventSignupSource } from "@/lib/stripe/trialConfig";
import { useClientMounted } from "@/hooks/useClientMounted";

function RegistrerenPlanInner() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  const cancelled = searchParams?.get("cancelled") === "1";
  const confirmed = searchParams?.get("confirmed") === "1";
  const resume = searchParams?.get("resume") === "1";

  const [selectedPlanId] = useState<RegisterPlanId>(defaultRegisterPlanId());
  const [welcomeTaskOptIn] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [trialDays, setTrialDays] = useState<number | null>(null);
  const [showYearlyOption, setShowYearlyOption] = useState(false);
  const mounted = useClientMounted();
  const planViewTrackedRef = useRef(false);

  useEffect(() => {
    applySignupAttributionFromSearchParams(searchParams);
  }, [searchParams]);

  useEffect(() => {
    if (!isRegistrationCheckoutEnabledClient()) {
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    if (cancelled) {
      setInfo(t("registrerenPage.cancelledHint"));
    } else if (confirmed) {
      setInfo(t("registrerenPage.confirmedHint"));
    } else if (resume) {
      setInfo(t("registrerenPage.resumePaymentHint"));
    }
  }, [cancelled, confirmed, resume, t]);

  useEffect(() => {
    let cancelledEffect = false;
    (async () => {
      let readyToShowPlan = false;
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (cancelledEffect) return;

        if (!user?.id) {
          window.location.replace("/registreren");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select(
            "signup_source, subscription_status, subscription_current_period_end, created_at"
          )
          .eq("id", user.id)
          .maybeSingle();

        const signupSource = profile?.signup_source as string | null;
        if (
          isEventSignupSource(signupSource) &&
          hasEventSignupAppTrial(
            profile?.created_at as string | null,
            signupSource
          )
        ) {
          window.location.replace("/onboarding");
          return;
        }

        if (
          profile &&
          profileHasAppAccess({
            subscription_status: profile.subscription_status as string | null,
            subscription_current_period_end:
              profile.subscription_current_period_end as string | null,
          })
        ) {
          window.location.replace("/welkom");
          return;
        }

        const needsPay = requiresPaidSubscriptionBeforeOnboarding(
          {
            email: user.email,
            profileRowReadOk: Boolean(profile),
            subscription_status: profile?.subscription_status as string | null,
            subscription_current_period_end:
              profile?.subscription_current_period_end as string | null,
            created_at: profile?.created_at as string | null,
            signup_source: signupSource,
          },
          { clientSide: true }
        );

        if (!needsPay && !cancelled && !resume) {
          window.location.replace("/onboarding");
          return;
        }

        const days = resolveRegistrationTrialDays(
          profile?.signup_source as string | null,
          user.user_metadata as Record<string, unknown> | undefined,
          getStoredSignupSource()
        );

        setTrialDays(days);
        setUserId(user.id);
        setUserEmail(user.email ?? null);
        readyToShowPlan = true;
      } catch {
        /* ignore */
      } finally {
        if (!cancelledEffect && readyToShowPlan) {
          setSessionChecked(true);
        }
      }
    })();
    return () => {
      cancelledEffect = true;
    };
  }, [router, cancelled, confirmed, resume, t]);

  useEffect(() => {
    if (!mounted || !sessionChecked || !userId || planViewTrackedRef.current) return;
    planViewTrackedRef.current = true;
    trackRegistrationFunnelServer("registreren_plan_viewed", {
      plan_id: "monthly",
      default_plan_id: defaultRegisterPlanId(),
      cancelled,
      resume,
    });
  }, [mounted, sessionChecked, userId, cancelled, resume]);

  const monthlyPlan = REGISTER_PLANS.find((p) => p.id === "monthly")!;
  const checkoutPlan =
    REGISTER_PLANS.find((p) => p.id === selectedPlanId) ?? monthlyPlan;

  async function handleLogout() {
    try {
      await createClient().auth.signOut();
    } catch {
      /* ignore */
    }
    document.cookie = "structuro_local_mode=; path=/; max-age=0";
    router.replace("/registreren");
    router.refresh();
  }

  async function startCheckout(priceId: string) {
    if (!userId || !userEmail) return;

    setCreateWelcomeTaskFlag(welcomeTaskOptIn);

    const res = await fetch("/api/checkout/create-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        priceId,
        userId,
        email: userEmail,
        addWelcomeTask: welcomeTaskOptIn,
      }),
    });

    const data = (await res.json()) as {
      url?: string;
      checkoutSessionId?: string;
      error?: string;
    };

    if (!res.ok) {
      if (data.error === "previous_refund_exists") {
        throw new Error(t("registrerenPage.errPreviousRefund"));
      }
      if (data.error === "stripe_not_configured") {
        throw new Error(t("registrerenPage.errStripeNotConfigured"));
      }
      throw new Error(data.error ?? t("registrerenPage.errCheckout"));
    }

    if (!data.url) {
      throw new Error(t("registrerenPage.errCheckout"));
    }

    clearStructuroLocalModeCookie();
    try {
      const supabase = createClient();
      await supabase.auth.refreshSession();
    } catch {
      /* best-effort */
    }
    markCheckoutStarted(userEmail, data.checkoutSessionId);
    window.location.href = data.url;
  }

  async function handleStartSelected() {
    setError(null);
    setCheckoutLoading(true);

    try {
      if (!userId || !userEmail) {
        setError(t("registrerenPage.errGeneric"));
        return;
      }

      await startCheckout(checkoutPlan.priceId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("registrerenPage.errCheckout"));
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function handleStartYearly() {
    setError(null);
    setCheckoutLoading(true);

    try {
      if (!userId || !userEmail) {
        setError(t("registrerenPage.errGeneric"));
        return;
      }

      const yearlyPlan = REGISTER_PLANS.find((p) => p.id === "yearly")!;
      await startCheckout(yearlyPlan.priceId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("registrerenPage.errCheckout"));
    } finally {
      setCheckoutLoading(false);
    }
  }

  if (!mounted || !sessionChecked || !userId || !userEmail || trialDays === null) {
    return (
      <RegistrerenShell page="plan" info={info}>
        <p className="text-center text-sm text-slate-500">{t("registrerenPage.loading")}</p>
      </RegistrerenShell>
    );
  }

  return (
    <RegistrerenShell page="plan" error={error} info={info}>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
        <div className="flex min-h-full flex-col justify-center py-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex w-full max-w-sm flex-col gap-5 px-1 text-center">
            <p className="text-[11px] leading-tight text-slate-400">
              {t("registrerenPage.resumeAs", { email: userEmail })}
            </p>

            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                {t("registrerenPage.planTrialHeadline", { days: String(trialDays) })}
              </h2>
              <p className="text-sm leading-relaxed text-slate-600">
                {t("registrerenPage.planTrialSub")}
              </p>
            </div>

            <button
              type="button"
              disabled={checkoutLoading}
              onClick={() => void handleStartSelected()}
              className="flex w-full items-center justify-center rounded-xl border-none bg-blue-600 px-6 py-3.5 text-base font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.22)] transition-all duration-200 hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {checkoutLoading
                ? t("registrerenPage.submitBusy")
                : t("registrerenPage.planCtaTrial")}
            </button>

            <p className="text-xs leading-relaxed text-slate-500">
              {t("registrerenPage.planTrialFootnote")}
            </p>

            <p className="text-xs leading-relaxed text-slate-400">
              {t("registrerenPage.renewalDisclosure")}
            </p>

            {showYearlyOption ? (
              <button
                type="button"
                disabled={checkoutLoading}
                onClick={() => void handleStartYearly()}
                className="text-xs font-medium text-blue-600 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t("registrerenPage.planYearlyCta")}
              </button>
            ) : (
              <button
                type="button"
                disabled={checkoutLoading}
                onClick={() => setShowYearlyOption(true)}
                className="text-xs text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t("registrerenPage.planYearlyReveal")}
              </button>
            )}

            <p>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="text-xs text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
              >
                {t("registrerenPage.logoutLink")}
              </button>
            </p>
          </div>
        </div>
      </div>
    </RegistrerenShell>
  );
}

export default function RegistrerenPlanClient() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-0 w-full flex-1 items-center justify-center bg-[var(--st-bg)] text-sm text-slate-500">
          …
        </div>
      }
    >
      <RegistrerenPlanInner />
    </Suspense>
  );
}
