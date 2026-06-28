"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { AccountSignUpOptions } from "@/components/auth/AccountSignUpOptions";
import { buildLoginHref } from "@/lib/auth/authPagePaths";
import { PREFERRED_NAME_COOKIE } from "@/lib/auth/preferredNameCookie";
import { hasStructuroLocalModeCookieOnClient } from "@/lib/localOnboardingCookie";
import { hasSupabaseAuthHintOnClient } from "@/lib/supabase/authStorage";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import {
  applySignupAttributionFromSearchParams,
  getStoredSignupSource,
  resolveRegistrerenPresentation,
} from "@/lib/posthog/signupAttribution";
import { trackAcquisitionSignupStarted } from "@/lib/posthog/acquisitionAnalyticsClient";
import { resolveClientPostSignupPath } from "@/lib/postSignupRouting";
import {
  DEFAULT_STRIPE_TRIAL_DAYS,
  isEventSignupSource,
  resolveStripeTrialDaysForSignupSource,
} from "@/lib/stripe/trialConfig";
import { isRegistrationCheckoutEnabledClient } from "@/lib/stripe/registrationLaunch";
import { RegistrerenShell } from "./RegistrerenShell";

/** Aanspreeknaam in cookie zetten zodat de OAuth-callback hem op het profiel kan zetten. */
function writePreferredNameCookie(name: string) {
  try {
    if (name) {
      document.cookie = `${PREFERRED_NAME_COOKIE}=${encodeURIComponent(name)}; path=/; max-age=1800; samesite=lax`;
    } else {
      document.cookie = `${PREFERRED_NAME_COOKIE}=; path=/; max-age=0; samesite=lax`;
    }
  } catch {
    /* ignore */
  }
}

