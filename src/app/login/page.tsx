"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const LOCAL_MODE_COOKIE = 'structuro_local_mode';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [hasLocalTasks, setHasLocalTasks] = useState(false);
  const router = useRouter();

  // Check of er taken in localStorage staan (voor "Doorgaan met lokale data")
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('structuro_tasks');
      const tasks = stored ? JSON.parse(stored) : [];
      setHasLocalTasks(Array.isArray(tasks) && tasks.length > 0);
    } catch {
      setHasLocalTasks(false);
    }
  }, []);

  const handleContinueWithLocalData = () => {
    document.cookie = `${LOCAL_MODE_COOKIE}=1; path=/; max-age=2592000; SameSite=Lax`;
    // Volledige paginanavigatie zodat de cookie zeker meegaat naar de middleware
    window.location.href = '/';
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
              <div className="w-24 h-24 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-3xl">S</span>
              </div>
            ) : (
              <img 
                src="/Logo Structuro.png" 
                alt="Structuro Logo" 
                className="h-32 w-auto drop-shadow-lg"
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

        <div className="mt-8 text-center space-y-4">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setMessage(null);
            }}
            className="text-sm text-gray-600 hover:text-blue-600 transition-colors block w-full"
          >
            {isSignUp ? (
              <>
                Al een account? <span className="font-semibold text-blue-600">Log in</span>
              </>
            ) : (
              <>
                Nog geen account? <span className="font-semibold text-blue-600">Maak er een aan</span>
              </>
            )}
          </button>

          <div className="pt-4 border-t border-gray-200 relative z-10">
            <p className="text-xs text-gray-500 mb-3">
              {hasLocalTasks
                ? 'Kun je niet inloggen? Je hebt al taken opgeslagen in deze browser.'
                : 'Kun je niet inloggen? Doorgaan zonder account (taken worden lokaal opgeslagen).'}
            </p>
            <button
              type="button"
              onClick={handleContinueWithLocalData}
              className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors cursor-pointer border border-slate-200"
            >
              Doorgaan met lokale data →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

