'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings } from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout';
import { wipeAllUserData, STRUCTURO_STORAGE_KEYS } from '../../lib/resetStorage';
import { toast } from '../../components/Toast';
import { createClient } from '@/lib/supabase/client';
import { isProtectedTestAccount } from '@/lib/protectedTestAccount';
import { setProfileOnboardingCompleted } from '@/lib/onboardingMutations';
import { LOCAL_ONBOARDING_COMPLETED_KEY } from '@/lib/onboardingProfile';
import { clearLocalOnboardingDoneCookieOnClient, hasStructuroLocalModeCookieOnClient } from '@/lib/localOnboardingCookie';
import { performClientLogout } from '@/lib/logoutClient';

const NAME_KEY = 'structuro_user_name';

export default function SettingsPage() {
  const router = useRouter();
  const [nameInput, setNameInput] = useState('');
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isProtectedAccount, setIsProtectedAccount] = useState<boolean | null>(null);
  const [hasSupabaseSession, setHasSupabaseSession] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(NAME_KEY);
      if (stored) {
        setNameInput(stored);
      }
    }
  }, []);

  useEffect(() => {
    const checkProtected = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        setHasSupabaseSession(Boolean(user?.id));
        setIsProtectedAccount(isProtectedTestAccount(user?.email ?? null));
      } catch {
        setIsProtectedAccount(false);
        setHasSupabaseSession(false);
      }
    };
    void checkProtected();
  }, []);

  const handleReplayIntro = async () => {
    if (hasSupabaseSession) {
      const { error } = await setProfileOnboardingCompleted(false);
      if (error) {
        toast(`Kon intro niet heropenen: ${error}`);
        return;
      }
    } else {
      try { window.localStorage.removeItem(LOCAL_ONBOARDING_COMPLETED_KEY); } catch { /* ignore */ }
      clearLocalOnboardingDoneCookieOnClient();
    }
    window.location.assign(`${window.location.origin}/onboarding`);
  };

  const handleSaveName = () => {
    const value = nameInput.trim();
    if (typeof window !== 'undefined') {
      if (value) {
        localStorage.setItem(NAME_KEY, value);
        toast('Aanspreeknaam opgeslagen');
      } else {
        localStorage.removeItem(NAME_KEY);
        toast('Aanspreeknaam verwijderd');
      }
    }
  };

  const handleWipeData = () => {
    if (isProtectedAccount) {
      toast('Dit is een beschermd testaccount. Data wordt niet gewist.');
      return;
    }
    if (!confirmWipe) {
      setConfirmWipe(true);
      setConfirmText('');
      return;
    }
    if (confirmText.toLowerCase() !== 'wissen') {
      toast('Typ WISSEN om te bevestigen');
      return;
    }
    const ok = wipeAllUserData();
    if (ok) toast('Alle data gewist. Je wordt doorgestuurd.');
    else toast('Fout bij wissen van data');
  };

  const cancelWipe = () => {
    setConfirmWipe(false);
    setConfirmText('');
  };

  const handleDownloadData = () => {
    if (typeof window === 'undefined') return;
    const data: Record<string, unknown> = {};
    STRUCTURO_STORAGE_KEYS.forEach((key) => {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          data[key] = JSON.parse(raw);
        } catch {
          data[key] = raw;
        }
      }
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `structuro-data-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Export gedownload');
  };

  const handleLogout = async () => {
    if (logoutBusy) return;
    setLogoutBusy(true);
    try {
      await performClientLogout(router);
    } finally {
      setLogoutBusy(false);
    }
  };

  const isLocalOnly = hasStructuroLocalModeCookieOnClient() && !hasSupabaseSession;

  return (
    <AppLayout>
      <div className="min-h-full bg-gradient-to-br from-slate-50 to-blue-50 text-slate-900">
        <main className="mx-auto max-w-md px-4 sm:px-6 pt-14 sm:pt-16 pb-12">
          <header className="mb-10 flex w-full flex-col items-start text-left sm:mb-12">
            <div
              className="mb-5 flex h-14 w-14 shrink-0 items-center justify-center rounded-full shadow-md"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
              }}
            >
              <Settings className="h-7 w-7 text-white" strokeWidth={2} aria-hidden />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-800">Instellingen</h1>
            <p className="mt-2 max-w-sm text-balance text-sm text-slate-500">
              Persoonlijke voorkeuren en beheer
            </p>
          </header>

          {/* Kaart 1: Jouw profiel */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-6 p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-1">Aanspreeknaam</h2>
            <p className="text-sm text-slate-500 mb-4 text-balance">
              Hoe wil je dat we je noemen in de app?
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                placeholder="Bijvoorbeeld je voornaam"
                className="flex-1 min-w-0 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-300"
              />
              <button
                type="button"
                onClick={handleSaveName}
                className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98]"
              >
                Opslaan
              </button>
            </div>

            <div className="border-t border-slate-100 my-4" />

            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={logoutBusy}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 disabled:opacity-50"
            >
              {logoutBusy ? 'Bezig met uitloggen…' : 'Uitloggen'}
            </button>
            {isLocalOnly ? (
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Je test lokaal zonder account. Uitloggen brengt je terug naar het inlogscherm en wist de lokale sessie.
              </p>
            ) : null}
          </section>

          {/* Kaart 2: App-ervaring */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-6 p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-1">Rondleiding</h2>
            <p className="text-sm text-slate-500 mb-4 text-balance">
              Bekijk de korte introductie van Structuro opnieuw.
            </p>
            <button
              type="button"
              onClick={() => void handleReplayIntro()}
              className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-200 active:scale-[0.98]"
            >
              Introductie opnieuw bekijken
            </button>
          </section>

          {/* Kaart 3: Data & privacy */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-6 p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-1">Data exporteren</h2>
            <p className="text-sm text-slate-500 mb-4 text-balance">
              Download een kopie van al je persoonlijke gegevens en taken (GDPR).
            </p>
            <button
              type="button"
              onClick={handleDownloadData}
              className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-200 active:scale-[0.98]"
            >
              Exporteer mijn data
            </button>
          </section>

          {/* Gevarenzone: buiten de witte kaarten */}
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-red-900/80 mb-1">Account & gegevens verwijderen</h3>
            <p className="text-xs text-red-800/60 mb-3 text-balance leading-relaxed">
              Wis al je taken en check-ins permanent. Dit kan niet ongedaan worden gemaakt.
            </p>

            {isProtectedAccount ? (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
                Dit is een beschermd testaccount. Wissen is uitgeschakeld tijdens development.
              </div>
            ) : null}

            {!confirmWipe ? (
              <button
                type="button"
                onClick={handleWipeData}
                disabled={isProtectedAccount === true}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
              >
                Alle gegevens wissen
              </button>
            ) : (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white/60 p-4">
                <p className="text-sm text-slate-600 text-balance">
                  Weet je het zeker? Typ <span className="font-semibold text-slate-800">WISSEN</span> om te bevestigen.
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="WISSEN"
                  className="w-full max-w-xs rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-200"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleWipeData}
                    className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 active:scale-[0.98]"
                  >
                    Definitief wissen
                  </button>
                  <button
                    type="button"
                    onClick={cancelWipe}
                    className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 active:scale-[0.98]"
                  >
                    Annuleren
                  </button>
                </div>
              </div>
            )}
          </div>

          <p className="mt-8 text-center text-xs text-slate-400 leading-relaxed text-balance">
            Structuro is privacy-by-design. Je data is alleen voor jou inzichtelijk.
          </p>
        </main>
      </div>
    </AppLayout>
  );
}
