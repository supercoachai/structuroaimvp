"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { PaymentTrustStrip } from "@/components/subscription/PaymentTrustStrip";
import { profileHasAppAccess } from "@/lib/subscriptionAccess";
import { freeTrialExpired } from "@/lib/freeTrialAccess";
import { toast } from "@/components/Toast";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function pollStripeReturnSession(
  router: ReturnType<typeof useRouter>,
  shouldAbort: () => boolean
): Promise<boolean> {
  await sleep(2000);
  for (let i = 0; i < 15; i++) {
    if (shouldAbort()) return false;
    if (i === 0) {
      try {
        await fetch("/api/stripe/sync-subscription", {
          method: "POST",
          credentials: "include",
        });
      } catch {
        /* webhook/sync best-effort */
      }
    }
    const res = await fetch("/api/profile/subscription-status", {
      credentials: "include",
    });
    if (res.ok) {
      const data = (await res.json()) as {
        status: string | null;
        current_period_end: string | null;
      };
      if (
        profileHasAppAccess({
          subscription_status: data.status,
          subscription_current_period_end: data.current_period_end,
        })
      ) {
        if (!shouldAbort()) router.replace("/dagstart");
        return true;
      }
    }
    await sleep(1500);
  }
  return false;
}

export default function AbonnementPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [busyPlan, setBusyPlan] = useState<"monthly" | "yearly" | null>(null);
  const [trialExpired, setTrialExpired] = useState(false);
  /** idle = geen stripe-return; polling = wacht op webhook; pending_timeout = vriendelijke timeout */
  const [stripeReturnPhase, setStripeReturnPhase] = useState<
    "idle" | "polling" | "pending_timeout"
  >("idle");

  const checkAccessAndMaybeHome = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return;
    const { data: row } = await supabase
      .from("profiles")
      .select("subscription_status, subscription_current_period_end")
      .eq("id", user.id)
      .maybeSingle();
    if (
      row &&
      profileHasAppAccess({
        subscription_status: row.subscription_status as string | null,
        subscription_current_period_end: row.subscription_current_period_end as
          | string
          | null,
      })
    ) {
      router.replace("/dagstart");
    }
  }, [router]);

  useEffect(() => {
    // Detecteer of proeftijd verlopen is (voor gepaste messaging)
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("created_at, subscription_status")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (!data) return;
          const status = data.subscription_status as string | null;
          if (status === "active" || status === "cancelled") return;
          if (freeTrialExpired(data.created_at as string | null)) {
            setTrialExpired(true);
          }
        });
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    if (q.get("from") !== "stripe") return;
    setStripeReturnPhase("polling");
    let cancelled = false;
    const run = async () => {
      const gotAccess = await pollStripeReturnSession(router, () => cancelled);
      if (cancelled) return;
      if (!gotAccess) setStripeReturnPhase("pending_timeout");
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const refreshStripeStatus = useCallback(async () => {
    setStripeReturnPhase("polling");
    const gotAccess = await pollStripeReturnSession(router, () => false);
    if (!gotAccess) setStripeReturnPhase("pending_timeout");
  }, [router]);

  const startCheckout = async (plan: "monthly" | "yearly") => {
    setBusyPlan(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        if (data.error === "previous_refund_exists") {
          toast(t("settings.refundPreviouslyRefunded"));
          return;
        }
        if (data.error === "service_role_key_missing") {
          toast(t("subscription.checkoutServiceRoleError"));
          return;
        }
        toast(data.error ?? t("subscriptionPage.checkoutFail"));
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      toast(t("subscriptionPage.checkoutFail"));
    } catch (e) {
      toast(t("subscriptionPage.checkoutFail"));
    } finally {
      setBusyPlan(null);
    }
  };

  const refundMail = "mailto:info@structuro.eu?subject=Geld%20terug";

  return (
    <>
      <div className="min-h-full bg-[var(--structuro-bg)] text-[var(--structuro-text)]">
        <main className="mx-auto w-full max-w-2xl px-4 pb-28 pt-6">
          <h1 className="structuro-page-title mb-2">{t("subscriptionPage.title")}</h1>
          <p className="structuro-page-subtitle mb-8 max-w-xl">
            {t("subscriptionPage.subtitle")}
          </p>

          {trialExpired ? (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
              <p className="font-semibold">Je gratis proeftijd is verlopen.</p>
              <p className="mt-1 text-amber-800">
                Kies een abonnement om Structuro te blijven gebruiken. Je voortgang en instellingen staan gewoon klaar.
              </p>
            </div>
          ) : null}

          {stripeReturnPhase === "polling" ? (
            <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              {t("subscriptionPage.waitingStripe")}
            </div>
          ) : null}
          {stripeReturnPhase === "pending_timeout" ? (
            <div className="mb-6 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-800">
              <p className="text-balance">{t("subscriptionPage.stripePendingBody")}</p>
              <button
                type="button"
                onClick={() => void refreshStripeStatus()}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                {t("subscriptionPage.refreshStatus")}
              </button>
            </div>
          ) : null}

          <div className="mb-10 grid gap-4 sm:grid-cols-2">
            <Card className="border border-slate-100">
              <CardContent className="space-y-4 pt-6">
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {t("subscriptionPage.monthlyPrice")}
                    <span className="ml-1 text-base font-medium text-slate-500">
                      {t("subscriptionPage.monthlyPeriod")}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyPlan !== null}
                  onClick={() => void startCheckout("monthly")}
                  className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
                >
                  {busyPlan === "monthly" ? "…" : t("subscriptionPage.cta")}
                </button>
              </CardContent>
            </Card>

            <Card className="relative border-2 border-indigo-200 ring-1 ring-indigo-100">
              <div className="absolute -top-2.5 right-4 rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm">
                {t("subscriptionPage.yearlyBadge")}
              </div>
              <CardHeader>
                <CardTitle className="text-base">{t("subscriptionPage.yearlyTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {t("subscriptionPage.yearlyPrice")}
                  </p>
                  <p className="text-sm text-slate-500">{t("subscriptionPage.yearlyPeriod")}</p>
                  <p className="mt-1 text-xs text-indigo-700">{t("subscriptionPage.yearlyEquiv")}</p>
                </div>
                <button
                  type="button"
                  disabled={busyPlan !== null}
                  onClick={() => void startCheckout("yearly")}
                  className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
                >
                  {busyPlan === "yearly" ? "…" : t("subscriptionPage.cta")}
                </button>
              </CardContent>
            </Card>
          </div>

          <div className="mb-8 max-w-xl space-y-2 rounded-xl border border-slate-100 bg-white/80 px-4 py-3 text-slate-800 shadow-sm">
            <p className="text-sm font-semibold leading-snug text-slate-900">
              {t("subscription.moneyBackTitle")}
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              {t("subscription.moneyBackBody")}
            </p>
            <details className="text-sm">
              <summary className="cursor-pointer font-medium text-blue-700 hover:text-blue-900">
                {t("subscription.moneyBackHowLink")}
              </summary>
              <p className="mt-2 text-slate-600">{t("subscription.moneyBackHowDetail")}</p>
            </details>
          </div>

          <PaymentTrustStrip />

          <div className="flex flex-wrap justify-center gap-3 mt-10">
            <button
              type="button"
              onClick={() => void checkAccessAndMaybeHome()}
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              {t("subscriptionPage.openApp")}
            </button>
            <a
              href={refundMail}
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              {t("subscriptionPage.refundMail")}
            </a>
          </div>
        </main>
      </div>
    </>
  );
}
