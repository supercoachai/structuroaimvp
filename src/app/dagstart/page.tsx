"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import DayStartCheckIn from '../../components/DayStartCheckIn';
import AppLayout from '../../components/layout/AppLayout';
import { useRouter } from 'next/navigation';
import { useCheckIn } from '../../hooks/useCheckIn';
import { setDagstartCookieOnClient } from '@/lib/dagstartCookie';
import { useTaskContext } from '../../context/TaskContext';
import { PlayIcon } from '@heroicons/react/24/outline';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { getNextUniqueQuote } from '@/lib/adhdQuotes';
import { getStableEnergyDoneMessage } from '@/lib/energyDoneQuotes';

const SLOT_LABELS = ['KERNFOCUS', 'VERVOLGSTAP', 'BONUSACTIE'] as const;

const ENERGY_DONE_THEME: Record<
  'low' | 'medium' | 'high',
  {
    borderLeft: string;
    pillBg: string;
    pillText: string;
    pillLabel: string;
  }
> = {
  low: {
    borderLeft: '#3B82F6',
    pillBg: '#E0F2FE',
    pillText: '#075985',
    pillLabel: 'Lage energie',
  },
  medium: {
    borderLeft: '#F59E0B',
    pillBg: '#FFFBEB',
    pillText: '#B45309',
    pillLabel: 'Normale energie',
  },
  high: {
    borderLeft: '#10B981',
    pillBg: '#D1FAE5',
    pillText: '#047857',
    pillLabel: 'Hoge energie',
  },
};

function normalizeEnergyLevel(raw: string | undefined): 'low' | 'medium' | 'high' {
  if (raw === 'low' || raw === 'high') return raw;
  return 'medium';
}

export default function DagStartPage() {
  const { hasCheckedIn, loading, checkIn } = useCheckIn();
  const { tasks, loading: tasksLoading, updateTask } = useTaskContext();
  const router = useRouter();
  const {
    onboardingCompleted,
    loading: onboardingLoading,
  } = useOnboardingStatus();
  const quoteRef = useRef(getNextUniqueQuote());

  const energyKeyForDone =
    hasCheckedIn && checkIn ? normalizeEnergyLevel(checkIn.energy_level) : null;

  const energyDoneSubtitle = useMemo(() => {
    if (!energyKeyForDone) return '';
    return getStableEnergyDoneMessage(energyKeyForDone);
  }, [energyKeyForDone]);

  useEffect(() => {
    if (!loading && hasCheckedIn) {
      setDagstartCookieOnClient();
    }
  }, [loading, hasCheckedIn]);

  const handleComplete = () => {
    if (typeof window !== 'undefined') {
      window.location.assign(`${window.location.origin}/todo`);
    } else {
      router.push('/todo');
    }
  };

  const orderedFocus = useMemo(() => {
    const ids = checkIn?.top3_task_ids;
    if (!ids?.length) return [];
    return ids.map((id, idx) => ({
      id,
      slot: idx + 1,
      task: tasks.find((t) => t.id === id) ?? null,
    }));
  }, [checkIn?.top3_task_ids, tasks]);

  const firstActionable = useMemo(() => {
    for (const row of orderedFocus) {
      if (row.task && !row.task.done) return row.task;
    }
    return null;
  }, [orderedFocus]);

  if (loading || onboardingLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-base text-gray-500 animate-pulse">Laden...</div>
        </div>
      </AppLayout>
    );
  }

  if (hasCheckedIn && checkIn) {
    const energyKey = normalizeEnergyLevel(checkIn.energy_level);
    const theme = ENERGY_DONE_THEME[energyKey];

    return (
      <AppLayout>
        <div className="flex min-h-full flex-col items-center justify-center px-4 sm:px-6 pt-14 sm:pt-16 pb-8"
          style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' }}
        >
          <main className="flex w-full max-w-lg flex-col gap-5">
            <header className="mb-10 flex w-full flex-col items-start text-left sm:mb-12">
              <div className="mb-5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 shadow-sm">
                <span className="text-xl" aria-hidden>
                  {'\u{1F305}'}
                </span>
              </div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">Je focus voor vandaag</h1>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600">
                  {energyDoneSubtitle}
                </p>
            </header>

            <div
              className="bg-white rounded-3xl shadow-sm p-5 sm:p-6"
              style={{ borderLeft: `3px solid ${theme.borderLeft}` }}
            >
              <div
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-tight mb-4"
                style={{ backgroundColor: theme.pillBg, color: theme.pillText }}
              >
                {theme.pillLabel}
              </div>

              {tasksLoading && orderedFocus.length > 0 ? (
                <p className="text-sm text-gray-500 mb-3">Taken laden…</p>
              ) : null}

              {orderedFocus.length === 0 ? (
                <p className="text-sm text-gray-600 leading-relaxed">
                  Geen focuspunten opgeslagen voor vandaag. Ga naar{' '}
                  <button
                    type="button"
                    onClick={() => router.push('/todo')}
                    className="text-blue-600 font-semibold underline underline-offset-2"
                  >
                    Taken
                  </button>{' '}
                  om verder te gaan.
                </p>
              ) : (
                <ol className="space-y-3">
                  {orderedFocus.map((row) => {
                    const label = SLOT_LABELS[row.slot - 1] ?? `Prioriteit ${row.slot}`;
                    return (
                      <li
                        key={`${row.id}-${row.slot}`}
                        className="rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-2.5"
                      >
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-0.5">
                          {row.slot}. {label}
                        </div>
                        {row.task ? (
                          <div className="text-sm sm:text-base font-medium text-gray-900 leading-snug">{row.task.title}</div>
                        ) : (
                          <div className="text-sm text-gray-500 italic">Taak niet meer in je lijst. Bekijk Taken om bij te werken.</div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}

              <div className="mt-5 flex flex-col gap-2.5">
                {firstActionable ? (
                  <button
                    type="button"
                    onClick={async () => {
                      await updateTask(firstActionable.id, { started: true });
                      router.push(`/focus?task=${firstActionable.id}`);
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-colors"
                  >
                    <PlayIcon className="w-5 h-5 flex-shrink-0" aria-hidden />
                    Begin nu:{' '}
                    {firstActionable.title.length > 40
                      ? `${firstActionable.title.slice(0, 38)}…`
                      : firstActionable.title}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => router.push('/todo')}
                  className="w-full py-3 px-4 rounded-xl border-2 border-gray-200 bg-white text-gray-800 font-semibold hover:bg-gray-50 transition-colors"
                >
                  Open Taken &amp; prioriteiten
                </button>
              </div>
            </div>
          </main>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div
        className="flex min-h-full flex-col items-center px-4 sm:px-6 pt-14 sm:pt-16 pb-6 sm:pb-8"
        style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' }}
      >
        <main className="mx-auto flex w-full max-w-xl flex-col gap-4">
          <header className="mb-10 flex w-full flex-col items-start text-left sm:mb-12">
            <div className="mb-5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 shadow-sm">
              <span className="text-xl" aria-hidden>
                {'\u{1F305}'}
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-800 sm:text-3xl">Dagstart</h1>
            <p className="mt-2 max-w-xs text-balance text-sm text-slate-500">Neem even de tijd om je dag te overzien.</p>
          </header>

          <div className="flex flex-col gap-4 w-full">
            <DayStartCheckIn
              onComplete={handleComplete}
              firstTimeOnboarding={!onboardingCompleted}
            />
            <p className="text-xs text-gray-400 text-center max-w-md mx-auto italic">
              &ldquo;{quoteRef.current}&rdquo;
            </p>
          </div>
        </main>
      </div>
    </AppLayout>
  );
}
