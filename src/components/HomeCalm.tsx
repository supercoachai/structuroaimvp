"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  InformationCircleIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import EnergyIcon, { type EnergyIconKind } from '@/components/structuro/EnergyIcon';
import { normalizeMicroSteps, microStepId, type MicroStep } from '@/lib/microSteps';
import { getTaskDurationMinutes } from '@/lib/taskDurationMinutes';
import { useRouter } from 'next/navigation';
import { useTaskContext, Task } from '../context/TaskContext';
import { designSystem } from '../lib/design-system';
import { toast } from './Toast';
import { useCheckIn } from '../hooks/useCheckIn';
import { resetAndLoadMockData, clearAllTasksOnly } from '../lib/resetStorage';
import { restartDagstartForDev } from '@/lib/devRestartDagstart';
import { createClient } from '@/lib/supabase/client';
import { isProtectedTestAccount } from '@/lib/protectedTestAccount';
import { persistPreferredDisplayName } from '@/lib/accountDisplayName';
import { useI18n } from '@/lib/i18n';
import HomeTodayProgress from '@/components/home/HomeTodayProgress';
import {
  getOpenTop3Tasks,
  getTop3SlotPosition,
  maxSlotsForEnergy,
} from '@/lib/top3CurrentTask';
import { getTodayMinutesProgress } from '@/lib/homeTodayProgress';
import { getDayStartTimeOfDay } from '@/lib/dayStartGreeting';
import FocusMicroStepsCard from '@/components/focus/FocusMicroStepsCard';
import ShutdownPromptInline, {
  isShutdownPromptDismissedToday,
} from '@/components/shutdown/ShutdownPromptInline';
import { captureProductEvent } from '@/lib/posthog/track';
import { ANALYTICS_EVENTS } from '@/lib/analytics-events';

