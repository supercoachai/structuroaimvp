"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import WelkomSuccessScreen from "@/components/welkom/WelkomSuccessScreen";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { createOnboardingWelcomeTask } from "@/lib/onboardingWelcomeTask";
import { resolveWelcomeTaskAfterCheckout } from "@/lib/welcomeTaskAfterCheckout";
import { captureProductEvent } from "@/lib/posthog/track";

function WelkomPageInner() {
  const { t } = useI18n();
  const welcomeTaskStarted = useRef(false);
  const [welcomeTaskReady, setWelcomeTaskReady] = useState(false);

  useEffect(() => {
    if (welcomeTaskStarted.current) return;
    welcomeTaskStarted.current = true;

    (async () => {
      const decision = await resolveWelcomeTaskAfterCheckout();

      captureProductEvent("welcome_task_checkout_decision", {
        source: decision.source,
        should_create: decision.shouldCreate,
        had_checkout_session_id: decision.hadCheckoutSessionId,
        metadata_lookup_failed: decision.metadataLookupFailed,
      });

      if (!decision.shouldCreate) {
        setWelcomeTaskReady(true);
        return;
      }

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
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
  }, []);

  return (
    <WelkomSuccessScreen
      title={t("welkomPage.title")}
      tagline={t("welkomPage.tagline")}
      closingLine={t("welkomPage.closingLine")}
      cta={t("welkomPage.cta")}
      busyLabel={t("registrerenPage.submitBusy")}
      paidBadge={t("welkomPage.paidBadge")}
      welcomeTaskReady={welcomeTaskReady}
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
