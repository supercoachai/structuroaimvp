"use client";

import { Suspense, useEffect, useState } from "react";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clearStructuroLocalModeCookie } from "@/lib/localModeSession";
import { useI18n } from "@/lib/i18n";
import { setCreateWelcomeTaskFlag } from "@/lib/onboardingWelcomeTask";
import {
  REGISTER_PLANS,
  type RegisterPlanId,
} from "@/lib/stripe/registerPlans";
import { profileHasAppAccess } from "@/lib/subscriptionAccess";
import { isRegistrationCheckoutEnabledClient } from "@/lib/stripe/registrationLaunch";
import { RegistrerenShell } from "./RegistrerenShell";
import { RegistrerenPricingCard } from "./RegistrerenPricingCard";
import { refundMailtoHref } from "@/lib/refundContact";

function RegistrerenPlanInner() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  const cancelled = searchParams?.get("cancelled") === "1";
  const confirmed = searchParams?.get("confirmed") === "1";

  const [selectedPlanId, setSelectedPlanId] = useState<RegisterPlanId>("yearly");
  const [welcomeTaskOptIn, setWelcomeTaskOptIn] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

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
    }
  }, [cancelled, confirmed, t]);

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
  }, [router]);

  const selectedPlan =
    REGISTER_PLANS.find((p) => p.id === selectedPlanId) ?? REGISTER_PLANS[0];
  const monthlyPlan = REGISTER_PLANS.find((p) => p.id === "monthly")!;
  const yearlyPlan = REGISTER_PLANS.find((p) => p.id === "yearly")!;

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

    const data = (await res.json()) as { url?: string; error?: string };

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

      await startCheckout(selectedPlan.priceId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("registrerenPage.errCheckout"));
    } finally {
      setCheckoutLoading(false);
    }
  }

  if (!sessionChecked || !userId || !userEmail) {
    return (
      <RegistrerenShell info={info}>
        <p className="text-center text-sm text-slate-500">{t("registrerenPage.loading")}</p>
      </RegistrerenShell>
    );
  }

  return (
    <RegistrerenShell error={error} info={info}>
      <p className="text-center text-xs text-slate-400">
        {t("registrerenPage.resumeAs", { email: userEmail })}
      </p>

      <h2 className="mt-2 mb-10 text-center text-lg font-semibold tracking-tight text-slate-900 sm:mt-4 sm:text-xl">
        {t("registrerenPage.planHeading")}
      </h2>

      <div className="grid grid-cols-2 items-stretch gap-2 sm:gap-5 lg:gap-6">
        <div className="flex min-w-0 w-full">
          <RegistrerenPricingCard
            plan={monthlyPlan}
            selected={selectedPlanId === "monthly"}
            onSelect={(plan) => setSelectedPlanId(plan.id)}
            t={t}
          />
        </div>
        <div className="flex min-w-0 w-full">
          <RegistrerenPricingCard
            plan={yearlyPlan}
            selected={selectedPlanId === "yearly"}
            onSelect={(plan) => setSelectedPlanId(plan.id)}
            t={t}
          />
        </div>
      </div>

      <div className="mt-6 flex items-start gap-2.5 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3.5 pt-4 sm:px-5 sm:py-4">
        <ShieldCheckIcon
          className="mt-1 h-5 w-5 shrink-0 text-emerald-600"
          aria-hidden
        />
        <div className="min-w-0 pt-0.5">
          <p className="text-sm font-semibold text-slate-900">
            {t("registrerenPage.guaranteeLine")}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
            {t("registrerenPage.guaranteeIntro")}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
            {t("registrerenPage.guaranteeCtaBefore")}{" "}
            <a
              href={refundMailtoHref(locale)}
              className="font-medium text-blue-600 underline-offset-2 hover:underline"
            >
              {t("registrerenPage.guaranteeMail")}
            </a>{" "}
            {t("registrerenPage.guaranteeCtaAfter")}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        <div className="rounded-[20px] border border-slate-200 bg-white px-6 py-5 shadow-sm sm:px-7">
          <h3 className="text-sm font-semibold text-slate-900">
            {t("registrerenPage.welcomeTaskTitle")}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {t("registrerenPage.welcomeTaskBody")}
          </p>
          <label className="mt-4 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={welcomeTaskOptIn}
              onChange={(e) => setWelcomeTaskOptIn(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
            />
            <span className="text-sm leading-snug text-slate-800">
              {t("registrerenPage.welcomeTaskCheckbox")}
            </span>
          </label>
          <p className="mt-3 text-xs text-slate-400">
            {t("registrerenPage.welcomeTaskSource")}
          </p>
        </div>

        <button
          type="button"
          disabled={checkoutLoading}
          onClick={() => void handleStartSelected()}
          className="flex w-full items-center justify-center rounded-xl border-none bg-blue-600 px-6 py-[15px] text-base font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-[0_12px_28px_rgba(37,99,235,0.28)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {checkoutLoading ? t("registrerenPage.submitBusy") : t("registrerenPage.ctaStart")}
        </button>
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
    </RegistrerenShell>
  );
}

export default function RegistrerenPlanClient() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--st-bg)] text-sm text-slate-500">
          …
        </div>
      }
    >
      <RegistrerenPlanInner />
    </Suspense>
  );
}
