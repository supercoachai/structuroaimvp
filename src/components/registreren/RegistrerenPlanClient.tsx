"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { V2Eyebrow, V2Header, V2Page } from "@/components/v2/V2Chrome";
import V2LanguageToggle from "@/components/v2/V2LanguageToggle";
import StructuroLogoLoading from "@/components/structuro/StructuroLogoLoading";
import { v2Styles } from "@/components/v2/theme";
import { useClientMounted } from "@/hooks/useClientMounted";
import { markCheckoutStarted } from "@/lib/checkoutReturnStorage";
import { hasEventSignupAppTrial } from "@/lib/eventSignupTrialAccess";
import { useI18n } from "@/lib/i18n";
import { clearStructuroLocalModeCookie } from "@/lib/localModeSession";
import { setCreateWelcomeTaskFlag } from "@/lib/onboardingWelcomeTask";
import { trackRegistrationFunnelServer } from "@/lib/posthog/registrationFunnelClient";
import {
  applySignupAttributionFromSearchParams,
  getStoredSignupSource,
  resolveRegistrationTrialDays,
} from "@/lib/posthog/signupAttribution";
import { requiresPaidSubscriptionBeforeOnboarding } from "@/lib/registrationGate";
import type { RetentionStats } from "@/lib/retentionStats";
import { isRegistrationCheckoutEnabledClient } from "@/lib/stripe/registrationLaunch";
import {
  defaultRegisterPlanId,
  REGISTER_PLANS,
  type RegisterPlanId,
} from "@/lib/stripe/registerPlans";
import { isEventSignupSource } from "@/lib/stripe/trialConfig";
import { createClient } from "@/lib/supabase/client";
import { profileHasAppAccess } from "@/lib/subscriptionAccess";

function emptyStats(trialDays: number): RetentionStats {
  return {
    trialDays,
    daysActive: 0,
    tasksCompleted: 0,
    openTasks: 0,
    streakFilled: 0,
  };
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="v2-abonnement__stat">
      <div className="v2-abonnement__stat-n">{n}</div>
      <div className="v2-abonnement__stat-l">{label}</div>
    </div>
  );
}

