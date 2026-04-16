"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Layers,
  Moon,
  Smile,
  Star,
  Sun,
  Target,
  Zap,
} from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { persistPreferredDisplayName } from "@/lib/accountDisplayName";
import { setProfileOnboardingCompleted } from "@/lib/onboardingMutations";
import {
  isLocalOnboardingCompleted,
  setLocalOnboardingCompleted,
} from "@/lib/onboardingProfile";
import { clearLocalSessionFresh } from "@/lib/localModeSession";
import {
  hasStructuroLocalModeCookieOnClient,
  setLocalOnboardingDoneCookieOnClient,
} from "@/lib/localOnboardingCookie";

const STEP_COUNT = 8;
const SLIDE_MS = 450;
const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

/** Onboarding stap index van het microstappen-scherm (0-based). */
const MICROSTEP_SLIDE_INDEX = 4;

const MICRO_DEMO_STEPS = [
  "Bureau leegmaken",
  "Kleding in de kast",
  "Vloer stofzuigen",
] as const;

export default function OnboardingFlow() {
  const { user, loading: userLoading } = useUser();
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const touchStartX = useRef<number | null>(null);
  /**
   * Demo-animatie microstappen: 0 = eerste actief, 1..3 = zoveel stappen afgerond, 4 = afronding getoond.
   * Loopt alleen op het microstappen-scherm; reset bij verlaten van die stap.
   */
  const [microDemoStage, setMicroDemoStage] = useState(0);

  const isLocalMode = hasStructuroLocalModeCookieOnClient();

  useEffect(() => {
    if (isLocalMode && isLocalOnboardingCompleted()) {
      setLocalOnboardingDoneCookieOnClient();
      clearLocalSessionFresh();
      window.location.replace("/dagstart");
    }
  }, [isLocalMode]);

  useEffect(() => {
    if (isLocalMode) return;
    if (userLoading) return;
    if (!user?.id) window.location.replace("/login");
  }, [isLocalMode, userLoading, user?.id]);

  useEffect(() => {
    if (step !== 7) return;
    confetti({ particleCount: 70, spread: 65, origin: { y: 0.55 }, colors: ["#22c55e", "#3b82f6", "#a855f7", "#f59e0b"] });
  }, [step]);

  /** Rustige demo: stap voor stap microstappen afvinken, daarna korte “taak af”-visualisatie. */
  useEffect(() => {
    if (step !== MICROSTEP_SLIDE_INDEX) {
      setMicroDemoStage(0);
      return;
    }
    if (typeof window === "undefined") return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setMicroDemoStage(4);
      return;
    }
    setMicroDemoStage(0);
    const START_MS = 600;
    const STEP_MS = 1280;
    const BEFORE_CELEBRATE_MS = 400;
    const t1 = window.setTimeout(() => setMicroDemoStage(1), START_MS);
    const t2 = window.setTimeout(() => setMicroDemoStage(2), START_MS + STEP_MS);
    const t3 = window.setTimeout(() => setMicroDemoStage(3), START_MS + STEP_MS * 2);
    const t4 = window.setTimeout(
      () => setMicroDemoStage(4),
      START_MS + STEP_MS * 3 + BEFORE_CELEBRATE_MS
    );
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [step]);

  const goTo = useCallback(
    (target: number) => {
      if (target === step) return;
      if (target > step && step === 5 && firstName.trim().length < 2) return;
      setStep(Math.max(0, Math.min(target, STEP_COUNT - 1)));
    },
    [step, firstName]
  );

  const goNext = useCallback(async () => {
    if (step >= STEP_COUNT - 1) return;
    if (step === 5) {
      const name = firstName.trim();
      if (name.length < 2) return;
      if (user?.id) {
        setSaving(true);
        try { await persistPreferredDisplayName(user, name); } finally { setSaving(false); }
      } else {
        try { window.localStorage.setItem("structuro_user_name", name); } catch { /* ignore */ }
      }
      setStep((s) => s + 1);
      return;
    }
    setStep((s) => Math.min(s + 1, STEP_COUNT - 1));
  }, [step, firstName, user]);

  const goPrev = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (dx < -50) { if (step === 5 && firstName.trim().length < 2) return; void goNext(); }
    else if (dx > 50) goPrev();
  };

  const finish = async () => {
    setFinishing(true);
    try {
      if (user?.id) {
        const { error } = await setProfileOnboardingCompleted(true);
        if (error) { alert(`Kon intro niet afronden: ${error}`); setFinishing(false); return; }
      } else {
        setLocalOnboardingCompleted();
        setLocalOnboardingDoneCookieOnClient();
        clearLocalSessionFresh();
      }
      window.location.assign("/dagstart");
    } catch { setFinishing(false); }
  };

  if (!isLocalMode && (userLoading || !user?.id)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 text-slate-500">
        <div className="animate-pulse text-base">Structuro laden…</div>
      </div>
    );
  }

  const nameOk = firstName.trim().length >= 2;

  const backBtn = step > 0 && (
    <button
      type="button"
      onClick={goPrev}
      className="absolute top-5 left-5 z-10 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-white/70 transition-all"
      aria-label="Vorige stap"
    >
      <ChevronLeft className="w-6 h-6" />
    </button>
  );

  return (
    <div className="min-h-[100dvh] flex flex-col bg-gradient-to-br from-slate-50 to-blue-50 overflow-x-hidden">
      <div className="flex-1 min-h-0 flex flex-col touch-pan-y" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="flex-1 overflow-hidden relative">
          {backBtn}
          <div
            className="flex h-full"
            style={{
              width: `${STEP_COUNT * 100}vw`,
              transform: `translateX(-${step * 100}vw)`,
              transition: `transform ${SLIDE_MS}ms ${EASE}`,
            }}
          >
            {/* ── 1 — Welkom ── */}
            <section className="w-screen shrink-0 flex items-center justify-center px-6 py-10 box-border overflow-y-auto">
              <div className="flex flex-col items-center text-center max-w-md w-full">
                <img src="/Logo Structuro.png" alt="" width={112} height={112} className="w-24 h-24 sm:w-28 sm:h-28 object-contain mb-8" />
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Welkom bij Structuro</h1>
                <p className="mt-4 text-base sm:text-lg text-gray-700 leading-relaxed">
                  De app voor mensen die anders denken. Rust, focus en structuur op jouw energie.
                </p>
                <p className="mt-4 text-sm text-gray-500">Even een korte rondleiding, duurt 30 seconden.</p>
                <button type="button" onClick={() => void goNext()} className="mt-10 w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold shadow-md transition-all">
                  Laten zien
                </button>
              </div>
            </section>

            {/* ── 2 — Energie ── */}
            <section className="w-screen shrink-0 flex items-center justify-center px-6 py-10 box-border overflow-y-auto">
              <div className="flex flex-col items-center text-center max-w-lg w-full">
                <Sun className="w-14 h-14 text-amber-500 mb-4" strokeWidth={1.75} aria-hidden />
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Elke dag begint met één vraag</h2>
                <p className="mt-4 text-sm sm:text-base text-gray-600 leading-relaxed">
                  Hoe voel je je vandaag? Op basis van jouw energie kies je het aantal taken. Daarna kun je zelf zoveel taken doen als je wilt.
                </p>
                <div className="mt-8 grid grid-cols-3 gap-3 w-full max-w-md">
                  {[
                    { icon: <Moon className="w-10 h-10 text-slate-500" strokeWidth={1.5} />, label: "Laag", sub: "1 rustige taak" },
                    { icon: <Smile className="w-10 h-10 text-amber-500" strokeWidth={1.5} />, label: "Normaal", sub: "2 taken" },
                    { icon: <Zap className="w-10 h-10 text-violet-600" strokeWidth={1.75} />, label: "Hoog", sub: "3 taken" },
                  ].map((c) => (
                    <div
                      key={c.label}
                      className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm cursor-default hover:shadow-md hover:scale-105 hover:border-blue-200 transition-all duration-200"
                    >
                      <div className="flex justify-center">{c.icon}</div>
                      <p className="mt-2 font-semibold text-gray-900 text-sm">{c.label}</p>
                      <p className="text-xs text-gray-500 mt-1">{c.sub}</p>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => void goNext()} className="mt-10 w-full max-w-sm py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold shadow-md transition-all">
                  Volgende
                </button>
              </div>
            </section>

            {/* ── 3 — Focuspunten ── */}
            <section className="w-screen shrink-0 flex items-center justify-center px-6 py-10 box-border overflow-y-auto">
              <div className="flex flex-col items-center text-center max-w-lg w-full">
                <Check className="w-14 h-14 text-emerald-600 mb-4" strokeWidth={2} aria-hidden />
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Kies wat echt telt vandaag</h2>
                <p className="mt-4 text-sm sm:text-base text-gray-600 leading-relaxed">
                  Geen lange lijsten. Jij kiest maximaal 3 focuspunten, afhankelijk van je energie. Wij passen ons aan op wat werkt voor jouw brein. De rest bestaat even niet.
                </p>
                <ul className="mt-8 w-full max-w-md space-y-3 text-left">
                  {[
                    { n: "1", label: "Kernfocus", sub: "De basislijn voor vandaag", bg: "bg-blue-50", border: "border-blue-100", numColor: "text-blue-700", textColor: "text-blue-900", subColor: "text-blue-600", delay: "0ms" },
                    { n: "2", label: "Vervolgstap", sub: "Zodra de motor draait", bg: "bg-teal-50", border: "border-teal-100", numColor: "text-teal-700", textColor: "text-teal-900", subColor: "text-teal-600", delay: "80ms" },
                    { n: "3", label: "Bonusactie", sub: "Beschikbaar bij hoge energie", bg: "bg-violet-50", border: "border-violet-100", numColor: "text-violet-700", textColor: "text-violet-900", subColor: "text-violet-600", delay: "160ms" },
                  ].map((r) => (
                    <li
                      key={r.n}
                      className={`flex gap-3 rounded-xl ${r.bg} border ${r.border} px-4 py-3 hover:scale-[1.03] hover:shadow-sm transition-all duration-200 cursor-default`}
                      style={{ animationDelay: r.delay }}
                    >
                      <span className={`font-bold ${r.numColor} w-6 pt-0.5`}>{r.n}</span>
                      <div>
                        <p className={`font-semibold ${r.textColor}`}>{r.label}</p>
                        <p className={`text-xs ${r.subColor} mt-0.5`}>{r.sub}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <button type="button" onClick={() => void goNext()} className="mt-10 w-full max-w-sm py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold shadow-md transition-all">
                  Volgende
                </button>
              </div>
            </section>

            {/* ── 4 — Focus modus ── */}
            <section className="w-screen shrink-0 flex items-center justify-center px-6 py-10 box-border overflow-y-auto">
              <div className="flex flex-col items-center text-center max-w-lg w-full">
                <Target className="w-14 h-14 text-blue-600 mb-4" strokeWidth={1.75} aria-hidden />
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Eén taak tegelijk</h2>
                <p className="mt-4 text-sm sm:text-base text-gray-600 leading-relaxed">
                  Focus modus zet alles op pauze. Jij ziet alleen de taak die nu telt, met een timer en rust tussendoor.
                </p>
                <div className="mt-8 w-full max-w-sm rounded-2xl bg-emerald-600 text-white p-5 shadow-lg">
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-90">Nu aan zet</p>
                  <p className="text-lg font-bold mt-1">Structuro leren kennen</p>
                  <p className="text-sm opacity-90 mt-1">5 min · Normaal</p>
                  <div className="mt-4 w-full py-2.5 rounded-xl bg-white text-emerald-700 font-semibold text-sm text-center">Begin nu</div>
                </div>
                <button type="button" onClick={() => void goNext()} className="mt-10 w-full max-w-sm py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold shadow-md transition-all">
                  Volgende
                </button>
              </div>
            </section>

            {/* ── 5 — Microstappen ── */}
            <section className="w-screen shrink-0 flex items-center justify-center px-6 py-10 box-border overflow-y-auto">
              <div className="flex flex-col items-center text-center max-w-lg w-full">
                <Layers className="w-14 h-14 text-violet-600 mb-4" strokeWidth={1.75} aria-hidden />
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Grote taak? Breek hem op.</h2>
                <p className="mt-4 text-sm sm:text-base text-gray-600 leading-relaxed">
                  In Focus modus kun je elke taak opdelen in microstappen. Kleine, haalbare acties zodat je brein niet bevriest maar in beweging blijft.
                </p>

                {/* Visueel voorbeeld: focus mode met microstappen (rustige demo-animatie) */}
                <style>{`
                  @keyframes ob-micro-row-in {
                    from { opacity: 0.7; transform: scale(0.99); }
                    to { opacity: 1; transform: scale(1); }
                  }
                  @keyframes ob-micro-done-banner {
                    from { opacity: 0; transform: translateY(6px); }
                    to { opacity: 1; transform: translateY(0); }
                  }
                  @media (prefers-reduced-motion: reduce) {
                    .ob-micro-done-banner { animation: none !important; opacity: 1 !important; transform: none !important; }
                  }
                `}</style>
                {(() => {
                  const doneCount = Math.min(microDemoStage, 3);
                  const activeRow = microDemoStage < 3 ? microDemoStage : -1;
                  return (
                    <div
                      className={`mt-8 w-full max-w-sm rounded-2xl overflow-hidden transition-[box-shadow] duration-[700ms] ease-out ${
                        microDemoStage >= 4 ? "shadow-xl shadow-emerald-100/50 ring-1 ring-emerald-100/90" : "shadow-lg"
                      }`}
                      aria-live="polite"
                    >
                      <div className="rounded-t-2xl bg-slate-800 text-white px-5 pt-4 pb-3">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Focus modus</p>
                        <p className="text-base font-bold mt-1">Kamer opruimen</p>
                        <p className="text-xs text-slate-400 mt-0.5">15 min · Normaal</p>
                      </div>

                      <div className="rounded-b-2xl bg-white border border-t-0 border-slate-200 px-5 py-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Layers className="w-3.5 h-3.5 text-violet-600" aria-hidden />
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Microstappen</p>
                        </div>
                        <ul className="space-y-2.5">
                          {MICRO_DEMO_STEPS.map((label, i) => {
                            const isDone = i < microDemoStage;
                            const isActive = activeRow === i;
                            return (
                              <li
                                key={label}
                                className={`flex items-center gap-3 rounded-lg transition-all duration-500 ease-out motion-reduce:transition-none ${
                                  isActive
                                    ? "bg-violet-50 -mx-2 px-2 py-1.5 ring-1 ring-violet-200"
                                    : "py-0.5"
                                } ${isDone ? "opacity-95" : ""}`}
                                style={
                                  isDone && microDemoStage === i + 1
                                    ? { animation: "ob-micro-row-in 0.45s ease-out" }
                                    : undefined
                                }
                              >
                                {isDone ? (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 motion-reduce:transition-none transition-transform duration-500 scale-100" aria-hidden />
                                ) : isActive ? (
                                  <div className="relative shrink-0" aria-hidden>
                                    <Circle className="w-5 h-5 text-violet-500" />
                                    <ChevronRight className="absolute top-0.5 left-0.5 w-4 h-4 text-violet-500" />
                                  </div>
                                ) : (
                                  <Circle className="w-5 h-5 text-gray-300 shrink-0" aria-hidden />
                                )}
                                <span
                                  className={`text-sm text-left transition-colors duration-500 ${
                                    isDone ? "text-gray-400 line-through" : isActive ? "font-medium text-violet-900" : "text-gray-500"
                                  }`}
                                >
                                  {label}
                                </span>
                              </li>
                            );
                          })}
                        </ul>

                        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
                          <span className="text-xs text-gray-400 tabular-nums">
                            {doneCount} van 3 klaar
                          </span>
                          <div className="flex gap-1 shrink-0" aria-hidden>
                            {[0, 1, 2].map((j) => {
                              const isDonePill = j < doneCount;
                              const isCurrentPill = j === doneCount && doneCount < 3;
                              return (
                                <div
                                  key={j}
                                  className={`h-1.5 w-6 rounded-full transition-colors duration-500 ease-out ${
                                    isDonePill
                                      ? "bg-emerald-400"
                                      : isCurrentPill
                                        ? "bg-violet-400"
                                        : "bg-gray-200"
                                  }`}
                                />
                              );
                            })}
                          </div>
                        </div>

                        {microDemoStage >= 4 ? (
                          <div
                            className="ob-micro-done-banner mt-3 rounded-xl border border-emerald-100 bg-emerald-50/95 px-4 py-3 flex items-start gap-3"
                            style={{ animation: "ob-micro-done-banner 0.65s ease-out both" }}
                          >
                            <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0 mt-0.5" aria-hidden />
                            <div className="text-left min-w-0">
                              <p className="text-sm font-semibold text-emerald-900">Taak afgerond</p>
                              <p className="text-xs text-emerald-800/80 leading-snug mt-0.5">
                                Zo ziet het eruit als alle microstappen klaar zijn. Rustig, stap voor stap.
                              </p>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })()}

                <p className="mt-6 text-xs text-gray-500 leading-relaxed max-w-sm">
                  Eén stap tegelijk, met een vinkje bij elke overwinning. Zo wordt een grote berg een wandeling.
                </p>

                <button type="button" onClick={() => void goNext()} className="mt-8 w-full max-w-sm py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold shadow-md transition-all">
                  Starten met Structuro!
                </button>
              </div>
            </section>

            {/* ── 6 — Naam ── */}
            <section className="w-screen shrink-0 flex items-center justify-center px-6 py-10 box-border overflow-y-auto">
              <div className="flex flex-col items-center text-center max-w-md w-full">
                <img src="/Logo Structuro.png" alt="" width={112} height={112} className="w-24 h-24 object-contain mb-6" />
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Hoe mogen we je aanspreken?</h2>
                <p className="mt-3 text-sm text-gray-600">Alleen je voornaam, voor een persoonlijke begroeting.</p>
                <input
                  type="text"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && nameOk && !saving) void goNext(); }}
                  placeholder="Voornaam"
                  className="mt-8 w-full max-w-sm px-4 py-3.5 rounded-xl border border-gray-200 text-center text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                />
                <button
                  type="button"
                  disabled={!nameOk || saving}
                  onClick={() => void goNext()}
                  className="mt-8 w-full max-w-sm py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {saving ? "Opslaan…" : "Verder"}
                </button>
              </div>
            </section>

            {/* ── 7 — Persoonlijk welkom ── */}
            <section className="w-screen shrink-0 flex items-center justify-center px-6 py-10 box-border overflow-y-auto">
              <div className="flex flex-col items-center text-center max-w-md w-full">
                <img src="/Logo Structuro.png" alt="" width={112} height={112} className="w-24 h-24 object-contain mb-6" />
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">Welkom, {firstName.trim() || "daar"}!</p>
                <p className="mt-4 text-base text-gray-700 leading-relaxed">
                  Structuro helpt je elke dag starten met rust en focus, op jouw tempo en met jouw energie.
                </p>
                <button type="button" onClick={() => void goNext()} className="mt-10 w-full max-w-sm py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold shadow-md transition-all">
                  Begin mijn eerste dag
                </button>
              </div>
            </section>

            {/* ── 8 — Klaar ── */}
            <section className="w-screen shrink-0 flex items-center justify-center px-6 py-10 box-border overflow-y-auto">
              <div className="flex flex-col items-center text-center max-w-lg w-full">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Je bent er klaar voor</h2>
                <p className="mt-4 text-sm sm:text-base text-gray-600 leading-relaxed">
                  De dagstart wacht op je. Elke dag opnieuw: één vraag, jouw focuspunten, één taak tegelijk.
                </p>
                <div className="mt-8 w-full max-w-md rounded-2xl bg-emerald-50 border border-emerald-100 p-5 text-left">
                  <p className="text-sm font-semibold text-emerald-900 mb-3">Zo werkt het</p>
                  <ol className="space-y-2.5 text-sm text-emerald-900">
                    <li className="flex items-center gap-3">
                      <span className="w-5 shrink-0 text-right text-sm font-bold text-emerald-900 tabular-nums">1</span>
                      <span>Dagstart</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="w-5 shrink-0 text-right text-sm font-bold text-emerald-900 tabular-nums">2</span>
                      <span>Taken kiezen</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="w-5 shrink-0 text-right text-sm font-bold text-emerald-900 tabular-nums">3</span>
                      <span>Focus modus</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="w-5 shrink-0 text-right text-sm font-bold text-emerald-900 tabular-nums">4</span>
                      <span>Beloningen &amp; levels</span>
                    </li>
                  </ol>
                </div>
                <div className="mt-5 w-full max-w-md rounded-2xl bg-amber-50 border border-amber-100 p-4 text-center">
                  <div className="flex justify-center gap-1 mb-2">
                    <Star className="w-4 h-4 text-amber-500" />
                    <Star className="w-4 h-4 text-amber-500" />
                    <Star className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-sm font-medium text-amber-900">
                    Speel punten vrij, stijg in level en ontgrendel beloningen. Ga jij de nieuwe meester in structuur worden?
                  </p>
                </div>
                <button
                  type="button"
                  disabled={finishing}
                  onClick={() => void finish()}
                  className="mt-10 w-full max-w-sm py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold shadow-md disabled:opacity-50 transition-all"
                >
                  {finishing ? "Bezig…" : "Naar mijn dagstart"}
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* ── Dots navigatie ── */}
      <div
        className="shrink-0 flex justify-center gap-2.5 pb-8 pt-4 bg-gradient-to-t from-slate-50/90 to-transparent"
        role="navigation"
        aria-label="Onboarding stappen"
      >
        {Array.from({ length: STEP_COUNT }).map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Stap ${i + 1}`}
            onClick={() => goTo(i)}
            className={`rounded-full transition-all duration-300 cursor-pointer hover:scale-125 hover:opacity-80 ${
              i === step ? "w-8 h-2.5 bg-blue-600" : "w-2.5 h-2.5 bg-gray-300 hover:bg-gray-400"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
