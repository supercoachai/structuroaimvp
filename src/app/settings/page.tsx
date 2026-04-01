'use client';

import { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { wipeAllUserData, STRUCTURO_STORAGE_KEYS } from '../../lib/resetStorage';
import { toast } from '../../components/Toast';
import { InformationCircleIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { createClient } from '@/lib/supabase/client';
import { isProtectedTestAccount } from '@/lib/protectedTestAccount';
import { useConsent } from '@/contexts/ConsentContext';

const NAME_KEY = 'structuro_user_name';

export default function SettingsPage() {
  const { analyticsConsent, reopenConsentBanner } = useConsent();
  const [name, setName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isProtectedAccount, setIsProtectedAccount] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(NAME_KEY);
      if (stored) {
        setName(stored);
        setNameInput(stored);
      }
    }
  }, []);

  useEffect(() => {
    const checkProtected = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        setIsProtectedAccount(isProtectedTestAccount(user?.email ?? null));
      } catch {
        setIsProtectedAccount(false);
      }
    };
    checkProtected();
  }, []);

  const handleSaveName = () => {
    const value = nameInput.trim();
    if (typeof window !== 'undefined') {
      if (value) {
        localStorage.setItem(NAME_KEY, value);
        setName(value);
        toast('Aanspreeknaam opgeslagen');
      } else {
        localStorage.removeItem(NAME_KEY);
        setName('');
        toast('Aanspreeknaam verwijderd');
      }
    }
  };

  const handleWipeData = () => {
    if (isProtectedAccount) {
      toast('Dit is een beschermd testaccount – data wordt niet gewist.');
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
    toast('Data gedownload');
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || typeof window === 'undefined') return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as Record<string, unknown>;
        let imported = 0;
        STRUCTURO_STORAGE_KEYS.forEach((key) => {
          const value = data[key];
          if (value !== undefined && value !== null) {
            localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
            imported++;
          }
        });
        toast(`Data geïmporteerd (${imported} onderdelen). Pagina wordt vernieuwd.`);
        e.target.value = '';
        setTimeout(() => window.location.reload(), 800);
      } catch (err) {
        toast('Ongeldig bestand. Gebruik een eerder geëxporteerde JSON.');
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <AppLayout>
      <div
        className="min-h-screen py-12 px-4 sm:px-6 pb-16"
        style={{
          background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
          color: '#2F3441',
        }}
      >
        <main
          style={{
            width: '100%',
            maxWidth: 640,
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 32,
          }}
        >
          {/* Header – zweeft los, luchtigheid zoals Taken/Herinneringen */}
          <header className="text-center pt-12 pb-0 mb-4">
            <div
              className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
              }}
            >
              <Cog6ToothIcon className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Instellingen</h1>
            <p className="text-sm text-gray-500 mt-2">
              Persoonlijke voorkeuren en privacy
            </p>
          </header>

          {/* Transparantie: doel van data */}
          <section className="bg-white rounded-3xl shadow-sm p-6 sm:p-8">
            <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-2">
              Doel van je data
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Je vult je gegevens in zodat Structuro werkzaam is en jou het best kan helpen. De data is alleen voor jou inzichtelijk.
            </p>
          </section>

          {/* AVG: analytics-toestemming (GA4 alleen na akkoord) */}
          <section className="bg-white rounded-3xl shadow-sm p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              Statistieken & cookies (analytics)
            </h2>
            <p className="text-sm text-slate-500 mb-4 leading-relaxed">
              Google Analytics (GA4) gebruiken we alleen als je dat expliciet toestaat. Zonder toestemming
              wordt er geen meetscript geladen. Je keuze slaat Structuro op in deze browser
              {analyticsConsent !== 'pending' ? ' (en bij inloggen ook in je profiel, als die kolom bestaat).' : '.'}
            </p>
            <p className="text-sm font-medium text-slate-800 mb-3">
              Huidige keuze:{' '}
              {analyticsConsent === 'granted' && (
                <span className="text-green-700">toegestaan</span>
              )}
              {analyticsConsent === 'denied' && (
                <span className="text-slate-600">niet toegestaan</span>
              )}
              {analyticsConsent === 'pending' && (
                <span className="text-amber-700">nog niet gekozen — zie banner onderaan</span>
              )}
            </p>
            <button
              type="button"
              onClick={reopenConsentBanner}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold border-2 border-slate-200 bg-white text-slate-800 hover:bg-slate-50 transition-colors"
            >
              Keuze aanpassen
            </button>
          </section>

          {/* Aanspreeknaam */}
          <section className="bg-white rounded-3xl shadow-sm p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              Aanspreeknaam
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              Hoe wil je dat we je noemen? (bijv. in dagstart en overzicht)
            </p>
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                placeholder="Bijv. Jan of Marie"
                className="flex-1 min-w-[200px] px-4 py-2.5 rounded-2xl shadow-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
              <button
                type="button"
                onClick={handleSaveName}
                className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
              >
                Opslaan
              </button>
            </div>
          </section>

          {/* Data export & import – ook voor overzetten tussen browsers */}
          <section className="bg-white rounded-3xl shadow-sm p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              Data back-up & overzetten
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              Taken en data staan per browser (Chrome ≠ Safari). Exporteer in Chrome, importeer in Safari om je taken over te zetten.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleDownloadData}
                className="px-4 py-2.5 rounded-lg font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Exporteren (downloaden)
              </button>
              <label className="px-4 py-2.5 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 cursor-pointer transition-colors">
                Importeren (bestand kiezen)
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="hidden"
                />
              </label>
            </div>
          </section>

          {/* Alle data wissen (AVG – recht op vergetelheid) */}
          <section className="bg-white rounded-3xl shadow-sm p-6 sm:p-8 ring-2 ring-red-100">
            {isProtectedAccount && (
              <div className="mb-4 p-3 rounded-2xl bg-amber-50 shadow-sm text-amber-800 text-sm">
                🔒 Dit is een beschermd testaccount. Je data wordt niet gewist tijdens development.
              </div>
            )}
            <div className="flex items-start gap-2 mb-2">
              <h2 className="text-lg font-semibold text-slate-900">
                Alle gegevens wissen & resetten
              </h2>
              <span
                className="flex-shrink-0 text-slate-400 hover:text-slate-600 cursor-help mt-0.5"
                title="Recht op vergetelheid (AVG): je mag altijd vragen om verwijdering van je data. Met deze knop wist je al je gegevens in één keer (ook op onze servers)."
              >
                <InformationCircleIcon className="w-5 h-5" aria-hidden />
              </span>
            </div>
            <p className="text-sm text-slate-500 mb-2">
              Verwijder al je gegevens: taken, check-ins, aanspreeknaam,
              analytics-voorkeur, focus- en beloningsdata. Dit kan niet ongedaan worden.
            </p>
            <p className="text-sm text-slate-500 mb-4">
              <strong>Waarom deze knop?</strong> Structuro is privacy-by-design. Wil je stoppen of opnieuw beginnen? Dan wist je hier al je gegevens.
            </p>
            {!confirmWipe ? (
              <button
                type="button"
                onClick={handleWipeData}
                disabled={isProtectedAccount === true}
                className="px-4 py-2.5 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProtectedAccount ? 'Uitgeschakeld (beschermd account)' : 'Alle gegevens wissen & resetten'}
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  Weet je het zeker? Al je taken en voortgang worden verwijderd. Typ <strong>WISSEN</strong> om te bevestigen:
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="WISSEN"
                  className="w-full max-w-xs px-4 py-2.5 rounded-2xl shadow-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleWipeData}
                    className="px-4 py-2.5 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white transition-colors"
                  >
                    Definitief wissen
                  </button>
                  <button
                    type="button"
                    onClick={cancelWipe}
                    className="px-4 py-2.5 rounded-lg font-medium bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
                  >
                    Annuleren
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Privacy-first melding */}
          <p className="text-xs text-slate-400 text-center mt-6 max-w-md mx-auto">
            Privacy-first: je data wordt veilig verwerkt.
          </p>
        </main>
      </div>
    </AppLayout>
  );
}
