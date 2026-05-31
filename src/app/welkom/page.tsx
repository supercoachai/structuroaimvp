"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import WelkomSuccessScreen from "@/components/welkom/WelkomSuccessScreen";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { createOnboardingWelcomeTask } from "@/lib/onboardingWelcomeTask";
import { resolveWelcomeTaskAfterCheckout } from "@/lib/welcomeTaskAfterCheckout";
import { captureProductEvent } from "@/lib/posthog/track";
import {
  clearCheckoutReturn,
  readCheckoutReturn,
  resolveCheckoutSessionId,
} from "@/lib/checkoutReturnStorage";
import { profileHasAppAccess } from "@/lib/subscriptionAccess";
import { resumeCheckoutSession } from "@/lib/resumeCheckoutSession";
import { shouldShowPwaInstallHint } from "@/lib/pwaInstallHint";

type WelkomPhase = "loading" | "ready" | "pending_payment" | "resuming";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchStripeSessionPaid(sessionId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `/api/checkout/session-status?session_id=${encodeURIComponent(sessionId)}`
    );
    if (!res.ok) return false;
    const data = (await res.json()) as { paid?: boolean };
    return data.paid === true;
  } catch {
    return false;
  }
}

async function pollStripeSessionPaid(sessionId: string): Promise<boolean> {
  for (let i = 0; i < 8; i++) {
    if (await fetchStripeSessionPaid(sessionId)) return true;
    await sleep(i === 0 ? 1500 : 2000);
  }
  return false;
}

async function fetchProfileHasAccess(): Promise<boolean> {
  try {
    const res = await fetch("/api/profile/subscription-status", {
      credentials: "include",
    });
    if (!res.ok) return false;
    const data = (await res.json()) as {
      status: string | null;
      current_period_end: string | null;
    };
    return profileHasAppAccess({
      subscription_status: data.status,
      subscription_current_period_end: data.current_period_end,
    });
  } catch {
    return false;
  }
}

