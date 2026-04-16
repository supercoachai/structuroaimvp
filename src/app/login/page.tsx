"use client";

import { useState, useLayoutEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { isProtectedTestAccount } from '@/lib/protectedTestAccount';
import {
  clearStructuroLocalModeCookie,
  markLocalSessionFresh,
} from '@/lib/localModeSession';
import { LOCAL_ONBOARDING_COMPLETED_KEY } from '@/lib/onboardingProfile';
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4 py-8 overflow-y-auto">
      <div className="max-w-md w-full rounded-3xl shadow-2xl p-10 relative" style={{ 
        backgroundColor: 'transparent',
        background: 'linear-gradient(135deg, #FFFFFF 0%, #F8F9FA 100%)'
      }}>
        <div className="text-center mb-10">
          {/* Logo - groter en prominenter */}
          <div className="mb-8 flex justify-center">
            {logoError ? (
              <div className="w-32 h-32 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-4xl">S</span>
              </div>
            ) : (
              <img 
                src="/Logo Structuro - met tekst.png" 
                alt="Structuro Logo" 
                width={128}
                height={128}
                className="w-32 h-32 object-contain drop-shadow-lg"
                onError={() => setLogoError(true)}
              />
            )}
          </div>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          {isSignUp && (
            <div>
              <label htmlFor="fullName" className="block text-sm font-semibold text-gray-700 mb-2">
                Volledige naam
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white text-gray-900"
                placeholder="Je naam"
                required={isSignUp}
                style={{ color: '#111827' }}
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white text-gray-900"
                placeholder="je@email.com"
                required
                style={{ color: '#111827' }}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
              Wachtwoord
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white text-gray-900"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-r-lg text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-50 border-l-4 border-green-500 text-green-700 px-4 py-3 rounded-r-lg text-sm">
              {message}
            </div>
          )}

                   <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 active:bg-blue-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none mt-6"
          >
            {loading ? 'Bezig...' : isSignUp ? 'Account aanmaken' : 'Inloggen'}
          </button>
        </form>

        {showLocalTest && (
          <div className="mt-8 pt-6 border-t border-gray-200/80">
            <p className="text-xs text-gray-500 text-center mb-3">
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

