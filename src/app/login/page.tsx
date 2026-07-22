"use client";

import { useState, Suspense, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams, useRouter } from "next/navigation";
import LoginSuccessSplash from "@/components/LoginSuccessSplash";
import {
  clearStructuroLocalModeCookie,
  markLocalSessionFresh,
} from "@/lib/localModeSession";
import {
  LOCAL_ONBOARDING_COMPLETED_KEY,
  LOCAL_ONBOARDING_VERSION_KEY,
} from "@/lib/onboardingProfile";
import {
  clearLocalOnboardingDoneCookieOnClient,
  markEnteringLocalOnboardingSession,
} from "@/lib/localOnboardingCookie";
import { useI18n } from "@/lib/i18n";
import {
  markReturningUser,
  setLastAuthMethod,
  getLastAuthMethod,
} from "@/lib/auth/returningUser";
import { claimAnonymousOnboardingForAccount } from "@/lib/auth/claimAnonymousOnboarding";
import { migrateV2LocalDataToSupabase } from "@/lib/migrateV2LocalDataToSupabase";
import Link from "next/link";
import { isRegistrationCheckoutEnabledClient } from "@/lib/stripe/registrationLaunch";
import {
  clearCheckoutReturn,
  readCheckoutReturn,
} from "@/lib/checkoutReturnStorage";
import { resolvePostLoginPathFromProfile } from "@/lib/postAuthRouting";
import { markPasswordSetupCompletedReliably } from "@/lib/auth/passwordSetupProfile";
import {
  persistSignupAttributionToProfile,
  persistSignupSourceFromUrl,
  queueSignupCompletedForAnalytics,
} from "@/lib/posthog/signupAttribution";
import { OAuthSignInButtons } from "@/components/auth/OAuthSignInButtons";
import { MagicLinkSignInForm } from "@/components/auth/MagicLinkSignInForm";
import { AuthCaptcha } from "@/components/auth/AuthCaptcha";
import { mapAuthCaptchaError } from "@/lib/auth/captcha";
import { useAuthCaptcha } from "@/hooks/useAuthCaptcha";
import { buildRegistrerenHref } from "@/lib/auth/authPagePaths";
import { RegistrerenShell } from "@/components/registreren/RegistrerenShell";

/**
 * Productie (Vercel build): geen open registratie, alleen inloggen + wachtwoord vergeten.
 * Tijdelijk weer aanzetten: NEXT_PUBLIC_ALLOW_SIGNUP=true in Vercel.
 */
const SIGNUP_ALLOWED =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_ALLOW_SIGNUP === "true";

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
  if (m.includes("rate limit") && m.includes("email")) {
    return t("login.errRateLimitEmail");
  }
  if (m.includes("rate limit")) {
    return t("login.errRateLimit");
  }
  return message;
}

const loginInputClass =
  "w-full rounded-xl border border-[var(--story-border)] bg-white px-4 py-3 text-base text-[var(--story-text)] transition-colors placeholder:text-[var(--story-text-muted)] focus:border-[var(--story-accent)] focus:outline-none focus:ring-2 focus:ring-[rgba(45,90,86,0.18)]";

const loginPrimaryBtnClass =
  "flex w-full items-center justify-center rounded-xl border-none bg-[var(--story-cta)] px-6 py-[15px] text-base font-semibold text-white shadow-[0_8px_20px_rgba(26,35,64,0.22)] transition-all duration-200 hover:bg-[var(--story-cta-hover)] disabled:cursor-not-allowed disabled:opacity-60";

const loginLabelClass = "block text-sm text-[var(--story-text-muted)]";

const loginPasswordInputClass =
  "w-full rounded-xl border border-[var(--story-border)] bg-white px-4 py-3 pr-12 text-base text-[var(--story-text)] transition-colors placeholder:text-[var(--story-text-muted)] focus:border-[var(--story-accent)] focus:outline-none focus:ring-2 focus:ring-[rgba(45,90,86,0.18)]";

