"use client";

import { useEffect } from 'react';
import DayStartCheckIn from '../../components/DayStartCheckIn';
import AppLayout from '../../components/layout/AppLayout';
import { useRouter } from 'next/navigation';
import { useCheckIn } from '../../hooks/useCheckIn';
import { setDagstartCookieOnClient } from '@/lib/dagstartCookie';

export default function DagStartPage() {
  const { hasCheckedIn, loading } = useCheckIn();
  const router = useRouter();

  // Check-in staat al in DB/localStorage maar cookie mist (nieuwe browser): zet cookie zodat middleware doorlaat.
  useEffect(() => {
    if (!loading && hasCheckedIn) {
      setDagstartCookieOnClient();
    }
  }, [loading, hasCheckedIn]);

  const handleComplete = () => {
    // Na opslaan, refresh om eventuele wijzigingen te tonen
    setTimeout(() => {
      router.push('/');
    }, 500);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-base text-gray-500">Laden...</div>
        </div>
      </AppLayout>
    );
  }

  // Als er vandaag al een check-in is (Supabase of localStorage), toon melding
  if (hasCheckedIn) {
    return (
      <AppLayout>
        <div
          className="min-h-screen py-20 px-4 sm:px-6 pb-16"
          style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' }}
        >
          <main className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
            <div className="bg-white rounded-3xl shadow-sm p-8 sm:p-10 w-full max-w-md text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6 text-3xl">
                ✓
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Je dagstart is al ingevuld</h2>
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                Je hebt vandaag al je focuspunten gekozen. De dagstart kan één keer per dag worden ingevuld en wordt om middernacht gereset.
              </p>
              <button
                onClick={() => router.push('/')}
                className="w-full py-3 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-colors"
              >
                Terug naar dashboard
              </button>
            </div>
          </main>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div
        className="min-h-screen py-12 px-4 sm:px-6 pb-16"
        style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' }}
      >
        <main className="max-w-3xl mx-auto flex flex-col gap-6">
          {/* Header – zelfde hoogte als andere pagina's (Taken, Overzicht) */}
          <header className="text-center pt-12 pb-0 mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 mb-4 shadow-sm">
              <span className="text-2xl">🌅</span>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Dagstart
            </h1>
            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
              Neem even de tijd om je dag te overzien.
            </p>
          </header>

          {/* Content kaart – DayStartCheckIn */}
          <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
            <DayStartCheckIn onComplete={handleComplete} />
            <p className="text-xs text-gray-400 text-center max-w-md mx-auto">
              Privacy-first: je data wordt veilig verwerkt.
            </p>
          </div>
        </main>
      </div>
    </AppLayout>
  );
}

