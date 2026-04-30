"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  BoltIcon,
  FaceSmileIcon,
  InformationCircleIcon,
  MoonIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import { normalizeMicroSteps, microStepId, type MicroStep } from '@/lib/microSteps';
import { getTaskDurationMinutes } from '@/lib/taskDurationMinutes';
import { useRouter } from 'next/navigation';
import { useTaskContext, Task } from '../context/TaskContext';
import { designSystem } from '../lib/design-system';
import { toast } from './Toast';
import { useCheckIn } from '../hooks/useCheckIn';
import { resetAndLoadMockData, clearAllTasksOnly } from '../lib/resetStorage';
import { createClient } from '@/lib/supabase/client';
import { isProtectedTestAccount } from '@/lib/protectedTestAccount';
import { persistPreferredDisplayName } from '@/lib/accountDisplayName';
import { useI18n } from '@/lib/i18n';
import { homeWelcomeEn, homeWelcomeNl } from '@/lib/i18n/homeCopy';

export default function HomeCalm() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { tasks, loading, updateTask } = useTaskContext();
  const { checkIn: todayCheckIn } = useCheckIn();
  const [userName, setUserName] = useState<string | null>(null);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [newName, setNewName] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [isProtectedAccount, setIsProtectedAccount] = useState(false);
  const [heroMicroDraft, setHeroMicroDraft] = useState('');
  const [heroMicroSaving, setHeroMicroSaving] = useState(false);

  useEffect(() => {
    const checkProtected = async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setIsProtectedAccount(isProtectedTestAccount(session?.user?.email ?? null));
      } catch {
        setIsProtectedAccount(false);
      }
    };
    checkProtected();
  }, []);

  // Huidige focus: toon altijd Prioriteit 1 (Kernfocus) als die bestaat
  const findLowestEnergyTask = useMemo(() => {
    const fromDayStart = tasks.filter(task =>
      task.source !== 'medication' &&
      !task.done &&
      task.priority != null &&
      task.priority >= 1 &&
      task.priority <= 3
    );
    if (fromDayStart.length === 0) return null;
    const priority1 = fromDayStart.find(t => t.priority === 1);
    if (priority1) return priority1;
    // Fallback: kleinste prioriteit (1->3) als er iets mis is met data
    const byPriority = [...fromDayStart].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
    return byPriority[0] ?? null;
  }, [tasks]);

  const nonMedicationTasks = useMemo(
    () => tasks.filter((t) => t.source !== 'medication'),
    [tasks]
  );
  const allNonMedicationDone = useMemo(
    () =>
      nonMedicationTasks.length > 0 &&
      nonMedicationTasks.every((t) => t.done),
    [nonMedicationTasks]
  );

  const getFirstName = (name: string) => {
    const first = name.trim().split(' ')[0];
    return first || null;
  };

  // Haal gebruikersnaam op bij mount (localStorage -> profiles.display_name -> auth metadata)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsClient(true);

    const storedName = localStorage.getItem('structuro_user_name');
    const firstFromLocal = storedName ? getFirstName(storedName) : null;
    if (firstFromLocal) {
      setUserName(firstFromLocal);
      setShowNamePrompt(false);
      return;
    }

    // Fallback: naam uit Supabase profile, daarna user_metadata.
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const userId = session?.user?.id ?? null;

        if (userId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, preferred_name, full_name')
            .eq('id', userId)
            .maybeSingle();

          const profileName =
            (typeof profile?.display_name === 'string' && profile.display_name.trim()) ||
            (typeof profile?.preferred_name === 'string' && profile.preferred_name.trim()) ||
            (typeof (profile as any)?.full_name === 'string' && (profile as any).full_name.trim()) ||
            null;

          if (profileName) {
            localStorage.setItem('structuro_user_name', profileName);
            const first = getFirstName(profileName);
            if (first) {
              setUserName(first);
              setShowNamePrompt(false);
              return;
            }
          }
        }

        const metaFullName =
          (session?.user?.user_metadata as any)?.full_name ??
          (session?.user?.user_metadata as any)?.fullName ??
          (session?.user?.user_metadata as any)?.full_name_string;

        if (typeof metaFullName === 'string' && metaFullName.trim()) {
          const trimmed = metaFullName.trim();
          localStorage.setItem('structuro_user_name', trimmed);
          const first = getFirstName(trimmed);
          if (first) {
            setUserName(first);
            setShowNamePrompt(false);
            return;
          }
        }
      } catch {
        // ignore: we tonen dan gewoon de prompt
      }

      setShowNamePrompt(true);
    })();
  }, []);

  const handleSaveName = async () => {
    if (!newName.trim()) return;

    try {
      const trimmed = newName.trim();
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user ?? null;

      if (user?.id) {
        const { error } = await persistPreferredDisplayName(user, trimmed);
        if (error) {
          toast(t('home.toastNameFail', { detail: String(error) }));
          return;
        }
      } else if (typeof window !== 'undefined') {
        localStorage.setItem('structuro_user_name', trimmed);
      }

      const first = getFirstName(trimmed);
      if (first) setUserName(first);
      setShowNamePrompt(false);
      setNewName('');
    } catch (error: unknown) {
      console.error('Unexpected error saving name:', error);
      toast(
        t('home.toastUnexpected', {
          detail:
            error instanceof Error ? error.message : t('home.toastUnknown'),
        })
      );
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('home.greetingMorning');
    if (hour < 18) return t('home.greetingAfternoon');
    return t('home.greetingEvening');
  };

  // Helper: Haal energie-status op van vandaag (useCheckIn levert al vandaag)
  const getTodayEnergyStatus = () => {
    if (typeof window === 'undefined' || !isClient) return null;
    if (!todayCheckIn?.energy_level) return null;
    return todayCheckIn.energy_level; // 'low', 'medium', of 'high'
  };

  // Helper: Haal energie-status label op (zonder badge styling)
  const getEnergyStatusLabel = () => {
    const energyLevel = getTodayEnergyStatus();
    if (!energyLevel) return null;

    if (energyLevel === 'low') {
      return t('home.energyLow');
    } else if (energyLevel === 'medium') {
      return t('home.energyMedium');
    }
    return t('home.energyHigh');
  };

  const energyForPill = getTodayEnergyStatus();
  /** Doctrine mock: zachte pill, bold label; normaal = amber crème / gouden rand / diep oker */
  const energyPillClass =
    energyForPill === 'low'
      ? 'border-slate-200 bg-slate-50 text-slate-800'
      : energyForPill === 'high'
        ? 'border-violet-200 bg-violet-50 text-violet-900'
        : energyForPill === 'medium'
          ? 'border-amber-200 bg-amber-50 text-amber-900'
          : '';

  const welcomeMessages = locale === 'en' ? homeWelcomeEn : homeWelcomeNl;

  const getWelcomeMessage = () => {
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 0).getTime();
    const dayOfYear = Math.floor((today.getTime() - startOfYear) / (1000 * 60 * 60 * 24));
    return welcomeMessages[dayOfYear % welcomeMessages.length];
  };

  const heroMicroSteps: MicroStep[] = useMemo(() => {
    if (!findLowestEnergyTask) return [];
    return normalizeMicroSteps(findLowestEnergyTask.microSteps);
  }, [findLowestEnergyTask]);

  const heroMicroActiveIdx = useMemo(() => {
    const i = heroMicroSteps.findIndex((s) => !s.done);
    return i === -1 ? heroMicroSteps.length : i;
  }, [heroMicroSteps]);

  const addHeroMicroStep = async () => {
    if (!findLowestEnergyTask) return;
    const title = heroMicroDraft.trim();
    if (!title) {
      toast(t('tasks.toastMiniFill'));
      return;
    }
    setHeroMicroSaving(true);
    try {
      const existing = normalizeMicroSteps(findLowestEnergyTask.microSteps);
      const next: MicroStep[] = [
        ...existing,
        {
          id: microStepId(),
          title,
          minutes: null,
          difficulty: null,
          done: false,
        },
      ];
      await updateTask(findLowestEnergyTask.id, { microSteps: next });
      setHeroMicroDraft('');
      toast(t('tasks.toastMiniAdded'));
    } catch (e) {
      console.error(e);
      toast(t('tasks.toastAddErr'));
    } finally {
      setHeroMicroSaving(false);
    }
  };

  const toggleHeroMicroStep = async (stepId: string) => {
    if (!findLowestEnergyTask) return;
    const steps = normalizeMicroSteps(findLowestEnergyTask.microSteps);
    const next = steps.map((s) => (s.id === stepId ? { ...s, done: !s.done } : s));
    try {
      await updateTask(findLowestEnergyTask.id, { microSteps: next });
    } catch (e) {
      console.error(e);
      toast(t('tasks.toastAddErr'));
    }
  };

  const devResetToolbarOn =
    process.env.NEXT_PUBLIC_STRUCTURO_DEV_RESET === '1';

  const handleReset = () => {
    if (!devResetToolbarOn || isProtectedAccount) return;
    if (confirm(t('home.devConfirmWipe'))) {
      resetAndLoadMockData();
    }
  };

  const handleClearAllTasks = () => {
    if (!devResetToolbarOn || isProtectedAccount) return;
    if (confirm(t('home.devConfirmTasks'))) {
      clearAllTasksOnly();
    }
  };

  return (
    <>
      {devResetToolbarOn && !isProtectedAccount && (
        <div
          style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={handleClearAllTasks}
            style={{
              padding: '8px 16px',
              background: '#DC2626',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            🗑️ {t('home.devClearTasks')}
          </button>
          <button
            type="button"
            onClick={handleReset}
            style={{
              padding: '8px 16px',
              background: '#EF4444',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
            title={t('home.devResetTitle')}
          >
            🔄 {t('home.devResetData')}
          </button>
        </div>
      )}
    <div className="min-h-full bg-[var(--structuro-bg)] px-4 pb-28 pt-4 text-[var(--structuro-text)]">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
        <header className="flex w-full flex-col items-start text-left">
          <p className="text-[13px] font-medium leading-tight text-[#6B7280]">
            {getGreeting()},
          </p>
          <h1 className="mt-1 text-[24px] font-bold leading-tight tracking-tight text-[#111827]">
            {userName || t('home.guestFallback')}
          </h1>
          {getEnergyStatusLabel() && energyPillClass ? (
            <div
              className={`mt-8 inline-flex items-center gap-2 self-start rounded-full border px-4 py-2 text-sm font-bold ${energyPillClass}`}
            >
              {energyForPill === 'low' ? (
                <MoonIcon className="h-5 w-5 shrink-0 opacity-90" strokeWidth={1.75} aria-hidden />
              ) : energyForPill === 'high' ? (
                <BoltIcon className="h-5 w-5 shrink-0 opacity-90" strokeWidth={1.75} aria-hidden />
              ) : (
                <FaceSmileIcon className="h-5 w-5 shrink-0 opacity-90" strokeWidth={1.75} aria-hidden />
              )}
              <span>{getEnergyStatusLabel()}</span>
            </div>
          ) : (
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--structuro-sub)]">
              {getWelcomeMessage()}
            </p>
          )}
        </header>

        {/* Naam prompt modal */}
        {showNamePrompt && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              borderRadius: 16,
              padding: 32,
              maxWidth: 400,
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                {t('home.nameModalTitle')}
              </h3>
              <p style={{ fontSize: 14, color: 'rgba(47,52,65,0.75)', marginBottom: 20 }}>
                {t('home.nameModalBody')}
              </p>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                }}
                placeholder={t('home.nameModalPh')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 8,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  fontSize: 16,
                  marginBottom: 16,
                  outline: 'none'
                }}
                autoFocus
              />
              <button
                onClick={handleSaveName}
                disabled={!newName.trim()}
                style={{
                  width: '100%',
                  padding: '12px 24px',
                  borderRadius: 16,
                  border: 'none',
                  background: newName.trim() ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : '#E6E8EE',
                  color: newName.trim() ? 'white' : 'rgba(47,52,65,0.5)',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: newName.trim() ? 'pointer' : 'not-allowed',
                  boxShadow: newName.trim() ? '0 2px 8px rgba(59, 130, 246, 0.3)' : 'none'
                }}
              >
                {t('home.nameSave')}
              </button>
            </div>
          </div>
        )}


        {findLowestEnergyTask && (
          <section className="rounded-[20px] bg-[var(--structuro-dark)] p-5 shadow-[0_16px_40px_rgba(15,23,42,0.2)]">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--structuro-green)]">
              {t('home.nowUp')}
            </div>
            <h2 className="mb-1 text-[20px] font-bold leading-snug tracking-tight text-white">
              {findLowestEnergyTask.title}
            </h2>
            <p className="text-[13px] text-[var(--structuro-dark-sub)]">
              {t('home.coreFocus')} · {findLowestEnergyTask.duration || findLowestEnergyTask.estimatedDuration || 15}{' '}
              {t('home.min')}
            </p>

            <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.04] px-[18px] py-3.5">
              <div className="mb-3 flex items-center gap-2">
                <svg
                  className="h-3.5 w-3.5 shrink-0 text-violet-400/90"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M12 2 2 7l10 5 10-5-10-5z" />
                  <path d="m2 17 10 5 10-5" />
                  <path d="m2 12 10 5 10-5" />
                </svg>
                <span className="min-w-0 flex-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">
                  {t('focus.microTitle')}
                </span>
                <button
                  type="button"
                  className="shrink-0 rounded-lg p-1 text-[#64748B] transition-colors hover:bg-white/5 hover:text-[#94A3B8] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50"
                  title={t('focus.microHint')}
                  aria-label={t('focus.microHint')}
                >
                  <InformationCircleIcon className="h-4 w-4" aria-hidden />
                </button>
              </div>

              {heroMicroSteps.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {heroMicroSteps.map((step, idx) => {
                    const isDone = Boolean(step.done);
                    const isActive = !isDone && idx === heroMicroActiveIdx;
                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => void toggleHeroMicroStep(step.id)}
                        className={`flex w-full items-center gap-2.5 rounded-[10px] px-0 py-1.5 text-left transition-colors ${
                          isActive
                            ? 'border border-violet-400/30 bg-violet-500/15 -mx-1 px-3 py-2'
                            : 'border border-transparent'
                        }`}
                      >
                        {isDone ? (
                          <>
                            <svg
                              className="h-4 w-4 shrink-0 text-[#22c55e]"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden
                            >
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                              <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                            <span className="text-[13.5px] text-[#94A3B8] line-through">{step.title}</span>
                          </>
                        ) : isActive ? (
                          <>
                            <div className="h-4 w-4 shrink-0 rounded-full border-2 border-violet-400" />
                            <span className="text-[13.5px] font-semibold text-white">{step.title}</span>
                          </>
                        ) : (
                          <>
                            <div className="h-4 w-4 shrink-0 rounded-full border-2 border-[#64748B]" />
                            <span className="text-[13.5px] text-[#94A3B8]">{step.title}</span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <div className="mt-3 flex items-center gap-2">
                <label htmlFor="home-hero-micro" className="sr-only">
                  {t('focus.microPh')}
                </label>
                <input
                  id="home-hero-micro"
                  type="text"
                  value={heroMicroDraft}
                  onChange={(e) => setHeroMicroDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void addHeroMicroStep();
                    }
                  }}
                  disabled={heroMicroSaving}
                  placeholder={t('focus.microPh')}
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-[#64748B] focus:border-violet-400/40 focus:outline-none focus:ring-1 focus:ring-violet-500/30 disabled:opacity-50"
                  autoComplete="off"
                  enterKeyHint="done"
                />
                <button
                  type="button"
                  onClick={() => void addHeroMicroStep()}
                  disabled={heroMicroSaving || !heroMicroDraft.trim()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lg font-light text-white transition hover:bg-white/15 disabled:opacity-40"
                  aria-label={t('tasks.microAdd')}
                >
                  +
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                await updateTask(findLowestEnergyTask.id, { started: true });
                const mins =
                  getTaskDurationMinutes(findLowestEnergyTask) ?? 15;
                router.push(
                  `/focus?task=${encodeURIComponent(findLowestEnergyTask.id)}&duration=${mins}`
                );
              }}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--structuro-green)] py-3.5 text-[15px] font-bold text-white shadow-[0_8px_20px_rgba(34,197,94,0.35)] transition hover:bg-[var(--structuro-green-hover)]"
            >
              <PlayIcon className="h-4 w-4 shrink-0" aria-hidden />
              {t('home.startFocus')}
            </button>
          </section>
        )}

        {!loading && allNonMedicationDone && (
          <section className="mt-2">
            <div className="bg-white rounded-2xl p-6 text-center space-y-2 shadow-sm mt-4">
              <div className="text-3xl">✅</div>
              <p className="font-semibold text-gray-900">{t('home.allDoneTitle')}</p>
              <p className="text-sm text-gray-400">
                {t('home.allDoneHint')}
              </p>
            </div>
          </section>
        )}

        {/* Geen openstaande “stille” taken: eerste stap / backlog leeg (niet hetzelfde als alles klaar) */}
        {!loading &&
          !allNonMedicationDone &&
          tasks.filter(
            (t) => t.source !== 'medication' && !t.done && !t.started
          ).length === 0 && (
          <section style={designSystem.section}>
            <div style={{
              background: '#F0F9FF',
              borderRadius: 24,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              padding: 32,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 32, marginBottom: 16 }}>✨</div>
              <div style={{ 
                fontSize: 18, 
                fontWeight: 700, 
                color: '#111827',
                marginBottom: 8
              }}>
                {t('home.emptyTitle')}
              </div>
              <div style={{ 
                fontSize: 14, 
                color: '#6B7280',
                marginBottom: 20
              }}>
                {t('home.emptyHint')}
              </div>
              <button
                onClick={() => router.push('/todo')}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 16,
                  padding: '12px 24px',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.35)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {t('home.emptyCta')}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
    </>
  );
}
