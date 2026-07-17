"use client";

import { useState, Suspense, useEffect, useCallback, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams, useRouter } from 'next/navigation';
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
  markReturningUser,
  isReturningUser,
  setLastAuthMethod,
  getLastAuthMethod,
} from '@/lib/auth/returningUser';
import { claimAnonymousOnboardingForAccount } from '@/lib/auth/claimAnonymousOnboarding';
import type { OAuthProviderId } from '@/lib/auth/authProviders';
import { useClientMounted } from '@/hooks/useClientMounted';
import Link from 'next/link';
import { isRegistrationCheckoutEnabledClient } from '@/lib/stripe/registrationLaunch';
import {
  clearCheckoutReturn,
  readCheckoutReturn,
} from '@/lib/checkoutReturnStorage';
import { resolvePostLoginPathFromProfile } from '@/lib/postAuthRouting';
import { markPasswordSetupCompletedReliably } from '@/lib/auth/passwordSetupProfile';
import {
  persistSignupAttributionToProfile,
  persistSignupSourceFromUrl,
  queueSignupCompletedForAnalytics,
  resolveRegistrerenPresentation,
} from '@/lib/posthog/signupAttribution';
import { PasskeySignInButton } from '@/components/auth/PasskeySignInButton';
import { OAuthSignInButtons } from '@/components/auth/OAuthSignInButtons';
import { AuthCaptcha } from '@/components/auth/AuthCaptcha';
import { sendLoginMagicLink } from '@/lib/auth/socialSignIn';
import { mapAuthCaptchaError } from '@/lib/auth/captcha';
import { useAuthCaptcha } from '@/hooks/useAuthCaptcha';
import { isSignupEmailFormatValid, normalizeSignupEmail } from '@/lib/auth/signupEmail';
import { buildRegistrerenHref } from '@/lib/auth/authPagePaths';
import { RegistrerenShell } from '@/components/registreren/RegistrerenShell';

/**
 * Productie (Vercel build): geen open registratie, alleen inloggen + wachtwoord vergeten.
 * Tijdelijk weer aanzetten: NEXT_PUBLIC_ALLOW_SIGNUP=true in Vercel.
 */
const SIGNUP_ALLOWED =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_ALLOW_SIGNUP === "true";

const SHOW_LOCAL_DEV_TEST = process.env.NODE_ENV === "development";

function safeAppPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  return trimmed;
}

async function resolvePostLoginPath(
  userId: string,
  email: string | null | undefined,
  next: string | null,
  afterCheckoutLogin: boolean
): Promise<string> {
  try {
    const supabase = createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "onboarding_completed, onboarding_version, subscription_status, subscription_current_period_end, created_at, signup_source"
      )
      .eq("id", userId)
      .maybeSingle();

    return resolvePostLoginPathFromProfile(profile, {
      email,
      next,
      afterCheckoutLogin,
    });
  } catch {
    const safeNext = safeAppPath(next);
    if (safeNext === "/onboarding") return "/onboarding";
    return safeNext ?? (afterCheckoutLogin ? "/onboarding" : "/");
  }
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
  "w-full rounded-xl border border-[var(--story-border)] bg-white px-4 py-3 text-base text-[var(--story-text)] transition-colors placeholder:text-[var(--story-text-muted)] focus:border-[var(--story-accent)] focus:outline-none focus:ring-2 focus:ring-[rgba(45,90,86,0.18)]";

const loginPrimaryBtnClass =
  "flex w-full items-center justify-center rounded-xl border-none bg-[var(--story-cta)] px-6 py-[15px] text-base font-semibold text-white shadow-[0_8px_20px_rgba(26,26,27,0.22)] transition-all duration-200 hover:bg-[var(--story-cta-hover)] disabled:cursor-not-allowed disabled:opacity-60";

const loginSecondaryBtnClass =
  "flex w-full items-center justify-center rounded-xl border border-[var(--story-border)] bg-white px-6 py-[15px] text-base font-semibold text-[var(--story-text)] transition-colors hover:border-[var(--story-accent)] disabled:cursor-not-allowed disabled:opacity-60";

const loginLabelClass = "block text-sm text-[var(--story-text-muted)]";

const loginPasswordInputClass =
  "w-full rounded-xl border border-[var(--story-border)] bg-white px-4 py-3 pr-12 text-base text-[var(--story-text)] transition-colors placeholder:text-[var(--story-text-muted)] focus:border-[var(--story-accent)] focus:outline-none focus:ring-2 focus:ring-[rgba(45,90,86,0.18)]";

