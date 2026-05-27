"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import {
  consumeCreateWelcomeTaskFlag,
  createOnboardingWelcomeTask,
} from "@/lib/onboardingWelcomeTask";

export default function WelkomPage() {
  const { t } = useI18n();
  const welcomeTaskStarted = useRef(false);
  const [welcomeTaskReady, setWelcomeTaskReady] = useState(false);

  useEffect(() => {
    if (welcomeTaskStarted.current) return;
    welcomeTaskStarted.current = true;

    (async () => {
      if (!consumeCreateWelcomeTaskFlag()) {
        setWelcomeTaskReady(true);
        return;
      }

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.id) {
          await createOnboardingWelcomeTask(user.id);
        }
      } catch (err) {
        console.error("[welkom] welcome task creation failed", err);
      } finally {
        setWelcomeTaskReady(true);
      }
    })();
  }, []);

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-[var(--st-bg)] px-4 py-8">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-3xl">
          ✓
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {t("welkomPage.title")}
          </h1>
          <p className="text-sm leading-relaxed text-slate-600">
            {t("welkomPage.body")}
          </p>
        </div>
        <Link
          href="/onboarding"
          aria-disabled={!welcomeTaskReady}
          className={`inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 ${
            welcomeTaskReady ? "" : "pointer-events-none opacity-60"
          }`}
        >
          {welcomeTaskReady ? t("welkomPage.cta") : t("registrerenPage.submitBusy")}
        </Link>
        <p className="text-xs text-slate-400">{t("welkomPage.footerHint")}</p>
      </div>
    </div>
  );
}