function RegistrerenAccountInner({
  initialPostDagstart,
}: {
  initialPostDagstart: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const signInMode = searchParams.get("signin") === "1";

  // Inloggen gebeurt alleen op /login (enige plek met magic link).
  useEffect(() => {
    if (signInMode) {
      router.replace(buildLoginHref(searchParams));
    }
  }, [signInMode, router, searchParams]);

  const presentation = useMemo(
    () => resolveRegistrerenPresentation(searchParams),
    [searchParams]
  );

  const [error, setError] = useState<string | null>(null);
  const [trialDays, setTrialDays] = useState(DEFAULT_STRIPE_TRIAL_DAYS);
  const [eventSignupFlow, setEventSignupFlow] = useState(presentation.isEventFlow);
  const [preferredName, setPreferredName] = useState("");
  // Server bepaalt de variant al uit de cookies (zie page.tsx), zodat SSR meteen
  // de juiste koptekst toont en er geen flits optreedt. Client verfijnt alleen.
  const [postDagstart, setPostDagstart] = useState(initialPostDagstart);

  // Anonieme gebruiker die net de eerste dagstart deed: toon de schone
  // "bewaar je dagstart"-variant zonder samenvatting of badge.
  useEffect(() => {
    try {
      const next =
        hasStructuroLocalModeCookieOnClient() && !hasSupabaseAuthHintOnClient();
      setPostDagstart((prev) => (prev === next ? prev : next));
    } catch {
      /* ignore */
    }
  }, []);

  // Naam die eventueel al in de anonieme dagstart-flow is opgeslagen, voorvullen.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("structuro_user_name");
      if (stored && stored.trim()) {
        const trimmed = stored.trim();
        setPreferredName(trimmed);
        writePreferredNameCookie(trimmed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    applySignupAttributionFromSearchParams(searchParams);
    const source = getStoredSignupSource();
    setTrialDays(resolveStripeTrialDaysForSignupSource(source));
    setEventSignupFlow(isEventSignupSource(source) || presentation.isEventFlow);
  }, [searchParams, presentation.isEventFlow]);

  useEffect(() => {
    if (!isRegistrationCheckoutEnabledClient()) {
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled || !user?.id) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("signup_source, subscription_status, subscription_current_period_end, created_at")
          .eq("id", user.id)
          .maybeSingle();

        window.location.replace(
          resolveClientPostSignupPath(
            profile
              ? {
                  email: user.email,
                  profileRowReadOk: true,
                  subscription_status: profile.subscription_status as string | null,
                  subscription_current_period_end:
                    profile.subscription_current_period_end as string | null,
                  created_at: profile.created_at as string | null,
                  signup_source: profile.signup_source as string | null,
                }
              : null,
            user.email,
            { clientSide: true }
          )
        );
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const { storyVisual, isAcquisitionCopy } = presentation;
  // Post-dagstart komt uit onboarding (story layer); altijd cream, niet work-blauw.
  const useStoryLayer = postDagstart || storyVisual;
  const visual = useStoryLayer ? "story" : "work";

  const headingKey = postDagstart
    ? "registrerenPage.dagstartSaveHeading"
    : isAcquisitionCopy
      ? "registrerenPage.accountHeadingAcquisition"
      : "registrerenPage.accountHeading";
  const subheadingKey = postDagstart
    ? "registrerenPage.dagstartSaveSubheading"
    : isAcquisitionCopy
      ? "registrerenPage.accountSubheadingAcquisition"
      : "registrerenPage.accountSubheading";

  const linkClass = useStoryLayer
    ? "font-semibold text-[var(--story-accent)] hover:text-[#234845]"
    : "font-semibold text-blue-600 hover:text-blue-800";

  const mutedTextClass = useStoryLayer
    ? "text-[var(--story-text-muted)]"
    : "text-slate-500";

  return (
    <RegistrerenShell error={error} visual={visual}>
      <div className="mx-auto w-full text-center">
        {postDagstart ? null : useStoryLayer ? (
          <p className="st-story-eyebrow mb-3 inline-flex items-center gap-2.5">
            <span className="st-story-eyebrow-pulse" aria-hidden />
            {t("registrerenPage.organicEyebrow")}
          </p>
        ) : (
          <p className="mb-3">
            <span className="inline-block rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">
              {t("registrerenPage.trialBadge", { days: String(trialDays) })}
            </span>
          </p>
        )}
        <h2
          className={`text-lg tracking-tight sm:text-xl ${useStoryLayer ? "st-story-serif font-semibold text-[var(--story-text)]" : "font-semibold text-slate-900"}`}
        >
          {t(headingKey)}
        </h2>
        <p
          className={`mt-2 text-sm leading-relaxed ${useStoryLayer ? "text-[var(--story-text-muted)]" : "text-slate-600"}`}
        >
          {t(subheadingKey)}
        </p>
      </div>

      <div className="mx-auto w-full">
        <AccountSignUpOptions
          visual={visual}
          showPasskey={false}
          nameValue={preferredName}
          hideNameField
          onSignUpStarted={() => {
            setError(null);
            trackAcquisitionSignupStarted({ pathname: "/registreren", searchParams });
          }}
          onError={(message) => setError(message)}
          onSessionReady={(path) => {
            window.location.assign(path);
          }}
        />
      </div>

      {!eventSignupFlow ? (
        <p className={`text-center text-sm ${mutedTextClass}`}>
          {t("registrerenPage.hasAccount")}{" "}
          <Link href={buildLoginHref(searchParams)} className={linkClass}>
            {t("registrerenPage.loginLink")}
          </Link>
        </p>
      ) : null}

      {process.env.NODE_ENV === "development" ? (
        <div className="mx-auto w-full pt-2 text-center">
          <button
            type="button"
            onClick={() => {
              if (process.env.NODE_ENV === "development") {
                document.cookie =
                  "structuro_dev_local_bypass=1; path=/; max-age=604800; samesite=lax";
              }
              window.location.assign("/");
            }}
            className={`text-xs font-medium underline underline-offset-2 ${mutedTextClass}`}
          >
            Doorgaan lokaal (alleen test)
          </button>
        </div>
      ) : null}
    </RegistrerenShell>
  );
}

export default function RegistrerenAccountClient({
  initialPostDagstart = false,
}: {
  initialPostDagstart?: boolean;
} = {}) {
  return (
    <Suspense
      fallback={
        <RegistrerenShell visual="story">
          <p className="text-center text-sm text-[var(--story-text-muted)]">…</p>
        </RegistrerenShell>
      }
    >
      <RegistrerenAccountInner initialPostDagstart={initialPostDagstart} />
    </Suspense>
  );
}
