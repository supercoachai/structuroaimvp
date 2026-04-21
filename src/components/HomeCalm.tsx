"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  BoltIcon,
  CheckCircleIcon,
  FaceSmileIcon,
  MoonIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import { normalizeMicroSteps, type MicroStep } from '@/lib/microSteps';
import { useRouter } from 'next/navigation';
import { useTaskContext, Task } from '../context/TaskContext';
import { designSystem } from '../lib/design-system';
import { toast } from './Toast';
import { useCheckIn } from '../hooks/useCheckIn';
import { resetAndLoadMockData, clearAllTasksOnly } from '../lib/resetStorage';
import { createClient } from '@/lib/supabase/client';
import { isProtectedTestAccount } from '@/lib/protectedTestAccount';
export default function HomeCalm() {
  const router = useRouter();
  const { tasks, loading } = useTaskContext();
  const { checkIn: todayCheckIn } = useCheckIn();
  const [userName, setUserName] = useState<string | null>(null);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [newName, setNewName] = useState('');
  const [isClient, setIsClient] = useState(false);
  const { updateTask } = useTaskContext();
  const [isProtectedAccount, setIsProtectedAccount] = useState(false);

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

  // Haal gebruikersnaam op bij mount (uit localStorage, fallback naar Supabase auth metadata)
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

    // Fallback: naam uit Supabase user_metadata (zodat je na opnieuw inloggen niet opnieuw hoeft in te vullen).
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        const metaFullName =
          (data?.user?.user_metadata as any)?.full_name ??
          (data?.user?.user_metadata as any)?.fullName ??
          (data?.user?.user_metadata as any)?.full_name_string;

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

      // Sla naam op in localStorage
      if (typeof window !== 'undefined') localStorage.setItem('structuro_user_name', trimmed);

      // UI direct bijwerken
      const first = getFirstName(trimmed);
      if (first) setUserName(first);
      setShowNamePrompt(false);
      setNewName('');

      // Schrijf ook naar Supabase auth metadata zodat het blijft werken over meerdere logins/devices.
      // Best-effort: als dit faalt, werkt localStorage nog steeds.
      try {
        const supabase = createClient();
        await supabase.auth.updateUser({ data: { full_name: trimmed } });
      } catch {
        // ignore
      }
    } catch (error: any) {
      console.error('Unexpected error saving name:', error);
      alert(`Onverwachte fout: ${error?.message || 'Onbekende fout'}`);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Goedemorgen";
    if (hour < 18) return "Goedemiddag";
    return "Goedenavond";
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
      return 'Energie laag';
    } else if (energyLevel === 'medium') {
      return 'Energie normaal';
    }
    return 'Energie hoog';
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

  // 15 afwisselende welkomstzinnen (zonder emoji's in de tekst zelf)
  const welcomeMessages = [
    "Fijn dat je er bent. Klaar om rustig aan de dag te beginnen?",
    "Welkom terug. Kleine stappen brengen grote rust.",
    "Mooi dat je er weer bent. Vandaag telt elk moment.",
    "Tijd om structuur te brengen in de chaos.",
    "Goed dat je inlogt. Vandaag doen we het stap voor stap.",
    "Rustig hoofd, helder plan. Laten we beginnen.",
    "Vandaag is een nieuwe kans om het overzicht te pakken.",
    "Je doet het goed. Vandaag is weer een stap vooruit.",
    "Klaar om wat meer structuur te vinden?",
    "Goed bezig dat je weer start. Dat is al een overwinning.",
    "Samen maken we er een georganiseerde dag van.",
    "Even op adem komen, dan gefocust verder.",
    "Elke dag telt. Ook de kleine stappen vandaag.",
    "Jij bepaalt het tempo, Structuro helpt je op koers.",
    "Rust. Ritme. Structuur. Vandaag begint weer rustig."
  ];

  const getWelcomeMessage = () => {
    // Gebruik de dag van het jaar als seed voor consistente dagelijkse welkomstzin
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 0).getTime();
    const dayOfYear = Math.floor((today.getTime() - startOfYear) / (1000 * 60 * 60 * 24));
    return welcomeMessages[dayOfYear % welcomeMessages.length];
  };

  // 50 ADHD-gerelateerde motivatie quotes
  const adhdQuotes = [
    "Rustige stappen, helder hoofd.",
    "Eén ding tegelijk is genoeg.",
    "Perfectie is niet het doel, vooruitgang wel.",
    "Kleine stappen zijn ook stappen.",
    "Focus op wat je nu doet, niet op wat nog komt.",
    "Je bent niet te laat, je bent precies op tijd.",
    "Vandaag is een nieuwe kans.",
    "Elke taak begint met één stap.",
    "Rust is ook productiviteit.",
    "Je doet het goed, precies zoals je bent.",
    "Kleine overwinningen tellen mee.",
    "Het is oké om het rustig aan te doen.",
    "Focus op je eigen tempo.",
    "Elke dag is een nieuw begin.",
    "Je bent genoeg, precies zoals je bent.",
    "Kleine stappen leiden tot grote doelen.",
    "Het is oké om pauze te nemen.",
    "Vandaag focus je op wat belangrijk is.",
    "Rust en structuur gaan hand in hand.",
    "Je bent op de goede weg.",
    "Eén taak afmaken is een overwinning.",
    "Kalmte is kracht.",
    "Je doet het in jouw eigen tempo.",
    "Kleine stappen, grote impact.",
    "Focus op het nu, niet op morgen.",
    "Rust is onderdeel van productiviteit.",
    "Je bent precies waar je hoort te zijn.",
    "Elke stap telt, hoe klein ook.",
    "Kalmte helpt je helder te denken.",
    "Je bent niet alleen in deze reis.",
    "Kleine stappen zijn de weg naar succes.",
    "Het is oké om hulp te vragen.",
    "Vandaag doe je wat je kunt.",
    "Rust en focus zijn je vrienden.",
    "Je bent sterker dan je denkt.",
    "Kleine stappen, grote vooruitgang.",
    "Focus op wat je nu kunt doen.",
    "Het is oké om het anders te doen.",
    "Rustige stappen leiden tot resultaten.",
    "Je bent waardevol, precies zoals je bent.",
    "Eén ding tegelijk is de sleutel.",
    "Kalmte helpt je betere keuzes te maken.",
    "Je doet het op jouw manier, en dat is goed.",
    "Kleine stappen, heldere doelen.",
    "Rust is een vorm van zelfzorg.",
    "Focus op vooruitgang, niet op perfectie.",
    "Je bent op je eigen pad, en dat is mooi.",
    "Kleine stappen, grote rust.",
    "Het is oké om het rustig aan te doen.",
    "Vandaag focus je op wat echt belangrijk is."
  ];

  const heroMicroSteps: MicroStep[] = useMemo(() => {
    if (!findLowestEnergyTask) return [];
    return normalizeMicroSteps(findLowestEnergyTask.microSteps);
  }, [findLowestEnergyTask]);

  const getDailyQuote = () => {
    // Gebruik de dag van het jaar als seed voor consistente dagelijkse quotes
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 0).getTime();
    const dayOfYear = Math.floor((today.getTime() - startOfYear) / (1000 * 60 * 60 * 24));
    return adhdQuotes[dayOfYear % adhdQuotes.length];
  };

  const devResetToolbarOn =
    process.env.NEXT_PUBLIC_STRUCTURO_DEV_RESET === '1';

  const handleReset = () => {
    if (!devResetToolbarOn || isProtectedAccount) return;
    if (confirm('Weet je zeker dat je alle data wilt wissen? Dit kan niet ongedaan worden gemaakt.')) {
      resetAndLoadMockData();
    }
  };

  const handleClearAllTasks = () => {
    if (!devResetToolbarOn || isProtectedAccount) return;
    if (confirm('Weet je zeker dat je ALLE taken wilt verwijderen? Dit kan niet ongedaan worden gemaakt. Je kunt daarna zelf handmatig taken toevoegen.')) {
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
            🗑️ Verwijder ALLE taken
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
            title="Reset alle data (alleen development)"
          >
            🔄 Reset Data
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
            {userName || 'daar'}
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
                Welkom bij Structuro! 👋
              </h3>
              <p style={{ fontSize: 14, color: 'rgba(47,52,65,0.75)', marginBottom: 20 }}>
                Hoe wil je dat we je aanspreken?
              </p>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                }}
                placeholder="Je voornaam..."
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
                Opslaan
              </button>
            </div>
          </div>
        )}


        {findLowestEnergyTask && (
          <section className="rounded-[20px] bg-[var(--structuro-dark)] p-5 shadow-[0_16px_40px_rgba(15,23,42,0.2)]">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--structuro-green)]">
              Nu aan zet
            </div>
            <h2 className="mb-1 text-[20px] font-bold leading-snug tracking-tight text-white">
              {findLowestEnergyTask.title}
            </h2>
            <p className="text-[13px] text-[var(--structuro-dark-sub)]">
              Kernfocus · {findLowestEnergyTask.duration || findLowestEnergyTask.estimatedDuration || 15}{' '}
              min
            </p>

            {heroMicroSteps.length > 0 ? (
              <div className="mt-4 flex flex-col gap-2.5 border-t border-white/10 pt-3.5">
                {heroMicroSteps.map((step, idx) => {
                  const done = step.done;
                  const active = !done && heroMicroSteps.slice(0, idx).every((s) => s.done);
                  if (done) {
                    return (
                      <div
                        key={step.id}
                        className="flex items-center gap-2.5 opacity-90"
                      >
                        <CheckCircleIcon className="h-4 w-4 shrink-0 text-[var(--structuro-green)]" aria-hidden />
                        <span className="text-sm text-[var(--structuro-dark-sub)] line-through">
                          {step.title}
                        </span>
                      </div>
                    );
                  }
                  if (active) {
                    return (
                      <div
                        key={step.id}
                        className="-mx-1 flex items-center gap-2.5 rounded-[10px] border border-violet-400/30 bg-violet-500/15 px-3 py-2"
                      >
                        <div className="h-4 w-4 shrink-0 rounded-full border-2 border-violet-400" />
                        <span className="text-sm font-semibold text-white">{step.title}</span>
                      </div>
                    );
                  }
                  return (
                    <div key={step.id} className="flex items-center gap-2.5 opacity-40">
                      <div className="h-4 w-4 shrink-0 rounded-full border-2 border-[var(--structuro-dark-sub)]" />
                      <span className="text-sm text-[var(--structuro-dark-sub)]">{step.title}</span>
                    </div>
                  );
                })}
              </div>
            ) : null}

            <button
              type="button"
              onClick={async () => {
                await updateTask(findLowestEnergyTask.id, { started: true });
                router.push(`/focus?task=${findLowestEnergyTask.id}`);
              }}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--structuro-green)] py-3.5 text-[15px] font-bold text-white shadow-[0_8px_20px_rgba(34,197,94,0.35)] transition hover:bg-[var(--structuro-green-hover)]"
            >
              <PlayIcon className="h-4 w-4 shrink-0" aria-hidden />
              Start focus →
            </button>
          </section>
        )}

        {!loading && allNonMedicationDone && (
          <section className="mt-2">
            <div className="bg-white rounded-2xl p-6 text-center space-y-2 shadow-sm mt-4">
              <div className="text-3xl">✅</div>
              <p className="font-semibold text-gray-900">Alles gedaan voor nu.</p>
              <p className="text-sm text-gray-400">
                Wil je meer doen? Voeg een taak toe via Taken.
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
                Doe dit nu. Klein is genoeg.
              </div>
              <div style={{ 
                fontSize: 14, 
                color: '#6B7280',
                marginBottom: 20
              }}>
                Voeg een kleine taak toe om vandaag te beginnen
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
                + Voeg je eerste taak toe
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
    </>
  );
}
