"use client";

import { useState, useLayoutEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
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

/** Zichtbaar in `next dev`, of als NEXT_PUBLIC_ALLOW_LOCAL_TEST_LOGIN=true (bijv. na `next start` lokaal). */
const SHOW_LOCAL_TEST_LOGIN =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_ALLOW_LOCAL_TEST_LOGIN === "true";

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

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  const router = useRouter();
  const [localDevHost, setLocalDevHost] = useState(false);

  useLayoutEffect(() => {
    try {
      setLocalDevHost(isLikelyLocalDevHost(window.location.hostname));
    } catch {
      setLocalDevHost(false);
    }
  }, []);

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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = getSupabase();
      if (!supabase) {
        setError('Kan geen verbinding maken met de server. Controleer je internetverbinding.');
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
          setMessage('Account aangemaakt! Check je email voor verificatie (als email verificatie is ingeschakeld).');
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
      // Vertaal error messages naar Nederlands
      let errorMessage = err.message || 'Er is iets misgegaan';
      if (errorMessage.includes('Invalid login credentials') || errorMessage.includes('Invalid credentials')) {
        errorMessage = 'Ongeldige inloggegevens. Controleer je email en wachtwoord.';
      } else if (errorMessage.includes('Email not confirmed')) {
        errorMessage = 'Email nog niet bevestigd. Check je inbox.';
      } else if (errorMessage.includes('User already registered')) {
        errorMessage = 'Dit email adres is al geregistreerd.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center overflow-y-auto scroll-pb-[var(--keyboard-inset-bottom)] bg-[#F4F6FB] px-4 py-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,calc(env(safe-area-inset-bottom)+var(--keyboard-inset-bottom,0px)))]">
      <div className="w-full max-w-sm space-y-6 rounded-2xl bg-white p-8 shadow-sm">
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
            <span className="text-lg font-semibold tracking-tight text-slate-800">Structuro</span>
          </div>
          <p className="mt-1 text-xs leading-tight text-gray-400">Jouw houvast in chaos.</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          <div className="space-y-4">
            {isSignUp && (
              <div className="space-y-1">
                <label htmlFor="fullName" className="block text-sm font-normal text-gray-500">
                  Volledige naam
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Je naam"
                  required={isSignUp}
                />
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="email" className="block text-sm font-normal text-gray-500">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="je@email.com"
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="block text-sm font-normal text-gray-500">
                Wachtwoord
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
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
            {loading ? 'Bezig...' : isSignUp ? 'Account aanmaken' : 'Inloggen'}
          </button>
        </form>

        {showLocalTest && (
          <div className="border-t border-gray-200/80 pt-4 mt-0 space-y-3">
            <p className="text-center text-xs text-gray-500">
              Lokaal testen zonder Supabase-account (taken in deze browser).
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
              Doorgaan als lokale test
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

