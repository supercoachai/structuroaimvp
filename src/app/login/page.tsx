"use client";

import { useState, useLayoutEffect, Suspense, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { isProtectedTestAccount } from '@/lib/protectedTestAccount';
import LoginSuccessSplash from '@/components/LoginSuccessSplash';
import {
  clearStructuroLocalModeCookie,
  markLocalSessionFresh,
} from '@/lib/localModeSession';
import {
  LOCAL_ONBOARDING_COMPLETED_KEY,
  LOCAL_ONBOARDING_VERSION_KEY,
} from '@/lib/onboardingProfile';
import {
  clearLocalOnboardingDoneCookieOnClient,
  markEnteringLocalOnboardingSession,
} from '@/lib/localOnboardingCookie';
import { useI18n } from '@/lib/i18n';
import {
  persistSignupSourceFromUrl,
  persistSignupAttributionToProfile,
  queueSignupCompletedForAnalytics,
} from '@/lib/posthog/signupAttribution';
import Link from 'next/link';
import { isRegistrationCheckoutEnabledClient } from '@/lib/stripe/registrationLaunch';

/** Zichtbaar in `next dev`, of als NEXT_PUBLIC_ALLOW_LOCAL_TEST_LOGIN=true (bijv. na `next start` lokaal). */
const SHOW_LOCAL_TEST_LOGIN =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_ALLOW_LOCAL_TEST_LOGIN === "true";

/**
 * Productie (Vercel build): geen open registratie, alleen inloggen + wachtwoord vergeten.
 * Tijdelijk weer aanzetten: NEXT_PUBLIC_ALLOW_SIGNUP=true in Vercel.
 */
const SIGNUP_ALLOWED =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_ALLOW_SIGNUP === "true";

function isLikelyLocalDevHost(hostname: string): boolean {
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  // RFC1918 — typisch next dev op LAN (telefoon / ander device)
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  return false;
}

function emailAllowsLocalTestLogin(emailValue: string): boolean {
  if (isProtectedTestAccount(emailValue)) return true;
  const owner = process.env.NEXT_PUBLIC_LOCAL_TEST_OWNER_EMAIL?.trim().toLowerCase();
  if (!owner) return false;
  return emailValue.trim().toLowerCase() === owner;
}

function mapPasswordResetError(message: string, t: (k: string) => string): string {
  const m = message.toLowerCase();
  if (m.includes('rate limit') && m.includes('email')) {
    return t('login.errRateLimitEmail');
  }
  if (m.includes('rate limit')) {
    return t('login.errRateLimit');
  }
  return message;
}

const loginInputClass =
  "w-full rounded-[var(--st-r-md)] border border-[var(--st-line)] bg-[var(--st-surface-2)] px-4 py-3 text-base text-[var(--st-ink)] transition-colors placeholder:text-[var(--st-muted-2)] focus:border-[var(--st-blue-soft)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--st-blue)]/20";

function LoginOrDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3" aria-hidden={false}>
      <div className="h-px flex-1 bg-[var(--st-line)]" aria-hidden />
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--st-muted-2)]">
        {label}
      </span>
      <div className="h-px flex-1 bg-[var(--st-line)]" aria-hidden />
    </div>
  );
}

function LoginLanguageToggle({
  locale,
  setLocale,
  label,
}: {
  locale: string;
  setLocale: (l: "nl" | "en") => void;
  label: string;
}) {
  return (
    <div
      className="flex gap-1 rounded-[10px] border border-[var(--st-line)] bg-[var(--st-surface)] p-0.5 text-xs font-semibold shadow-sm"
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        onClick={() => setLocale("nl")}
        className={`rounded-[8px] px-2.5 py-1 transition-colors ${
          locale === "nl"
            ? "bg-[var(--st-blue)] text-white"
            : "text-[var(--st-muted)] hover:bg-[var(--st-surface-2)]"
        }`}
      >
        NL
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`rounded-[8px] px-2.5 py-1 transition-colors ${
          locale === "en"
            ? "bg-[var(--st-blue)] text-white"
            : "text-[var(--st-muted)] hover:bg-[var(--st-surface-2)]"
        }`}
      >
        EN
      </button>
    </div>
  );
}