function RegistrerenPlanInner() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  const cancelled = searchParams?.get("cancelled") === "1";
  const confirmed = searchParams?.get("confirmed") === "1";
  const resume = searchParams?.get("resume") === "1";
  const preview =
    searchParams?.get("preview") === "1" &&
    process.env.NODE_ENV === "development";

  const [selectedPlanId] = useState<RegisterPlanId>(defaultRegisterPlanId());
  const [welcomeTaskOptIn] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [trialDays, setTrialDays] = useState<number | null>(null);
  const [stats, setStats] = useState<RetentionStats | null>(null);
  const [showYearlyOption, setShowYearlyOption] = useState(false);
  const mounted = useClientMounted();
  const planViewTrackedRef = useRef(false);

  useEffect(() => {
    applySignupAttributionFromSearchParams(searchParams);
  }, [searchParams]);

  useEffect(() => {
    if (preview) return;
    if (!isRegistrationCheckoutEnabledClient()) {
      router.replace("/login");
    }
  }, [preview, router]);

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
    if (!preview) return;
    setTrialDays(3);
    setStats({
      trialDays: 3,
      daysActive: 2,
      tasksCompleted: 7,
      openTasks: 2,
      streakFilled: 2,
    });
    setUserId("preview");
    setUserEmail("preview@structuro.local");
    setSessionChecked(true);
  }, [preview]);

  useEffect(() => {
    if (preview) return;
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

        let nextStats = emptyStats(days);
        try {
          const res = await fetch("/api/abonnement/retention-stats", {
            credentials: "include",
          });
          if (res.ok) {
            const body = (await res.json()) as RetentionStats;
            nextStats = {
              trialDays: body.trialDays > 0 ? body.trialDays : days,
              daysActive: body.daysActive ?? 0,
              tasksCompleted: body.tasksCompleted ?? 0,
              openTasks: body.openTasks ?? 0,
              streakFilled: body.streakFilled ?? 0,
            };
          }
        } catch {
          /* best-effort */
        }

        if (cancelledEffect) return;
        setTrialDays(days);
        setStats(nextStats);
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
  }, [preview, router, cancelled, confirmed, resume, t]);

  useEffect(() => {
    if (preview) return;
    if (!mounted || !sessionChecked || !userId || planViewTrackedRef.current)
      return;
    planViewTrackedRef.current = true;
    trackRegistrationFunnelServer("registreren_plan_viewed", {
      plan_id: "monthly",
      default_plan_id: defaultRegisterPlanId(),
      cancelled,
      resume,
    });
  }, [preview, mounted, sessionChecked, userId, cancelled, resume]);

  const monthlyPlan = REGISTER_PLANS.find((p) => p.id === "monthly")!;
  const checkoutPlan =
    REGISTER_PLANS.find((p) => p.id === selectedPlanId) ?? monthlyPlan;

  async function handleLogout() {
    if (preview) {
      router.replace("/registreren");
      return;
    }
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
    if (preview) {
      setInfo("Preview: checkout staat uit lokaal.");
      return;
    }

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
      setError(
        err instanceof Error ? err.message : t("registrerenPage.errCheckout")
      );
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
      setError(
        err instanceof Error ? err.message : t("registrerenPage.errCheckout")
      );
    } finally {
      setCheckoutLoading(false);
    }
  }

  if (
    !mounted ||
    !sessionChecked ||
    !userId ||
    !userEmail ||
    trialDays === null ||
    !stats
  ) {
    return (
      <V2Page>
        <V2Header brandMode="flow" trailing={<V2LanguageToggle />} />
        <StructuroLogoLoading fullScreen={false} className="min-h-[40vh]" size={72} />
      </V2Page>
    );
  }

  const displayTrialDays =
    stats.trialDays > 0 ? stats.trialDays : trialDays > 0 ? trialDays : 3;
  const hasBuiltSomething =
    stats.daysActive > 0 || stats.tasksCompleted > 0 || stats.openTasks > 0;

  return (
    <V2Page>
      <V2Header
        brandMode="flow"
        exitHref="https://www.structuro.eu"
        exitLabel={t("registrerenPage.backLink")}
        trailing={<V2LanguageToggle />}
      />

      <div className="v2-abonnement v2-fade">
        <V2Eyebrow>{t("registrerenPage.planTrialHeadline")}</V2Eyebrow>
        <h1
          style={{
            ...v2Styles.title,
            fontSize: "var(--fs-display)",
            marginTop: 8,
          }}
        >
          {hasBuiltSomething
            ? t("registrerenPage.planBuiltHeadline", {
                days: String(displayTrialDays),
              })
            : t("registrerenPage.planTrialHeadline")}
        </h1>

        {hasBuiltSomething ? (
          <section
            className="v2-abonnement__built"
            aria-label={t("registrerenPage.planBuiltLabel")}
          >
            <p className="v2-abonnement__built-label">
              {t("registrerenPage.planBuiltLabel")}
            </p>
            <div className="v2-abonnement__stats">
              <Stat
                n={stats.daysActive}
                label={t("registrerenPage.planStatDays")}
              />
              <Stat
                n={stats.tasksCompleted}
                label={t("registrerenPage.planStatDone")}
              />
              <Stat
                n={stats.openTasks}
                label={t("registrerenPage.planStatOpen")}
              />
            </div>
          </section>
        ) : null}

        <p style={{ ...v2Styles.body, marginTop: 4 }}>
          {hasBuiltSomething
            ? t("registrerenPage.planBuiltLead", {
                days: String(displayTrialDays),
              })
            : t("registrerenPage.planTrialSub")}
        </p>

        {info ? (
          <p
            style={{
              ...v2Styles.body,
              marginTop: 12,
              fontSize: 14,
              color: "var(--text-muted)",
            }}
          >
            {info}
          </p>
        ) : null}

        {error ? (
          <p
            role="alert"
            style={{
              ...v2Styles.body,
              marginTop: 12,
              fontSize: 14,
              color: "var(--danger, #b42318)",
            }}
          >
            {error}
          </p>
        ) : null}

        <section className="v2-abonnement__decision">
          <button
            type="button"
            className="btn-primary w-full"
            disabled={checkoutLoading}
            onClick={() => void handleStartSelected()}
          >
            {checkoutLoading
              ? t("registrerenPage.submitBusy")
              : t("registrerenPage.planCtaStay")}
          </button>

          <p className="v2-abonnement__price">
            {t("registrerenPage.planPriceLine")}
          </p>

          <div className="v2-abonnement__secondary">
            {showYearlyOption ? (
              <button
                type="button"
                className="v2-link"
                disabled={checkoutLoading}
                onClick={() => void handleStartYearly()}
              >
                {t("registrerenPage.planYearlyCta")}
              </button>
            ) : (
              <button
                type="button"
                className="v2-link"
                disabled={checkoutLoading}
                onClick={() => setShowYearlyOption(true)}
              >
                {t("registrerenPage.planYearlyReveal")}
              </button>
            )}
          </div>
        </section>

        <p className="v2-abonnement__trust">
          {t("registrerenPage.planTrust")}
          <br />
          {t("registrerenPage.planTrialFootnote")}
        </p>

        <p style={{ textAlign: "center", marginTop: 8 }}>
          <button
            type="button"
            className="v2-link"
            onClick={() => void handleLogout()}
          >
            {t("registrerenPage.logoutLink")}
          </button>
        </p>

        {userEmail ? (
          <p
            style={{
              ...v2Styles.body,
              fontSize: 12,
              textAlign: "center",
              opacity: 0.55,
              marginTop: 4,
            }}
          >
            {t("registrerenPage.resumeAs", { email: userEmail })}
          </p>
        ) : null}
      </div>
    </V2Page>
  );
}

export default function RegistrerenPlanClient() {
  return (
    <Suspense
      fallback={
        <V2Page>
          <StructuroLogoLoading fullScreen={false} className="min-h-[40vh]" size={72} />
        </V2Page>
      }
    >
      <RegistrerenPlanInner />
    </Suspense>
  );
}
