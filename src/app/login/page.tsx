"use client";

import { useState, useLayoutEffect, Suspense, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { isProtectedTestAccount } from '@/lib/protectedTestAccount';
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [localDevHost, setLocalDevHost] = useState(false);

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
          setMessage(t('login.signupDone'));
          // Auto login na signup
          setTimeout(() => {
            clearStructuroLocalModeCookie();
            router.push('/');
          }, 2000);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          clearStructuroLocalModeCookie();
          router.push('/');
          router.refresh();
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

  return (
    <div className="relative flex min-h-[100dvh] w-full max-w-[100vw] items-center justify-center overflow-x-hidden overflow-y-auto scroll-pb-[var(--keyboard-inset-bottom)] bg-[#F4F6FB] px-4 py-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,calc(env(safe-area-inset-bottom)+var(--keyboard-inset-bottom,0px)))]">
      <div
        className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 flex gap-1 rounded-lg border border-slate-200/80 bg-white/90 p-0.5 text-xs font-semibold shadow-sm backdrop-blur-sm sm:right-6"
        role="group"
        aria-label={t('settings.languageTitle')}
      >
        <button
          type="button"
          onClick={() => setLocale('nl')}
          className={`rounded-md px-2 py-1 ${locale === 'nl' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          NL
        </button>
        <button
          type="button"
          onClick={() => setLocale('en')}
          className={`rounded-md px-2 py-1 ${locale === 'en' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          EN
        </button>
      </div>
      <div className="w-full min-w-0 max-w-sm space-y-6 rounded-2xl bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="flex flex-col items-center gap-2 leading-none">
            {logoError ? (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-600 shadow-md">
                <span className="text-3xl font-bold text-white">S</span>
              </div>
            ) : (
              <img
                src="/logo-structuro.png"
                alt=""
                width={96}
                height={96}
                className="h-20 w-20 object-contain drop-shadow-sm"
                onError={() => setLogoError(true)}
              />
            )}
            <span className="text-lg font-semibold tracking-tight text-slate-800">{t('login.taglineBrand')}</span>
          </div>
          <p className="mt-1 text-xs leading-tight text-gray-400">{t('brand.tagline')}</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          <div className="space-y-4">
            {isSignUp && (
              <div className="space-y-1">
                <label htmlFor="fullName" className="block text-sm font-normal text-gray-500">
                  {t('login.fullName')}
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder={t('login.fullNamePh')}
                  required={isSignUp}
                />
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="email" className="block text-sm font-normal text-gray-500">
                {t('login.email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder={t('login.emailPh')}
                required
              />
            </div>

            {!forgotPassword || isSignUp ? (
            <div className="space-y-1">
              <label htmlFor="password" className="block text-sm font-normal text-gray-500">
                {t('login.password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="••••••••"
                required={!forgotPassword || isSignUp}
                minLength={6}
                disabled={forgotPassword && !isSignUp}
              />
            </div>
            ) : (
              <p className="text-sm text-gray-600">
                {t('login.forgotHelp')}
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-r-lg border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-r-lg border-l-4 border-green-500 bg-green-50 px-4 py-3 text-sm text-green-700">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? t('login.busy')
              : forgotPassword && !isSignUp
                ? t('login.sendReset')
                : isSignUp
                  ? t('login.signUp')
                  : t('login.signIn')}
          </button>
        </form>

        {!isSignUp ? (
          <div className="text-center">
            {forgotPassword ? (
              <button
                type="button"
                onClick={() => {
                  setForgotPassword(false);
                  setError(null);
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                {t('login.backSignIn')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setForgotPassword(true);
                  setError(null);
                  setMessage(null);
                }}
                className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
              >
                {t('login.forgot')}
              </button>
            )}
          </div>
        ) : null}

        {SIGNUP_ALLOWED ? (
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp((v) => !v);
                setForgotPassword(false);
                setError(null);
                setMessage(null);
              }}
              className="text-sm text-gray-500 hover:text-gray-800"
            >
              {isSignUp ? t('login.toggleSignIn') : t('login.toggleSignUp')}
            </button>
          </div>
        ) : null}

        {showLocalTest && (
          <div className="border-t border-gray-200/80 pt-4 mt-0 space-y-3">
            <p className="text-center text-xs text-gray-500">
              {t('login.localTestHint')}
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
              className="w-full py-3 rounded-xl text-sm font-medium border-2 border-dashed border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors"
            >
              {t('login.localTestCta')}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-[#F4F6FB] text-slate-600">
          Laden…
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}