const loginLinkClass =
  "font-semibold text-[var(--story-accent)] transition-colors hover:text-[#234845]";

const loginMutedLinkClass =
  "text-sm text-[var(--story-text-muted)] transition-colors hover:text-[var(--story-text)]";

function PasswordVisibilityToggle({
  shown,
  onToggle,
  showLabel,
  hideLabel,
}: {
  shown: boolean;
  onToggle: () => void;
  showLabel: string;
  hideLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? hideLabel : showLabel}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--story-text-muted)] transition-colors hover:text-[var(--story-text)]"
    >
      {shown ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
          <line x1="2" y1="2" x2="22" y2="22" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}

function LoginOrDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3" aria-hidden={false}>
      <div className="h-px flex-1 bg-[var(--story-border)]" aria-hidden />
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--story-text-muted)]">
        {label}
      </span>
      <div className="h-px flex-1 bg-[var(--story-border)]" aria-hidden />
    </div>
  );
}

function LoginPageInner() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mounted = useClientMounted();
  const registrationEnabled = isRegistrationCheckoutEnabledClient();
  const [isSignUp, setIsSignUp] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(false);
  const [signupRedirecting, setSignupRedirecting] = useState(false);
  const [passwordMode, setPasswordMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [magicSentEmail, setMagicSentEmail] = useState<string | null>(null);
  const [showMoreMethods, setShowMoreMethods] = useState(false);
  const [lastMethod, setLastMethod] = useState<
    "google" | "azure" | "apple" | "magic" | "password" | "passkey" | null
  >(null);
  const splashTargetRef = useRef<string | null>(null);
  const returning = mounted && isReturningUser();
  const showPasskey = mounted && isReturningUser();
  const primaryOAuthProvider: OAuthProviderId | undefined =
    lastMethod === "google" || lastMethod === "azure" || lastMethod === "apple"
      ? lastMethod
      : undefined;
  const presentation = useMemo(
    () => resolveRegistrerenPresentation(searchParams),
    [searchParams]
  );
  const { storyVisual, isAcquisitionCopy } = presentation;
  const {
    enabled: captchaEnabled,
    captchaRef,
    setCaptchaToken,
    resetCaptcha,
    resolveCaptchaToken,
    captchaReady,
  } = useAuthCaptcha();

  useEffect(() => {
    resetCaptcha();
  }, [forgotPassword, passwordMode, showMoreMethods, isSignUp, resetCaptcha]);

  const handleSplashDone = useCallback(() => {
    const target = splashTargetRef.current ?? '/';
    splashTargetRef.current = null;
    // Volledige navigatie zodat middleware de auth-cookies direct ziet (router.push alleen is onbetrouwbaar).
    window.location.assign(target);
  }, []);

  useEffect(() => {
    if (!SIGNUP_ALLOWED) {
      setIsSignUp(false);
    }
  }, []);

  useEffect(() => {
    const method = getLastAuthMethod();
    setLastMethod(method);
    if (method === "password") {
      setPasswordMode(true);
      setShowMoreMethods(true);
    } else if (method === "magic" || method === "passkey") {
      setShowMoreMethods(true);
    }
  }, []);

  useEffect(() => {
    persistSignupSourceFromUrl(searchParams?.get("source") ?? undefined);
    if (searchParams?.get("signup") !== "1") return;

    setSignupRedirecting(true);
    router.replace(buildRegistrerenHref(searchParams));
  }, [searchParams, router]);

  useEffect(() => {
    if (searchParams?.get('herstel') === '1') {
      setForgotPassword(true);
      setIsSignUp(false);
    }
    if (searchParams?.get('wachtwoord') === 'bijgewerkt') {
      setMessage(t('login.passwordUpdated'));
    }
    if (searchParams?.get('checkout') === '1') {
      const stored = readCheckoutReturn();
      if (stored?.email && !email.trim()) {
        setEmail(stored.email);
      }
    }
  }, [searchParams, t, email]);

  const afterCheckoutLogin = searchParams?.get('checkout') === '1';
  const showSignInExtras = !isSignUp && !forgotPassword;

  const finishLogin = async (userId: string, userEmail: string | null | undefined) => {
    markReturningUser();
    await claimAnonymousOnboardingForAccount(userId);
    clearStructuroLocalModeCookie();
    clearCheckoutReturn();
    const next = searchParams?.get("next") ?? null;
    splashTargetRef.current = await resolvePostLoginPath(
      userId,
      userEmail,
      next,
      afterCheckoutLogin
    );
    setShowSplash(true);
  };

  const handleSendMagicLink = async () => {
    const normalized = normalizeSignupEmail(email);
    if (!normalized || !isSignupEmailFormatValid(email)) {
      setError(t("login.emailRequired"));
      return;
    }
    const captchaToken = resolveCaptchaToken();
    if (captchaEnabled && !captchaToken) {
      setError(t("login.errCaptcha"));
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const supabase = getSupabase();
      if (!supabase) {
        setError(t("login.noServer"));
        return;
      }
      const nextPath = safeAppPath(searchParams?.get("next") ?? null) ?? undefined;
      await sendLoginMagicLink(supabase, normalized, nextPath, captchaToken);
      setLastAuthMethod("magic");
      setMagicSentEmail(normalized);
      resetCaptcha();
    } catch (err) {
      const raw = err instanceof Error ? err.message : t("login.sendFailed");
      const lower = raw.toLowerCase();
      if (lower.includes("signups not allowed") || lower.includes("user not found")) {
        setError(t("login.magicLinkNoAccount"));
      } else if (lower.includes("rate limit")) {
        setError(t("login.errRateLimitEmail"));
      } else {
        setError(mapAuthCaptchaError(raw, t));
      }
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

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
    const trimmed = email.trim();
    if (!trimmed) {
      setError(t('login.emailRequired'));
      return;
    }
    const captchaToken = resolveCaptchaToken();
    if (captchaEnabled && !captchaToken) {
      setError(t("login.errCaptcha"));
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          ...(captchaToken ? { captchaToken } : {}),
        }),
      });
      const payload = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;

      if (!res.ok || !payload?.ok) {
        const code = payload?.error ?? "send_failed";
        if (code === "rate_limit_email") {
          setError(t("login.errRateLimitEmail"));
        } else if (code === "rate_limit" || code === "rate_limited") {
          setError(t("login.errRateLimit"));
        } else if (code === "invalid_email") {
          setError(t("login.emailRequired"));
        } else {
          setError(t("login.sendFailed"));
        }
        resetCaptcha();
        return;
      }

      setMessage(t("login.resetSent"));
      setForgotPassword(false);
      resetCaptcha();
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : t("login.sendFailed");
      setError(mapPasswordResetError(mapAuthCaptchaError(raw, t), t));
      resetCaptcha();
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

    const captchaToken = resolveCaptchaToken();
    if (captchaEnabled && !captchaToken) {
      setError(t("login.errCaptcha"));
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
            ...(captchaToken ? { captchaToken } : {}),
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) throw error;

        if (data.user) {
          await persistSignupAttributionToProfile(data.user.id);
          await markPasswordSetupCompletedReliably(supabase, data.user.id);
          queueSignupCompletedForAnalytics();
          setLastAuthMethod("password");
          markReturningUser();
          clearStructuroLocalModeCookie();
          clearCheckoutReturn();
          await supabase.auth.getSession();
          splashTargetRef.current = '/';
          setShowSplash(true);
          resetCaptcha();
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
          options: captchaToken ? { captchaToken } : undefined,
        });

        if (error) throw error;

        if (data.user) {
          await supabase.auth.getSession();
          setLastAuthMethod("password");
          await finishLogin(data.user.id, data.user.email);
          resetCaptcha();
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
      } else {
        errorMessage = mapAuthCaptchaError(errorMessage, t);
      }
      setError(errorMessage);
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const headingKey = forgotPassword
    ? "login.forgotStoryHeading"
    : isSignUp
      ? "login.signUp"
      : returning
        ? "login.storyHeading"
        : "login.storyHeadingNeutral";
  const subheadingKey = forgotPassword
    ? null
    : isSignUp
      ? "registrerenPage.accountSubheadingAcquisition"
      : isAcquisitionCopy
        ? null
        : returning
          ? "login.storySubheading"
          : "login.storySubheadingNeutral";

  if (signupRedirecting) {
    return (
      <RegistrerenShell visual="story">
        <p className="text-center text-sm text-[var(--story-text-muted)]">{t("login.loading")}</p>
      </RegistrerenShell>
    );
  }

  const headingClass = storyVisual
    ? "st-story-serif text-lg font-semibold tracking-tight text-[var(--story-text)] sm:text-xl"
    : "text-lg font-semibold tracking-tight text-slate-900 sm:text-xl";
  const subheadingClass = storyVisual
    ? "mt-2 text-sm leading-relaxed text-[var(--story-text-muted)]"
    : "mt-2 text-sm leading-relaxed text-slate-600";

  return (
    <>
      {showSplash ? <LoginSuccessSplash onDone={handleSplashDone} /> : null}
      <RegistrerenShell error={error} visual={storyVisual ? "story" : "work"}>
        <div className="mx-auto w-full text-center">
          {storyVisual && !forgotPassword ? (
            <p className="st-story-eyebrow mb-3 inline-flex items-center gap-2.5">
              <span className="st-story-eyebrow-pulse" aria-hidden />
              {t("login.storyEyebrow")}
            </p>
          ) : null}
          <h2 className={headingClass}>{t(headingKey)}</h2>
          {subheadingKey ? <p className={subheadingClass}>{t(subheadingKey)}</p> : null}
        </div>

        {afterCheckoutLogin ? (
          <p className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm leading-relaxed text-amber-950">
            {t("login.checkoutReturnHint")}
          </p>
        ) : null}

        {forgotPassword && !isSignUp ? (
        <form onSubmit={handleAuth} className="w-full space-y-5 text-left">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className={loginLabelClass}>
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
            <p className="text-sm leading-relaxed text-[var(--story-text-muted)]">
              {t("login.forgotHelp")}
            </p>
          </div>

          {message ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
              {message}
            </div>
          ) : null}

          <AuthCaptcha
            ref={captchaRef}
            onVerify={setCaptchaToken}
            onExpire={() => setCaptchaToken(null)}
            onError={() => setCaptchaToken(null)}
            className="flex justify-center"
          />

          <button
            type="submit"
            disabled={loading || showSplash || !captchaReady}
            className={loginPrimaryBtnClass}
          >
            {loading ? t("login.busy") : t("login.sendReset")}
          </button>
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setForgotPassword(false);
                setError(null);
              }}
              className={loginLinkClass}
            >
              {t("login.backSignIn")}
            </button>
          </div>
        </form>
        ) : isSignUp && !registrationEnabled ? (
        <form onSubmit={handleAuth} className="w-full space-y-5 text-left">
          <div className="space-y-4">
            {isSignUp ? (
              <div className="space-y-1.5">
                <label htmlFor="fullName" className={loginLabelClass}>
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
              <label htmlFor="email" className={loginLabelClass}>
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
                <label htmlFor="password" className={loginLabelClass}>
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
              <p className="text-sm leading-relaxed text-[var(--story-text-muted)]">
                {t("login.forgotHelp")}
              </p>
            )}
          </div>

          {message ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
              {message}
            </div>
          ) : null}

          <AuthCaptcha
            ref={captchaRef}
            onVerify={setCaptchaToken}
            onExpire={() => setCaptchaToken(null)}
            onError={() => setCaptchaToken(null)}
            className="flex justify-center"
          />

          <button
            type="submit"
            disabled={loading || showSplash || !captchaReady}
            className={loginPrimaryBtnClass}
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
        ) : !isSignUp && magicSentEmail ? (
          <div className="w-full space-y-4 text-center">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-relaxed text-emerald-950">
              <p className="font-semibold">{t("login.magicLinkSentTitle")}</p>
              <p className="mt-1">
                {t("login.magicLinkSentBody", { email: magicSentEmail })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setMagicSentEmail(null);
                setError(null);
              }}
              className={loginMutedLinkClass}
            >
              {t("login.backSignIn")}
            </button>
          </div>
        ) : !isSignUp ? (
        <>
        <OAuthSignInButtons
          visual={storyVisual ? "story" : "work"}
          disabled={loading || showSplash}
          nextPath={safeAppPath(searchParams?.get("next") ?? null) ?? "/"}
          primaryProvider={primaryOAuthProvider}
          onError={(message) => setError(message)}
        />

        {message ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
            {message}
          </div>
        ) : null}

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setShowMoreMethods((v) => !v);
              setError(null);
            }}
            className={loginMutedLinkClass}
            aria-expanded={showMoreMethods}
          >
            {showMoreMethods ? t("login.moreMethodsHide") : t("login.moreMethods")}
          </button>
        </div>

        {showMoreMethods ? (
          <div className="w-full space-y-4">
            <LoginOrDivider label={t("login.orDivider")} />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (passwordMode) {
                  void handleAuth(e);
                } else {
                  void handleSendMagicLink();
                }
              }}
              className="w-full space-y-4 text-left"
            >
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="email" className={loginLabelClass}>
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

                {passwordMode ? (
                  <div className="space-y-1.5">
                    <label htmlFor="password" className={loginLabelClass}>
                      {t("login.password")}
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={loginPasswordInputClass}
                        placeholder="••••••••"
                        required
                        minLength={6}
                        autoComplete="current-password"
                      />
                      <PasswordVisibilityToggle
                        shown={showPassword}
                        onToggle={() => setShowPassword((v) => !v)}
                        showLabel={t("login.showPassword")}
                        hideLabel={t("login.hidePassword")}
                      />
                    </div>
                  </div>
                ) : null}
              </div>

              <AuthCaptcha
                ref={captchaRef}
                onVerify={setCaptchaToken}
                onExpire={() => setCaptchaToken(null)}
                onError={() => setCaptchaToken(null)}
                className="flex justify-center"
              />

              <button
                type="submit"
                disabled={loading || showSplash || !captchaReady}
                className={loginSecondaryBtnClass}
              >
                {loading
                  ? t("login.busy")
                  : passwordMode
                    ? t("login.signIn")
                    : isAcquisitionCopy
                      ? t("registrerenPage.continueBtnMagicLink")
                      : t("login.magicLinkPrimaryCta")}
              </button>

              {!passwordMode ? (
                <p className="text-center text-xs leading-relaxed text-[var(--story-text-muted)]">
                  {t("login.magicLinkPrimaryHint")}
                </p>
              ) : (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotPassword(true);
                      setError(null);
                      setMessage(null);
                    }}
                    className={loginMutedLinkClass}
                  >
                    {t("login.forgot")}
                  </button>
                </div>
              )}
            </form>

            <button
              type="button"
              onClick={() => {
                setPasswordMode((v) => !v);
                setError(null);
                setMessage(null);
              }}
              className={loginMutedLinkClass + " block w-full text-center"}
            >
              {passwordMode ? t("login.magicLinkToggle") : t("login.passwordToggle")}
            </button>

            {showPasskey ? (
              <>
                <LoginOrDivider label={t("login.orDivider")} />
                <PasskeySignInButton
                  visual={storyVisual ? "story" : "work"}
                  disabled={loading || showSplash}
                  onError={(message) => setError(message)}
                  onSuccess={async (userId, userEmail) => {
                    setLastAuthMethod("passkey");
                    await finishLogin(userId, userEmail);
                  }}
                />
              </>
            ) : null}
          </div>
        ) : null}
        </>
        ) : null}

        {registrationEnabled && showSignInExtras ? (
          <p className="text-center text-sm text-[var(--story-text-muted)]">
            {t("login.noAccount")}{" "}
            <Link href={buildRegistrerenHref(searchParams)} className={loginLinkClass}>
              {t("login.createAccount")}
            </Link>
          </p>
        ) : SIGNUP_ALLOWED && showSignInExtras ? (
          <p className="text-center text-sm text-[var(--story-text-muted)]">
            {t("login.noAccount")}{" "}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setForgotPassword(false);
                setError(null);
                setMessage(null);
              }}
              className={loginLinkClass}
            >
              {t("login.createAccount")}
            </button>
          </p>
        ) : null}

        {SIGNUP_ALLOWED && isSignUp && !registrationEnabled ? (
          <div className="w-full text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setForgotPassword(false);
                setError(null);
                setMessage(null);
              }}
              className={loginMutedLinkClass}
            >
              {t("login.toggleSignIn")}
            </button>
          </div>
        ) : null}

        {SHOW_LOCAL_DEV_TEST ? (
          <div className="w-full space-y-3 border-t border-[var(--story-border)] pt-5">
            <p className="text-center text-xs text-[var(--story-text-muted)]">
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
              className="w-full rounded-xl border border-dashed border-[var(--story-border)] py-3 text-sm font-medium text-[var(--story-text-muted)] transition-colors hover:border-[var(--story-accent)] hover:text-[var(--story-text)]"
            >
              {t("login.localTestCta")}
            </button>
          </div>
        ) : null}

        <p className="text-center text-xs leading-relaxed text-[var(--story-text-muted)]">
          {t("login.privacyFooter")}
        </p>
      </RegistrerenShell>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <RegistrerenShell visual="story">
          <p className="text-center text-sm text-[var(--story-text-muted)]">Laden…</p>
        </RegistrerenShell>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}