export default function HomeCalm() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { tasks, loading, updateTask, fetchTasks } = useTaskContext();
  const { checkIn: todayCheckIn, loading: checkInLoading } = useCheckIn();
  const [userName, setUserName] = useState<string | null>(null);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [newName, setNewName] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [isProtectedAccount, setIsProtectedAccount] = useState(false);
  const [heroMicroDraft, setHeroMicroDraft] = useState('');
  const [heroMicroSaving, setHeroMicroSaving] = useState(false);
  const [heroTaskIndex, setHeroTaskIndex] = useState(0);
  const [dateTimeLine, setDateTimeLine] = useState('');
  const [greetingWord, setGreetingWord] = useState('');

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

  const [showShutdownPrompt, setShowShutdownPrompt] = useState(false);
  const prevOpenTop3CountRef = useRef<number | null>(null);

  const dashboardReady = !loading && !checkInLoading;

  const openTop3Tasks = useMemo(
    () => getOpenTop3Tasks(tasks, todayCheckIn),
    [tasks, todayCheckIn]
  );

  useEffect(() => {
    const ids = todayCheckIn?.top3_task_ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      prevOpenTop3CountRef.current = openTop3Tasks.length;
      return;
    }
    const openCount = openTop3Tasks.length;
    const prev = prevOpenTop3CountRef.current;
    prevOpenTop3CountRef.current = openCount;

    if (
      prev === 1 &&
      openCount === 0 &&
      !isShutdownPromptDismissedToday()
    ) {
      setShowShutdownPrompt(true);
      captureProductEvent(ANALYTICS_EVENTS.shutdown_prompt_shown, {
        source: "last_task_complete",
      });
    }
  }, [openTop3Tasks.length, todayCheckIn?.top3_task_ids]);

  useEffect(() => {
    setHeroTaskIndex(0);
  }, [openTop3Tasks.map((t) => t.id).join('|')]);

  const heroTask = openTop3Tasks[heroTaskIndex % Math.max(openTop3Tasks.length, 1)] ?? null;

  const todaySlotProgress = useMemo(() => {
    const ids = todayCheckIn?.top3_task_ids;
    if (!Array.isArray(ids) || ids.length === 0) return null;
    const total = maxSlotsForEnergy(todayCheckIn?.energy_level);
    if (heroTask) {
      const pos = getTop3SlotPosition(heroTask.id, todayCheckIn);
      if (pos) return pos;
    }
    const openCount = openTop3Tasks.length;
    if (openCount === 0) return { current: total, total };
    return { current: total - openCount + 1, total };
  }, [heroTask, todayCheckIn, openTop3Tasks.length]);

  const todayMinutesProgress = useMemo(
    () => getTodayMinutesProgress(tasks, todayCheckIn, heroTask?.id),
    [tasks, todayCheckIn, heroTask?.id]
  );

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

  useEffect(() => {
    const format = () => {
      const now = new Date();
      const loc = locale === 'en' ? 'en-GB' : 'nl-NL';
      const weekday = now.toLocaleDateString(loc, {
        weekday: 'long',
        timeZone: 'Europe/Amsterdam',
      });
      const timePart = now.toLocaleTimeString(loc, {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Amsterdam',
      });
      const cap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
      setDateTimeLine(`${cap} · ${timePart}`);

      const period = getDayStartTimeOfDay(now);
      if (period === 'morning') setGreetingWord(t('home.greetingMorning'));
      else if (period === 'afternoon') setGreetingWord(t('home.greetingAfternoon'));
      else setGreetingWord(t('home.greetingEvening'));
    };
    format();
    const id = window.setInterval(format, 30_000);
    return () => window.clearInterval(id);
  }, [locale, t]);

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
  const energyPillIconKind: EnergyIconKind | null =
    energyForPill === 'low' ? 'low' : energyForPill === 'high' ? 'high' : energyForPill === 'medium' ? 'medium' : null;

  const heroMicroSteps: MicroStep[] = useMemo(() => {
    if (!heroTask) return [];
    return normalizeMicroSteps(heroTask.microSteps);
  }, [heroTask]);

  const heroMicroActiveIdx = useMemo(() => {
    const i = heroMicroSteps.findIndex((s) => !s.done);
    return i === -1 ? heroMicroSteps.length : i;
  }, [heroMicroSteps]);

  const addHeroMicroStep = async () => {
    if (!heroTask) return;
    const title = heroMicroDraft.trim();
    if (!title) {
      toast(t('tasks.toastMiniFill'));
      return;
    }
    setHeroMicroSaving(true);
    try {
      const existing = normalizeMicroSteps(heroTask.microSteps);
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
      await updateTask(heroTask.id, { microSteps: next });
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
    if (!heroTask) return;
    const steps = normalizeMicroSteps(heroTask.microSteps);
    const next = steps.map((s) => (s.id === stepId ? { ...s, done: !s.done } : s));
    try {
      await updateTask(heroTask.id, { microSteps: next });
    } catch (e) {
      console.error(e);
      toast(t('tasks.toastAddErr'));
    }
  };

  const applyHeroAiMicroSteps = async (steps: MicroStep[]) => {
    if (!heroTask) return;
    setHeroMicroSaving(true);
    try {
      await updateTask(heroTask.id, { microSteps: steps });
    } catch (e) {
      console.error(e);
      toast(t('tasks.toastAddErr'));
      throw e;
    } finally {
      setHeroMicroSaving(false);
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

  const handleRestartDagstart = () => {
    if (!devResetToolbarOn) return;
    void restartDagstartForDev();
  };

  return (
    <>
      {devResetToolbarOn && (
        <div className="home-dev-toolbar fixed z-[9999] flex flex-col gap-1.5">
          <button
            type="button"
            onClick={handleRestartDagstart}
            className="rounded-lg border-0 bg-[#2563EB] font-semibold text-white shadow-md"
            title={t('home.devRestartDagstartTitle')}
          >
            ☀️ {t('home.devRestartDagstart')}
          </button>
          {!isProtectedAccount ? (
            <>
              <button
                type="button"
                onClick={handleClearAllTasks}
                className="rounded-lg border-0 bg-[#DC2626] font-semibold text-white shadow-md"
              >
                🗑️ {t('home.devClearTasks')}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-lg border-0 bg-[#EF4444] font-semibold text-white shadow-md"
                title={t('home.devResetTitle')}
              >
                🔄 {t('home.devResetData')}
              </button>
            </>
          ) : null}
        </div>
      )}
      <div className="home-screen flex min-h-0 flex-1 flex-col text-[var(--st-ink)]">
        <div className="home-screen__fit-viewport">
          <div className="home-screen__fit-content px-5 pt-3 pb-1">
            <div className="home-screen__main-column mx-auto w-full max-w-md">
        {showShutdownPrompt ? (
          <ShutdownPromptInline onDismiss={() => setShowShutdownPrompt(false)} />
        ) : null}
        <header className="w-full shrink-0">
          <p
            className="home-screen__greeting-sub"
            style={{
              fontWeight: 400,
              color: 'var(--st-muted)',
              marginBottom: 2,
            }}
            suppressHydrationWarning
          >
            {greetingWord ? `${greetingWord},` : '\u00A0'}
          </p>
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <h1
              className="home-screen__greeting-name min-w-0 flex-1"
              style={{
                fontWeight: 700,
                letterSpacing: '-0.025em',
                lineHeight: 1.05,
                color: 'var(--st-ink)',
              }}
            >
              {userName || t('home.guestFallback')}
            </h1>
            {getEnergyStatusLabel() ? (
              <div
                className="st-pill inline-flex shrink-0 items-center gap-2 border bg-white"
                style={{
                  borderColor: 'var(--st-line-strong)',
                  color: 'var(--st-ink-soft)',
                  padding: '6px 12px',
                }}
              >
                {energyPillIconKind ? (
                  <EnergyIcon kind={energyPillIconKind} size={16} color="var(--st-ink-soft)" />
                ) : null}
                <span style={{ fontSize: 13, fontWeight: 500 }}>{getEnergyStatusLabel()}</span>
              </div>
            ) : null}
          </div>
          {isClient && dateTimeLine ? (
            <p
              className="font-mono"
              style={{
                fontSize: 13,
                fontWeight: 400,
                color: 'var(--st-muted-2)',
                marginTop: 6,
              }}
            >
              {dateTimeLine}
            </p>
          ) : null}
        </header>

        {todaySlotProgress && todayMinutesProgress ? (
          <div className="home-screen__progress shrink-0">
            <HomeTodayProgress
            current={todaySlotProgress.current}
            total={todaySlotProgress.total}
            doneMinutes={todayMinutesProgress.done}
            totalMinutes={todayMinutesProgress.total}
            todayLabel={t('home.todayProgress', {
              current: String(todaySlotProgress.current),
              total: String(todaySlotProgress.total),
            })}
            minutesLabel={t('home.minutesProgress', {
              done: String(todayMinutesProgress.done),
              total: String(todayMinutesProgress.total),
            })}
          />
          </div>
        ) : null}

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


        {dashboardReady && heroTask && (
          <section
            className="home-screen__hero rounded-[20px] text-white"
            style={{
              background: 'var(--st-night)',
              boxShadow:
                '0 1px 0 rgba(255,255,255,0.04) inset, 0 20px 44px -16px rgba(14,23,48,0.35), 0 28px 60px -28px rgba(45,91,251,0.20)',
            }}
          >
            <div className="mb-2.5 flex shrink-0 items-center justify-between gap-2">
              <span
                className="inline-flex items-center gap-2"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  color: 'var(--st-green)',
                }}
              >
                <span
                  className="home-screen__now-dot"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'var(--st-green)',
                  }}
                  aria-hidden
                />
                {t('home.nowUp')}
              </span>
              <span
                className="st-mono"
                style={{
                  fontSize: 12,
                  color: 'var(--st-night-muted)',
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--st-night-line)',
                }}
              >
                {heroTask.duration || heroTask.estimatedDuration || 15} {t('home.min')} ·{' '}
                {t('home.coreFocus')}
              </span>
            </div>
            <h2 className="home-screen__hero-title shrink-0 font-semibold leading-snug tracking-tight">
              {heroTask.title}
            </h2>

            <FocusMicroStepsCard
              taskId={heroTask.id}
              taskTitle={heroTask.title}
              steps={heroMicroSteps}
              activeStepIdx={heroMicroActiveIdx}
              energyLevel={heroTask.energyLevel}
              durationMin={getTaskDurationMinutes(heroTask)}
              inlineNewStep={heroMicroDraft}
              onInlineNewStepChange={setHeroMicroDraft}
              onInlineAddStep={() => void addHeroMicroStep()}
              onToggleStep={(stepId) => void toggleHeroMicroStep(stepId)}
              onApplyAiSteps={applyHeroAiMicroSteps}
              inputDisabled={heroMicroSaving}
              aiDisabled={heroMicroSaving}
              inputPlaceholder={t('home.microStepsAdd')}
              className="home-screen__hero-micro-card rounded-2xl border border-white/[0.07] bg-white/[0.04]"
              headerAction={
                <button
                  type="button"
                  className="shrink-0 rounded-lg p-1 text-[#64748B] transition-colors hover:bg-white/5 hover:text-[#94A3B8] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50"
                  title={t('focus.microHint')}
                  aria-label={t('focus.microHint')}
                >
                  <InformationCircleIcon className="h-4 w-4" aria-hidden />
                </button>
              }
            />

            <div className="home-screen__hero-actions">
            <button
              type="button"
              onClick={async () => {
                await updateTask(heroTask.id, { started: true });
                const mins =
                  getTaskDurationMinutes(heroTask) ?? 15;
                router.push(
                  `/focus?task=${encodeURIComponent(heroTask.id)}&duration=${mins}`
                );
              }}
              className="home-screen__start-btn home-screen__start-btn--invite st-btn-primary st-btn-success w-full border-0"
            >
              <PlayIcon className="h-4 w-4 shrink-0" aria-hidden />
              {t('home.startFocus')}
            </button>

            {openTop3Tasks.length > 1 ? (
              <button
                type="button"
                onClick={() =>
                  setHeroTaskIndex((prev) => (prev + 1) % openTop3Tasks.length)
                }
                className="mt-3 w-full border-0 bg-transparent text-center"
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'var(--st-night-muted)',
                }}
              >
                {t('home.pickOtherTask')}
              </button>
            ) : null}
            </div>
          </section>
        )}

        {!dashboardReady && (
          <div
            className="mx-auto w-full max-w-md shrink-0 rounded-[20px] bg-white/80 px-6 py-10 text-center text-sm text-[var(--st-muted)] shadow-sm animate-pulse"
            aria-busy="true"
          >
            {t('tasks.loadingOpen')}
          </div>
        )}

        {dashboardReady && allNonMedicationDone && (
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

        {dashboardReady &&
          !heroTask &&
          !allNonMedicationDone &&
          (todayCheckIn?.top3_task_ids?.length ?? 0) > 0 &&
          !tasks.some(t => todayCheckIn?.top3_task_ids?.includes(t.id)) && (
          <section className="mt-2">
            <div className="mx-auto max-w-md rounded-2xl border border-amber-200 bg-amber-50/80 p-5 text-center shadow-sm">
              <p className="text-sm font-semibold text-amber-900">
                {t('home.top3MissingTitle')}
              </p>
              <p className="mt-1 text-sm text-amber-800/90">
                {t('home.top3MissingHint')}
              </p>
              <button
                type="button"
                onClick={() => {
                  void fetchTasks();
                  window.dispatchEvent(new CustomEvent('structuro_checkin_updated'));
                }}
                className="mt-4 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
              >
                {t('home.top3MissingRetry')}
              </button>
            </div>
          </section>
        )}

        {/* Geen openstaande "stille" taken: eerste stap / backlog leeg (niet hetzelfde als alles klaar) */}
        {dashboardReady &&
          !heroTask &&
          !allNonMedicationDone &&
          (todayCheckIn?.top3_task_ids?.length ?? 0) === 0 &&
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
        </div>
      </div>
    </>
  );
}