function WelkomPageInner() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const previewInstall =
    process.env.NODE_ENV === "development" &&
    searchParams?.get("previewInstall") === "1";
  const welcomeTaskStarted = useRef(false);
  const [welcomeTaskReady, setWelcomeTaskReady] = useState(false);
  const [phase, setPhase] = useState<WelkomPhase>("loading");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [recoveryHint, setRecoveryHint] = useState<string | null>(null);
  const [ctaHref, setCtaHref] = useState("/onboarding");
  const [ctaLabel, setCtaLabel] = useState<string | null>(null);
  const [showClosingLine, setShowClosingLine] = useState(false);

  useEffect(() => {
    if (previewInstall) return;
    if (welcomeTaskStarted.current) return;
    welcomeTaskStarted.current = true;

    (async () => {
      const checkoutSessionId = resolveCheckoutSessionId(
        searchParams?.get("session_id")
      );
      const checkoutReturn = readCheckoutReturn();

      const supabase = createClient();
      let {
        data: { user },
      } = await supabase.auth.getUser();

      let hasAccess = false;
      if (user?.id) {
        hasAccess = await fetchProfileHasAccess();
      }

      if (!user?.id && checkoutSessionId) {
        setPhase("resuming");
        const resume = await resumeCheckoutSession(checkoutSessionId);
        if (resume.ok) {
          clearCheckoutReturn();
          ({
            data: { user },
          } = await supabase.auth.getUser());
          hasAccess = await fetchProfileHasAccess();
        }
      }

      if (user?.id && hasAccess) {
        setIsLoggedIn(true);
        clearCheckoutReturn();

        const decision = await resolveWelcomeTaskAfterCheckout();
        captureProductEvent("welcome_task_checkout_decision", {
          source: decision.source,
          should_create: decision.shouldCreate,
          had_checkout_session_id: Boolean(checkoutSessionId),
          metadata_lookup_failed: decision.metadataLookupFailed,
        });

        if (decision.shouldCreate) {
          try {
            const created = await createOnboardingWelcomeTask(user.id);
            if (created) {
              captureProductEvent("welcome_task_created", {
                source: decision.source,
              });
            }
          } catch (err) {
            console.error("[welkom] welcome task creation failed", err);
          }
        }

        setCtaHref(
          shouldShowPwaInstallHint() ? "/welkom/install" : "/onboarding"
        );
        setCtaLabel(
          shouldShowPwaInstallHint()
            ? t("welkomPage.ctaToInstall")
            : null
        );
        setShowClosingLine(false);
        setWelcomeTaskReady(true);
        setPhase("ready");
        return;
      }

      let paymentVerified = hasAccess;

      if (!paymentVerified && checkoutSessionId) {
        paymentVerified = await pollStripeSessionPaid(checkoutSessionId);
      }

      if (!paymentVerified && checkoutReturn) {
        paymentVerified = true;
      }

      if (!paymentVerified && checkoutSessionId) {
        setPhase("pending_payment");
        setWelcomeTaskReady(true);
        return;
      }

      setPhase("ready");
      setIsLoggedIn(Boolean(user?.id));

      if (user?.id) {
        setCtaHref("/onboarding");
        setCtaLabel(null);
        setShowClosingLine(false);
      } else {
        const emailHint = checkoutReturn?.email;
        if (emailHint) {
          setRecoveryHint(t("welkomPage.recoveryHint", { email: emailHint }));
        }
        const loginNext = checkoutSessionId
          ? `/welkom?session_id=${encodeURIComponent(checkoutSessionId)}`
          : "/welkom";
        setCtaHref(
          `/login?checkout=1&next=${encodeURIComponent(loginNext)}`
        );
        setCtaLabel(t("welkomPage.ctaLogin"));
        setShowClosingLine(true);
      }

      const decision = await resolveWelcomeTaskAfterCheckout();
      captureProductEvent("welcome_task_checkout_decision", {
        source: decision.source,
        should_create: decision.shouldCreate,
        had_checkout_session_id: Boolean(checkoutSessionId),
        metadata_lookup_failed: decision.metadataLookupFailed,
      });

      if (!decision.shouldCreate) {
        setWelcomeTaskReady(true);
        return;
      }

      try {
        if (user?.id) {
          const created = await createOnboardingWelcomeTask(user.id);
          if (created) {
            captureProductEvent("welcome_task_created", {
              source: decision.source,
            });
          }
        }
      } catch (err) {
        console.error("[welkom] welcome task creation failed", err);
      } finally {
        setWelcomeTaskReady(true);
      }
    })();
  }, [searchParams, t, router, previewInstall]);

  if (previewInstall) {
    return (
      <WelkomSuccessScreen
        title={t("welkomPage.title")}
        tagline={t("welkomPage.tagline")}
        cta={t("welkomPage.ctaToInstall")}
        busyLabel={t("registrerenPage.submitBusy")}
        paidBadge={t("welkomPage.paidBadge")}
        welcomeTaskReady
        ctaHref="/welkom/install?previewInstall=1"
      />
    );
  }

  if (phase === "loading" || phase === "resuming") {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-2 bg-[var(--st-bg)] px-6 text-center text-sm text-slate-500">
        <p>{phase === "resuming" ? t("welkomPage.resuming") : t("registrerenPage.loading")}</p>
      </div>
    );
  }

  if (phase === "pending_payment") {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[var(--st-bg)] px-6 text-center">
        <p className="text-base font-medium text-slate-800">
          {t("welkomPage.pendingTitle")}
        </p>
        <p className="max-w-sm text-sm text-slate-500">
          {t("welkomPage.pendingBody")}
        </p>
        <a
          href="/login?checkout=1"
          className="text-sm font-semibold text-blue-600 hover:text-blue-800"
        >
          {t("welkomPage.ctaLogin")}
        </a>
      </div>
    );
  }

  return (
    <WelkomSuccessScreen
      title={t("welkomPage.title")}
      tagline={t("welkomPage.tagline")}
      closingLine={
        showClosingLine
          ? isLoggedIn
            ? t("welkomPage.closingLine")
            : t("welkomPage.closingLineLogin")
          : null
      }
      cta={ctaLabel ?? t("welkomPage.cta")}
      busyLabel={t("registrerenPage.submitBusy")}
      paidBadge={t("welkomPage.paidBadge")}
      welcomeTaskReady={welcomeTaskReady}
      ctaHref={ctaHref}
      recoveryHint={recoveryHint}
    />
  );
}

export default function WelkomPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--st-bg)] text-sm text-slate-500">
          …
        </div>
      }
    >
      <WelkomPageInner />
    </Suspense>
  );
}