function LoginPageInner() {
  const { t, locale, setLocale } = useI18n();
  const [isSignUp, setIsSignUp] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const splashTargetRef = useRef<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [localDevHost, setLocalDevHost] = useState(false);

  const handleSplashDone = useCallback(() => {
    const target = splashTargetRef.current ?? '/';
    splashTargetRef.current = null;
    router.push(target);
    router.refresh();
  }, [router]);

  useLayoutEffect(() => {
    try {
      setLocalDevHost(isLikelyLocalDevHost(window.location.hostname));
    } catch {
      setLocalDevHost(false);
    }
  }, []);

  useEffect(() => {
    if (!SIGNUP_ALLOWED) {
      setIsSignUp(false);
    }
  }, []);

  useEffect(() => {
    persistSignupSourceFromUrl(searchParams?.get("source") ?? undefined);
    if (SIGNUP_ALLOWED && searchParams?.get("signup") === "1") {
      setIsSignUp(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (searchParams?.get('herstel') === '1') {
      setForgotPassword(true);
      setIsSignUp(false);
    }
    if (searchParams?.get('wachtwoord') === 'bijgewerkt') {
      setMessage(t('login.passwordUpdated'));
    }
  }, [searchParams, t]);

  /** Productie: alleen zichtbaar na intypen van allowlisted email (protected testaccount of NEXT_PUBLIC_LOCAL_TEST_OWNER_EMAIL). */
  const showLocalTest =
    SHOW_LOCAL_TEST_LOGIN ||
    localDevHost ||
    emailAllowsLocalTestLogin(email);

  // Initialize Supabase client only when needed
  const getSupabase = () => {
    try {
      if (typeof window === 'undefined') {
        return null;
      }
      return createClient();
    } catch (error) {
      console.error('Error creating Supabase client:', error);
      return null;
    }
  };

  const handleResetEmail = async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setError(t('login.noServer'));
      return;
    }
    const trimmed = email.trim();
    if (!trimmed) {
      setError(t('login.emailRequired'));
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const nextPath = '/auth/wachtwoord-instellen';
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
        trimmed,
        { redirectTo }
      );
      if (resetErr) throw resetErr;
      setMessage(t('login.resetSent'));
      setForgotPassword(false);
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : t('login.sendFailed');
      setError(mapPasswordResetError(raw, t));
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (forgotPassword && !isSignUp) {
      await handleResetEmail();
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabase();
      if (!supabase) {
        setError(t('login.noServer'));
        setLoading(false);
        return;
      }

      if (isSignUp && !SIGNUP_ALLOWED) {
        setError(t('login.signupDisabled'));
        setLoading(false);
        return;
      }
      
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) throw error;

        if (data.user) {
          await persistSignupAttributionToProfile(data.user.id);
          queueSignupCompletedForAnalytics();
          setMessage(t('login.signupDone'));
          clearStructuroLocalModeCookie();
          splashTargetRef.current = '/';
          setShowSplash(true);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          clearStructuroLocalModeCookie();
          splashTargetRef.current = '/';
          setShowSplash(true);
        }
      }
    } catch (err: any) {
      let errorMessage = err.message || t('login.errGeneric');
      if (errorMessage.includes('Invalid login credentials') || errorMessage.includes('Invalid credentials')) {
        errorMessage = t('login.errInvalidCreds');
      } else if (errorMessage.includes('Email not confirmed')) {
        errorMessage = t('login.errEmailConfirm');
      } else if (errorMessage.includes('User already registered')) {
        errorMessage = t('login.errAlreadyRegistered');
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const showSignInExtras = !isSignUp && !forgotPassword;
  /** Launch: registratie via de geprijsde /registreren-flow i.p.v. inline signup. */
  const registrationEnabled = isRegistrationCheckoutEnabledClient();

  return (
    <>
      {showSplash ? <LoginSuccessSplash onDone={handleSplashDone} /> : null}
    <div className="st-art relative flex min-h-[100dvh] w-full max-w-[100vw] items-center justify-center overflow-x-hidden overflow-y-auto scroll-pb-[var(--keyboard-inset-bottom)] px-4 py-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,calc(env(safe-area-inset-bottom)+var(--keyboard-inset-bottom,0px)))]">
      <div className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 sm:right-6">
        <LoginLanguageToggle
          locale={locale}
          setLocale={setLocale}
          label={t("settings.languageTitle")}
        />
      </div>

      <div className="st-card w-full min-w-0 max-w-[440px] px-8 py-9 sm:px-9">
        <div className="flex flex-col items-center text-center">
          {logoError ? (
            <div className="flex h-[4.55rem] w-[4.55rem] items-center justify-center rounded-[var(--st-r-lg)] bg-[var(--st-blue)] shadow-md">
              <span className="text-2xl font-bold text-white">S</span>
            </div>
          ) : (
            <img
              src="/logo-structuro.png"
              alt=""
              width={73}
              height={73}
              className="h-[4.55rem] w-[4.55rem] object-contain"
              onError={() => setLogoError(true)}
            />
          )}
          <p className="mt-4 text-sm font-semibold tracking-tight text-[var(--st-ink)]">
            {t("login.taglineBrand")}
          </p>
          <p className="mt-1 text-[13px] leading-snug text-[var(--st-muted)]">
            {t("brand.tagline")}
          </p>
        </div>

        <form onSubmit={handleAuth} className="mt-8 space-y-5">
          <div className="space-y-4">
            {isSignUp ? (
              <div className="space-y-1.5">
                <label htmlFor="fullName" className="block text-sm text-[var(--st-muted)]">
                  {t("login.fullName")}
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={loginInputClass}
                  placeholder={t("login.fullNamePh")}
                  required={isSignUp}
                />
              </div>
            ) : null}

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm text-[var(--st-muted)]">
                {t("login.email")}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={loginInputClass}
                placeholder={t("login.emailPh")}
                required
                autoComplete="email"
              />
            </div>

            {!forgotPassword || isSignUp ? (
              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-sm text-[var(--st-muted)]">
                  {t("login.password")}
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={loginInputClass}
                  placeholder="••••••••"
                  required={!forgotPassword || isSignUp}
                  minLength={6}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                />
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-[var(--st-muted)]">
                {t("login.forgotHelp")}
              </p>
            )}
          </div>

          {error ? (
            <div className="rounded-xl border border-[var(--st-red-haze)] bg-[var(--st-red-haze)] px-4 py-3 text-sm text-[var(--st-red-deep)]">
              {error}
            </div>
          ) : null}

          {message ? (
            <div className="rounded-xl border border-[var(--st-green-haze)] bg-[var(--st-green-haze)] px-4 py-3 text-sm text-[var(--st-green-deep)]">
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading || showSplash}
            className="st-btn-primary h-12 w-full text-base disabled:cursor-not-allowed"
          >
            {loading
              ? t("login.busy")
              : forgotPassword && !isSignUp
                ? t("login.sendReset")
                : isSignUp
                  ? t("login.signUp")
                  : t("login.signIn")}
          </button>
        </form>

        {!isSignUp ? (
          <div className="mt-4 text-center">
            {forgotPassword ? (
              <button
                type="button"
                onClick={() => {
                  setForgotPassword(false);
                  setError(null);
                }}
                className="text-sm text-[var(--st-blue)] transition-colors hover:text-[var(--st-blue-deep)]"
              >
                {t("login.backSignIn")}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setForgotPassword(true);
                  setError(null);
                  setMessage(null);
                }}
                className="text-sm text-[var(--st-muted)] transition-colors hover:text-[var(--st-ink-soft)]"
              >
                {t("login.forgot")}
              </button>
            )}
          </div>
        ) : null}

        {registrationEnabled && showSignInExtras ? (
          <div className="mt-6 space-y-4">
            <LoginOrDivider label={t("login.orDivider")} />
            <p className="text-center text-sm text-[var(--st-muted)]">
              {t("login.noAccount")}{" "}
              <Link
                href="/registreren"
                className="font-semibold text-[var(--st-blue)] transition-colors hover:text-[var(--st-blue-deep)]"
              >
                {t("login.createAccount")}
              </Link>
            </p>
          </div>
        ) : SIGNUP_ALLOWED && showSignInExtras ? (
          <div className="mt-6 space-y-4">
            <LoginOrDivider label={t("login.orDivider")} />
            <p className="text-center text-sm text-[var(--st-muted)]">
              {t("login.noAccount")}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setForgotPassword(false);
                  setError(null);
                  setMessage(null);
                }}
                className="font-semibold text-[var(--st-blue)] transition-colors hover:text-[var(--st-blue-deep)]"
              >
                {t("login.createAccount")}
              </button>
            </p>
          </div>
        ) : null}

        {SIGNUP_ALLOWED && isSignUp ? (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setForgotPassword(false);
                setError(null);
                setMessage(null);
              }}
              className="text-sm text-[var(--st-muted)] transition-colors hover:text-[var(--st-ink-soft)]"
            >
              {t("login.toggleSignIn")}
            </button>
          </div>
        ) : null}

        {showLocalTest ? (
          <div className="mt-6 space-y-3 border-t border-[var(--st-line)] pt-5">
            <p className="text-center text-xs text-[var(--st-muted-2)]">
              {t("login.localTestHint")}
            </p>
            <button
              type="button"
              onClick={() => {
                document.cookie =
                  "structuro_local_mode=1; path=/; max-age=604800; SameSite=Lax";
                markLocalSessionFresh();
                markEnteringLocalOnboardingSession();
                try {
                  window.localStorage.removeItem(LOCAL_ONBOARDING_COMPLETED_KEY);
                  window.localStorage.removeItem(LOCAL_ONBOARDING_VERSION_KEY);
                } catch {
                  /* ignore */
                }
                clearLocalOnboardingDoneCookieOnClient();
                window.location.assign("/onboarding");
              }}
              className="w-full rounded-[var(--st-r-md)] border border-dashed border-[var(--st-line-strong)] py-3 text-sm font-medium text-[var(--st-ink-soft)] transition-colors hover:bg-[var(--st-surface-2)]"
            >
              {t("login.localTestCta")}
            </button>
          </div>
        ) : null}

        <p className="mt-8 text-center text-xs leading-relaxed text-[var(--st-muted-2)]">
          {t("login.privacyFooter")}
        </p>
      </div>
    </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="st-art flex min-h-[100dvh] items-center justify-center px-4 py-8 text-[var(--st-muted)]">
          Laden…
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}

