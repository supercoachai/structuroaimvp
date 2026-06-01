"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";
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
import { isRegistrationCheckoutEnabledClient } from "@/lib/stripe/registrationLaunch";
import { RegistrerenShell } from "./RegistrerenShell";
import { RegistrerenPricingCard } from "./RegistrerenPricingCard";
import { refundMailtoHref } from "@/lib/refundContact";
import { trackRegistrationFunnelServer } from "@/lib/posthog/registrationFunnelClient";
import { useClientMounted } from "@/hooks/useClientMounted";

function RegistrerenPlanInner() {
  const { t, locale } = useI18n();
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
  const mounted = useClientMounted();
  const planViewTrackedRef = useRef(false);

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
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (cancelledEffect) return;

        if (!user?.id) {
          router.replace("/registreren");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("subscription_status, subscription_current_period_end")
          .eq("id", user.id)
          .maybeSingle();

        if (
          profile &&
          profileHasAppAccess({
            subscription_status: profile.subscription_status as string | null,
            subscription_current_period_end:
              profile.subscription_current_period_end as string | null,
          })
        ) {
          router.replace("/welkom");
          return;
        }

        setUserId(user.id);
        setUserEmail(user.email ?? null);
      } catch {
        /* ignore */
      } finally {
        if (!cancelledEffect) setSessionChecked(true);
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
  }, [
    mounted,
    sessionChecked,
    userId,
    cancelled,
    resume,
  ]);

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

  if (!mounted || !sessionChecked || !userId || !userEmail) {
    return (
      <RegistrerenShell page="plan" info={info}>
        <p className="text-center text-sm text-slate-500">{t("registrerenPage.loading")}</p>
      </RegistrerenShell>
    );
  }

  const guaranteeDetailsLabel =
    locale === "en" ? "14-day refund details" : "14 dagen geld-terug";

  return (
    <RegistrerenShell page="plan" error={error} info={info}>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
        <div className="flex min-h-full flex-col justify-center py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex w-full max-w-sm flex-col gap-3 px-0.5">
          <p className="text-center text-[11px] leading-tight text-slate-400">
            {t("registrerenPage.resumeAs", { email: userEmail })}
          </p>

          <h2 className="text-center text-lg font-semibold leading-snug tracking-tight text-slate-900">
            {t("registrerenPage.planHeading")}
          </h2>

          <div className="pointer-events-none select-none">
            <RegistrerenPricingCard
              plan={monthlyPlan}
              selected
              onSelect={() => {}}
              t={t}
            />
          </div>

          <p className="text-center text-xs text-slate-500">
            {locale === "en" ? "Prefer yearly?" : "Liever jaarlijks?"}{" "}
            <button
              type="button"
              disabled={checkoutLoading}
              onClick={() => void handleStartYearly()}
              className="pointer-events-auto font-medium text-blue-600 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
            >
              {locale === "en"
                ? "€119/year — almost 3 months free →"
                : "€119/jaar — bijna 3 maanden gratis →"}
            </button>
          </p>

          <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
            <ShieldCheckIcon
              className="h-5 w-5 shrink-0 text-emerald-600"
              aria-hidden
            />
            <p className="text-sm font-semibold leading-snug text-slate-900">
              {t("registrerenPage.guaranteeLine")}
            </p>
          </div>

          <button
            type="button"
            disabled={checkoutLoading}
            onClick={() => void handleStartSelected()}
            className="flex w-full items-center justify-center rounded-xl border-none bg-blue-600 px-6 py-3.5 text-base font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.22)] transition-all duration-200 hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {checkoutLoading ? t("registrerenPage.submitBusy") : t("registrerenPage.ctaStart")}
          </button>

          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
            <details className="group inline-block">
              <summary className="cursor-pointer list-none text-xs text-slate-400 underline-offset-2 hover:text-slate-500 hover:underline [&::-webkit-details-marker]:hidden">
                {guaranteeDetailsLabel}
              </summary>
              <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-slate-500">
                {t("registrerenPage.guaranteeIntro")}{" "}
                {t("registrerenPage.guaranteeCtaBefore")}{" "}
                <a
                  href={refundMailtoHref(locale)}
                  className="font-medium text-blue-600 underline-offset-2 hover:underline"
                >
                  {t("registrerenPage.guaranteeMail")}
                </a>{" "}
                {t("registrerenPage.guaranteeCtaAfter")}
              </p>
            </details>
            <span className="hidden text-slate-200 sm:inline" aria-hidden>
              ·
            </span>
            <details className="group inline-block">
              <summary className="cursor-pointer list-none text-xs text-slate-400 underline-offset-2 hover:text-slate-500 hover:underline [&::-webkit-details-marker]:hidden">
                {locale === "en" ? "Renewal & payment" : "Verlenging & betaling"}
              </summary>
              <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-slate-500">
                {t("registrerenPage.renewalDisclosure")}
              </p>
            </details>
          </div>

          <p className="text-center">
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