const loginMutedLinkClass =
  "mx-auto block text-center text-sm text-[var(--story-text-muted)] underline-offset-2 transition-colors hover:text-[var(--story-text)] hover:underline";

const loginQuietLinkClass =
  "text-xs text-[var(--story-text-muted)] underline-offset-2 transition-colors hover:text-[var(--story-text)] hover:underline";

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

function LoginPageInner() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const registrationEnabled = isRegistrationCheckoutEnabledClient();
  const [isSignUp, setIsSignUp] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(false);
  const [signupRedirecting, setSignupRedirecting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const splashTargetRef = useRef<string | null>(null);
  const showDevLocalBypass =
    process.env.NODE_ENV === "development" && searchParams.get("dev_local") === "1";
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
  }, [forgotPassword, emailOpen, isSignUp, resetCaptcha]);

  const handleSplashDone = useCallback(() => {
    const target = splashTargetRef.current ?? "/";
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
    // Alleen e-mail/wachtwoord openklappen als dat hun vorige methode was.
    const last = getLastAuthMethod();
    if (last === "password" || last === "magic") {
      setEmailOpen(true);
    }
  }, []);

  useEffect(() => {
    persistSignupSourceFromUrl(searchParams?.get("source") ?? undefined);
    if (searchParams?.get("signup") !== "1") return;

    setSignupRedirecting(true);
    router.replace(buildRegistrerenHref(searchParams));
  }, [searchParams, router]);

  useEffect(() => {
    if (searchParams?.get("herstel") === "1") {
      setForgotPassword(true);
      setIsSignUp(false);
    }
    if (searchParams?.get("wachtwoord") === "bijgewerkt") {
      setMessage(t("login.passwordUpdated"));
    }
    if (searchParams?.get("checkout") === "1") {
      const stored = readCheckoutReturn();
      if (stored?.email && !email.trim()) {
        setEmail(stored.email);
      }
    }
  }, [searchParams, t, email]);

  const afterCheckoutLogin = searchParams?.get("checkout") === "1";
  const showSignInExtras = !isSignUp && !forgotPassword;

  const finishLogin = async (userId: string, userEmail: string | null | undefined) => {
    markReturningUser();
    try {
      await migrateV2LocalDataToSupabase(userId);
    } catch {
      /* best-effort */
    }
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

  const getSupabase = () => {
    try {
      if (typeof window === "undefined") {
        return null;
      }
      return createClient();
    } catch (error) {
      console.error("Error creating Supabase client:", error);
      return null;
    }
  };

  const handleResetEmail = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
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
        setError(t("login.noServer"));
        setLoading(false);
        return;
      }

      if (isSignUp && !SIGNUP_ALLOWED) {
        setError(t("login.signupDisabled"));
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
          splashTargetRef.current = "/";
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
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : t("login.errGeneric");
      let errorMessage = raw || t("login.errGeneric");
      if (
        errorMessage.includes("Invalid login credentials") ||
        errorMessage.includes("Invalid credentials")
      ) {
        errorMessage = t("login.errInvalidCreds");
      } else if (errorMessage.includes("Email not confirmed")) {
        errorMessage = t("login.errEmailConfirm");
      } else if (errorMessage.includes("User already registered")) {
        errorMessage = t("login.errAlreadyRegistered");
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
      : "login.storyHeading";
  const subheadingKey = forgotPassword
    ? null
    : isSignUp
      ? "registrerenPage.accountSubheadingAcquisition"
      : "login.storySubheading";

  if (signupRedirecting) {
    return (
      <RegistrerenShell visual="story" showLocaleToggle={false} compactBrand>
        <p className="text-center text-sm text-[var(--story-text-muted)]">{t("login.loading")}</p>
      </RegistrerenShell>
    );
  }

  return (
    <>
      {showSplash ? <LoginSuccessSplash onDone={handleSplashDone} /> : null}
      <RegistrerenShell
        error={error}
        visual="story"
        showLocaleToggle={false}
        compactBrand
      >
        <div className="mx-auto w-full text-center">
          <h2 className="st-story-serif text-[1.35rem] font-semibold leading-snug tracking-tight text-[var(--story-text)] sm:text-[1.5rem]">
            {t(headingKey)}
          </h2>
          {subheadingKey ? (
            <p className="mt-2 text-sm leading-relaxed text-[var(--story-text-muted)]">
              {t(subheadingKey)}
            </p>
          ) : null}
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
                className={loginMutedLinkClass}
              >
                {t("login.backSignIn")}
              </button>
            </div>
          </form>
        ) : isSignUp && !registrationEnabled ? (
          <form onSubmit={handleAuth} className="w-full space-y-5 text-left">
            <div className="space-y-4">
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
                  required
                />
              </div>

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
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
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
              {loading ? t("login.busy") : t("login.signUp")}
            </button>
          </form>
        ) : !isSignUp ? (
          <div className="w-full space-y-5">
            <OAuthSignInButtons
              visual="story"
              disabled={loading || showSplash}
              nextPath={safeAppPath(searchParams?.get("next") ?? null) ?? "/"}
              primaryProvider="google"
              showComingSoon={false}
              onError={(msg) => setError(msg)}
            />

            {message ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
                {message}
              </div>
            ) : null}

            {!emailOpen ? (
              <button
                type="button"
                onClick={() => {
                  setEmailOpen(true);
                  setError(null);
                }}
                className={loginMutedLinkClass}
                aria-expanded={false}
              >
                {t("login.magicLinkToggle")}
              </button>
            ) : (
              <div className="w-full space-y-5 text-left">
                <MagicLinkSignInForm
                  visual="story"
                  startOpen
                  disabled={loading || showSplash}
                  nextPath={
                    safeAppPath(searchParams?.get("next") ?? null) ?? "/"
                  }
                  onError={(msg) => setError(msg)}
                  onVerified={(user) => {
                    setLastAuthMethod("magic");
                    void finishLogin(user.id, user.email);
                  }}
                />
                <details className="group">
                  <summary
                    className={`cursor-pointer list-none text-center text-sm ${loginQuietLinkClass}`}
                  >
                    {t("login.emailFallbackHelp")}
                  </summary>
                  <form onSubmit={handleAuth} className="mt-4 w-full space-y-4">
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
                      {loading ? t("login.busy") : t("login.signIn")}
                    </button>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setForgotPassword(true);
                          setError(null);
                          setMessage(null);
                        }}
                        className={loginQuietLinkClass}
                      >
                        {t("login.forgot")}
                      </button>
                    </div>
                  </form>
                </details>
              </div>
            )}
          </div>
        ) : null}

        {registrationEnabled && showSignInExtras ? (
          <p className={`text-center ${loginQuietLinkClass}`}>
            {t("login.noAccount")}{" "}
            <Link
              href={buildRegistrerenHref(searchParams)}
              className="underline underline-offset-2"
            >
              {t("login.createAccount")}
            </Link>
          </p>
        ) : SIGNUP_ALLOWED && showSignInExtras ? (
          <p className={`text-center ${loginQuietLinkClass}`}>
            {t("login.noAccount")}{" "}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setForgotPassword(false);
                setError(null);
                setMessage(null);
              }}
              className="underline underline-offset-2"
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
              className={loginQuietLinkClass}
            >
              {t("login.toggleSignIn")}
            </button>
          </div>
        ) : null}

        {showDevLocalBypass ? (
          <div className="mx-auto w-full pt-2 text-center">
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
              className={`text-xs font-medium underline underline-offset-2 ${loginQuietLinkClass}`}
            >
              {t("login.localTestCta")}
            </button>
          </div>
        ) : null}
      </RegistrerenShell>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <RegistrerenShell visual="story" showLocaleToggle={false} compactBrand>
          <p className="text-center text-sm text-[var(--story-text-muted)]">Laden…</p>
        </RegistrerenShell>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
