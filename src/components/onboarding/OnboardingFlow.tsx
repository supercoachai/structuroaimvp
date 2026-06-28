"use client";

import { useEffect, useLayoutEffect, useState } from "react";
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
import {
  buildRegistrerenHrefFromStoredAttribution,
  getStoredSignupSource,
  hasJasperAttributionOnClient,
} from "@/lib/posthog/signupAttribution";
import { resolveCompletedLocalOnboardingDestination } from "@/lib/auth/anonymousOnboardingEntry";
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
  const [clientReady, setClientReady] = useState(false);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [authHint, setAuthHint] = useState(false);

  useLayoutEffect(() => {
    setIsLocalMode(hasStructuroLocalModeCookieOnClient());
    setAuthHint(hasSupabaseAuthHintOnClient());
    setClientReady(true);
  }, []);

  useEffect(() => {
    if (!clientReady || !isLocalMode || !isLocalOnboardingCompleted()) return;
    setLocalOnboardingDoneCookieOnClient();
    clearLocalSessionFresh();
    // Anonieme acquisitie-bezoeker (jasper/start/tiktok) zonder account die de
    // onboarding al afrondde: stuur naar "Bewaar je dagstart" op /registreren in
    // plaats van de app in te vallen met de in-app spaarbanner. Een gewone lokale
    // gebruiker zonder attributie gaat zoals voorheen naar de app.
    const destination = resolveCompletedLocalOnboardingDestination({
      hasAuthHint: hasSupabaseAuthHintOnClient(),
      signupSource: getStoredSignupSource(),
      hasJasperAttribution: hasJasperAttributionOnClient(),
      registrerenHref: buildRegistrerenHrefFromStoredAttribution(),
    });
    window.location.replace(destination);
  }, [clientReady, isLocalMode]);

  /**
   * Geen client-side redirect naar /login: middleware stuurt niet-ingelogde users al weg.
   * Wacht op useUser zolang er een sessie-hint is (cookie/localStorage), ook als getSession
   * even null is tijdens Supabase-hydratie.
   */
  const waitingForSession = clientReady && !isLocalMode && !user?.id && authLoading;
  /** Cookie-hint zonder user: middleware liet door, geen login-scherm tonen. */
  const showLoginRedirect =
    clientReady && !isLocalMode && !authLoading && !user?.id && !authHint;

  useEffect(() => {
    if (!showLoginRedirect) return;
    router.replace("/login?checkout=1");
  }, [showLoginRedirect, router]);

  if (!clientReady || waitingForSession) {
    return (
      <div className="st-story-bg relative flex min-h-screen items-center justify-center pt-[max(0px,env(safe-area-inset-top))] text-[var(--story-text-muted)]">
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
      <div className="st-story-bg relative flex min-h-screen flex-col items-center justify-center gap-3 px-6 pt-[max(3.5rem,env(safe-area-inset-top))] text-center text-[var(--story-text-muted)]">
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
