"use client";

import { useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useTaskContext } from "@/context/TaskContext";
import { useI18n } from "@/lib/i18n";
import {
  hasStructuroLocalModeCookieOnClient,
  setLocalOnboardingDoneCookieOnClient,
} from "@/lib/localOnboardingCookie";
import { clearLocalSessionFresh } from "@/lib/localModeSession";
import { isLocalOnboardingCompleted } from "@/lib/onboardingProfile";
import { hasSupabaseAuthHintOnClient } from "@/lib/supabase/authStorage";
import OnboardingFlowContent from "./OnboardingFlowContent";

function ObLanguageToggle({
  locale,
  setLocale,
  label,
}: {
  locale: string;
  setLocale: (locale: "nl" | "en") => void;
  label: string;
}) {
  return (
    <div
      className="absolute right-4 top-6 z-30 flex gap-1 rounded-lg border border-slate-200/80 bg-white/90 p-0.5 text-xs font-semibold shadow-sm backdrop-blur-sm"
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        onClick={() => setLocale("nl")}
        className={`rounded-md px-2 py-1 ${locale === "nl" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
      >
        NL
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`rounded-md px-2 py-1 ${locale === "en" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
      >
        EN
      </button>
    </div>
  );
}

export default function OnboardingFlow() {
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  const { user, authLoading } = useTaskContext();

  const isLocalMode =
    typeof window !== "undefined" && hasStructuroLocalModeCookieOnClient();

  useEffect(() => {
    if (isLocalMode && isLocalOnboardingCompleted()) {
      setLocalOnboardingDoneCookieOnClient();
      clearLocalSessionFresh();
      window.location.replace("/");
    }
  }, [isLocalMode]);

  /**
   * Geen client-side redirect naar /login: middleware stuurt niet-ingelogde users al weg.
   * Wacht op useUser zolang er een sessie-hint is (cookie/localStorage), ook als getSession
   * even null is tijdens Supabase-hydratie.
   */
  const authHint =
    typeof window !== "undefined" && hasSupabaseAuthHintOnClient();
  const waitingForSession = !isLocalMode && !user?.id && authLoading;
  /** Cookie-hint zonder user: middleware liet door, geen login-scherm tonen. */
  const showLoginRedirect =
    !isLocalMode && !authLoading && !user?.id && !authHint;

  useEffect(() => {
    if (!showLoginRedirect) return;
    router.replace("/login?checkout=1");
  }, [showLoginRedirect, router]);

  if (waitingForSession) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 pt-[max(0px,env(safe-area-inset-top))] text-slate-500">
        <ObLanguageToggle
          locale={locale}
          setLocale={setLocale}
          label={t("settings.languageTitle")}
        />
        <div className="animate-pulse text-base">{t("onboarding.loading")}</div>
      </div>
    );
  }

  if (showLoginRedirect) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-50 to-blue-50 px-6 pt-[max(3.5rem,env(safe-area-inset-top))] text-center text-slate-500">
        <ObLanguageToggle
          locale={locale}
          setLocale={setLocale}
          label={t("settings.languageTitle")}
        />
        <div className="animate-pulse text-base">{t("onboarding.redirectLogin")}</div>
        <p className="text-sm text-slate-400">{t("onboarding.noSession")}</p>
      </div>
    );
  }

  return (
    <OnboardingFlowContent
      isLocalMode={isLocalMode}
      user={user as User | null}
    />
  );
}
