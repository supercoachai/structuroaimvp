"use client";

import { useState, useEffect, useMemo } from 'react';
import { CheckCircleIcon, PlayIcon } from '@heroicons/react/24/outline';
import { SunMedium } from 'lucide-react';
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
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [userName, setUserName] = useState<string | null>(null);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [newName, setNewName] = useState('');
  const [isClient, setIsClient] = useState(false);
  const { updateTask, addTask } = useTaskContext();
  const [dumpInput, setDumpInput] = useState('');
  const [dumpSubmitting, setDumpSubmitting] = useState(false);
  const [isProtectedAccount, setIsProtectedAccount] = useState(false);

  // Huidige kalenderdag – wordt elke minuut geüpdatet zodat "vandaag voltooid" na 0:00 opnieuw op 0 staat
  const [todayKey, setTodayKey] = useState(() => new Date().toDateString());
  useEffect(() => {
    const interval = setInterval(() => {
      const next = new Date().toDateString();
      setTodayKey((prev) => (next !== prev ? next : prev));
    }, 60 * 1000); // elke minuut checken
    return () => clearInterval(interval);
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

  // Check of laagste-energie-pad actief moet zijn - altijd tonen als er een taak is
  const shouldShowLowestEnergyPath = useMemo(() => {
    // Toon altijd als er een taak is om te tonen
    return true;
  }, []);

  useEffect(() => {
    if (loading) return;
    try {
      const recentCompleted = tasks
        .filter(task => task.done && task.completedAt && new Date(task.completedAt).toDateString() === todayKey)
        .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
        .slice(0, 3);
      setRecentTasks(recentCompleted);
    } catch (error) {
      console.error('Error building recent tasks:', error);
    }
  }, [tasks, loading, todayKey]);

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
      return 'Rustige modus';
    } else if (energyLevel === 'medium') {
      return 'In balans';
    } else { // high
      return 'Volle focus';
    }
  };

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

  const getDailyQuote = () => {
    // Gebruik de dag van het jaar als seed voor consistente dagelijkse quotes
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 0).getTime();
    const dayOfYear = Math.floor((today.getTime() - startOfYear) / (1000 * 60 * 60 * 24));
    return adhdQuotes[dayOfYear % adhdQuotes.length];
  };

  // DEBUG: Reset functie (alleen in development)
  const handleReset = () => {
    if (confirm('Weet je zeker dat je alle data wilt wissen? Dit kan niet ongedaan worden gemaakt.')) {
      resetAndLoadMockData();
    }
  };

  // Verwijder ALLEEN taken (schone start)
  const handleClearAllTasks = () => {
    if (confirm('Weet je zeker dat je ALLE taken wilt verwijderen? Dit kan niet ongedaan worden gemaakt. Je kunt daarna zelf handmatig taken toevoegen.')) {
      clearAllTasksOnly();
    }
  };

  return (
    <>
      {/* DEBUG: Reset knoppen (alleen in development, niet voor beschermd testaccount) */}
      {process.env.NODE_ENV === 'development' && !isProtectedAccount && (
        <div style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 8
        }}>
          <button
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
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}
          >
            🗑️ Verwijder ALLE taken
          </button>
          <button
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
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
            title="Reset alle data (development only)"
          >
            🔄 Reset Data
          </button>
        </div>
      )}
    <div
      className="min-h-full px-4 sm:px-6 pt-14 sm:pt-16 pb-6 sm:pb-8"
      style={{
        background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
        color: designSystem.colors.text,
      }}
    >
      <div
        className="dashboard-inner"
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          boxSizing: 'border-box',
        }}
      >
        <header className="mb-10 flex w-full flex-col items-start text-left sm:mb-12">
          <div
            className="mb-5 flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)',
            }}
          >
            <SunMedium size={28} strokeWidth={1.5} color="#fff" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 sm:text-3xl">
            {getGreeting()}{userName ? `, ${userName}` : ''}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            {(() => {
              const energyStatus = getEnergyStatusLabel();
              if (energyStatus) {
                const emoji = energyStatus === 'Volle focus' ? '⚡' : energyStatus === 'Rustige modus' ? '😴' : '🙂';
                const accentColor = energyStatus === 'Volle focus' ? '#B45309' : energyStatus === 'Rustige modus' ? '#0369A1' : '#15803D';
                return (
                  <>
                    Elke dag telt. Vandaag werk je met{' '}
                    <span style={{ fontWeight: 700, color: accentColor }}>
                      {energyStatus} {emoji}
                    </span>
                  </>
                );
              }
              return getWelcomeMessage();
            })()}
          </p>
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


        {/* Focus kaart – zen, uitnodigend, niet dwingend */}
        {shouldShowLowestEnergyPath && findLowestEnergyTask && (
          <section>
            <div className="bg-white shadow-sm rounded-3xl p-6 sm:p-8">
              <div className="text-sm font-medium text-slate-500 mb-2" style={{ letterSpacing: '0.3px' }}>
                Huidige focus
              </div>
              <div className="text-lg font-semibold text-slate-800 mb-1" style={{ lineHeight: 1.4 }}>
                {findLowestEnergyTask.title}
              </div>
              <div className="text-sm text-slate-500 mb-5" style={{ lineHeight: 1.5 }}>
                {findLowestEnergyTask.duration || findLowestEnergyTask.estimatedDuration || 15} min
              </div>
              <button
                type="button"
                onClick={async () => {
                  await updateTask(findLowestEnergyTask.id, { started: true });
                  router.push(`/focus?task=${findLowestEnergyTask.id}`);
                }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors"
              >
                <PlayIcon className="w-4 h-4 flex-shrink-0" aria-hidden />
                Start
              </button>
            </div>
          </section>
        )}


        {/* Recent voltooid */}
        {recentTasks.length > 0 && (
          <section className="mt-7">
            <div style={{ ...designSystem.typography.h3, marginBottom: designSystem.spacing.md }}>Recent voltooid</div>
            <div style={{ display: "grid", gap: 12 }}>
              {recentTasks.map((task) => (
                <div 
                  key={task.id} 
                  className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3"
                >
                  <CheckCircleIcon style={{ width: designSystem.icon.small, height: designSystem.icon.small, color: designSystem.colors.success, flexShrink: 0 }} />
                  <div style={{ flex: 1, ...designSystem.typography.body }}>{task.title}</div>
                  <div style={designSystem.typography.bodySmall}>
                    {task.completedAt ? new Date(task.completedAt).toLocaleDateString('nl-NL', { 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : ''}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Uit je hoofd – snel noteren */}
        <section style={designSystem.section}>
          <div style={{
            background: '#fff',
            borderRadius: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            padding: 20,
          }}>
            <div style={{
              fontSize: 15,
              fontWeight: 600,
              color: '#334155',
              marginBottom: 4,
            }}>
              Uit je hoofd
            </div>
            <p style={{
              fontSize: 13,
              color: '#64748B',
              marginBottom: 14,
              lineHeight: 1.45,
            }}>
              Noteer taken of ideeën die nu in je hoofd zitten – je kunt ze later indelen.
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const title = dumpInput.trim();
                if (!title || dumpSubmitting) return;
                setDumpSubmitting(true);
                try {
                  await addTask({
                    title,
                    done: false,
                    started: false,
                    priority: null,
                    notToday: false,
                    source: 'parked_thought',
                  });
                  setDumpInput('');
                  toast('Toegevoegd bij geparkeerde gedachten');
                } catch {
                  toast('Kon niet toevoegen');
                } finally {
                  setDumpSubmitting(false);
                }
              }}
              style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}
            >
              <input
                type="text"
                value={dumpInput}
                onChange={(e) => setDumpInput(e.target.value)}
                placeholder="Bijv. boodschappen, mail beantwoorden, …"
                style={{
                  flex: 1,
                  minWidth: 180,
                  padding: '12px 14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  borderRadius: 16,
                  fontSize: 14,
                  color: '#334155',
                  background: 'white',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={!dumpInput.trim() || dumpSubmitting}
                style={{
                  padding: '12px 24px',
                  background: dumpInput.trim() && !dumpSubmitting ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : '#CBD5E1',
                  color: 'white',
                  border: 'none',
                  borderRadius: 16,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: dumpInput.trim() && !dumpSubmitting ? 'pointer' : 'not-allowed',
                }}
              >
                {dumpSubmitting ? 'Bezig…' : 'Toevoegen'}
              </button>
            </form>
          </div>
        </section>

        {/* Lege staat: altijd concrete suggestie tonen */}
        {tasks.filter(t => t.source !== 'medication' && !t.done && !t.started).length === 0 && (
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
