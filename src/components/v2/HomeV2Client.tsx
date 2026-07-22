"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Link from "next/link";

import { useI18n } from "@/lib/i18n";

import { V2AppShell, V2Eyebrow } from "./V2Chrome";
import { useV2 } from "./V2Context";
import { useV2Go } from "./v2nav";
import {
  dismissV2HomePrompt,
  resolveV2HomePrompt,
  type V2HomePrompt,
} from "./v2HomePrompt";
import {
  trackV2HomePromptPriority,
  trackV2OpenTaskReminderDismissed,
  trackV2OpenTaskReminderShown,
  trackV2QuoteDismissed,
  trackV2QuoteShown,
  trackV2ReturnReminderDismissed,
  trackV2ReturnReminderShown,
  trackV2ShutdownNudgeShown,
  trackV2SkipDay1HookShown,
  trackV2WhySuggestionAccepted,
  trackV2WhySuggestionShown,
} from "./v2Analytics";
import {
  trackV2OnboardingCycle,
  trackV2OnboardingStep,
} from "./v2OnboardingFunnel";
import {
  acceptV2WhySuggestion,
  recordWhySuggestionIdleOpen,
} from "./v2WhySuggestion";
import { v2HasThings, v2NormalizeThings } from "./v2Things";
import { markV2OpenTaskReminderShown } from "./v2OpenTaskReminder";
import { markV2QuoteShown } from "./v2Quotes";
import { ensureV2ThingsHaveTasks } from "./v2MicroDefaults";
import { dismissCycleOptInPrompt } from "./v2CycleOptInPrompt";
import { shouldShowAccountSavePrompt } from "./v2AccountSavePrompt";
import V2AccountSaveCta from "./V2AccountSaveCta";
import { patchV2Settings } from "./v2Settings";
import {
  findV2TaskByTitle,
  saveV2Tasks,
  type V2MicroStep,
  type V2Task,
} from "./v2Tasks";

const V2CycleSetupStep = dynamic(() => import("./V2CycleSetupStep"), {
  ssr: false,
  loading: () => null,
});

const ENERGY_LABEL: Record<string, string> = {
  low: "Energie: laag",
  enough: "Energie: genoeg",
  high: "Energie: hoog",
};

function greetingWord(): string {
  const h = new Date().getHours();
  if (h < 6) return "Goedenacht";
  if (h < 12) return "Goedemorgen";
  if (h < 18) return "Goedemiddag";
  return "Goedenavond";
}

function trackPromptShown(prompt: V2HomePrompt): void {
  trackV2HomePromptPriority({ prompt_kind: prompt.kind });
  switch (prompt.kind) {
    case "day1_skip_hook":
      trackV2SkipDay1HookShown();
      break;
    case "shutdown_nudge":
      trackV2ShutdownNudgeShown();
      break;
    case "widget_hint":
      trackV2ReturnReminderShown({ channel: "widget_hint" });
      break;
    case "open_task_reminder":
      trackV2OpenTaskReminderShown({ channel: "home" });
      markV2OpenTaskReminderShown();
      break;
    case "why_suggestion":
      trackV2WhySuggestionShown({ source: prompt.suggestion.source });
      break;
    case "quote":
      trackV2QuoteShown({ surface: "home" });
      markV2QuoteShown();
      break;
    default:
      break;
  }
}

export default function HomeV2Client() {
  const go = useV2Go();
  const { locale } = useI18n();
  const { state, ready, update } = useV2();
  const [greeting, setGreeting] = useState(greetingWord);
  const [homePrompt, setHomePrompt] = useState<V2HomePrompt | null>(null);
  const [promptTracked, setPromptTracked] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [tasks, setTasks] = useState<V2Task[]>([]);
  const [cycleSetupOpen, setCycleSetupOpen] = useState(false);
  const [showAccountSave, setShowAccountSave] = useState(false);

  const things = v2NormalizeThings(state.things);
  const hasThings = v2HasThings(things);
  const activeThing =
    hasThings ? things[heroIndex % things.length] ?? things[0] : null;
  const activeTask = activeThing ? findV2TaskByTitle(tasks, activeThing) : null;
  const microSteps: V2MicroStep[] = activeTask?.microSteps ?? [];

  useEffect(() => {
    setGreeting(greetingWord());
    const id = window.setInterval(() => setGreeting(greetingWord()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!ready) return;
    setTasks(ensureV2ThingsHaveTasks(v2NormalizeThings(state.things), locale));
  }, [ready, state.things, locale]);

  useEffect(() => {
    if (!ready) return;
    trackV2OnboardingStep("home");
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    setShowAccountSave(shouldShowAccountSavePrompt());
  }, [ready, state]);

  useEffect(() => {
    setHeroIndex(0);
  }, [state.things]);

  useEffect(() => {
    if (!ready || cycleSetupOpen) return;
    recordWhySuggestionIdleOpen(state);
    setHomePrompt(resolveV2HomePrompt(state));
    setPromptTracked(false);
  }, [ready, state, cycleSetupOpen]);

  useEffect(() => {
    if (!ready || !homePrompt || promptTracked) return;
    trackPromptShown(homePrompt);
    setPromptTracked(true);
  }, [ready, homePrompt, promptTracked]);

  const name = state.name.trim();
  const headline = name
    ? `${greeting}, ${name}`
    : greeting || "Welkom";
  const energyLabel = state.energy ? ENERGY_LABEL[state.energy] : null;

  const toggleMicroStep = (stepId: string) => {
    if (!activeTask) return;
    const next = tasks.map((t) => {
      if (t.id !== activeTask.id) return t;
      return {
        ...t,
        microSteps: t.microSteps.map((s) =>
          s.id === stepId ? { ...s, done: !s.done } : s,
        ),
      };
    });
    setTasks(next);
    saveV2Tasks(next);
  };

  const dismissPrompt = () => {
    if (!homePrompt) return;
    if (homePrompt.kind === "widget_hint") {
      trackV2ReturnReminderDismissed({ channel: "widget_hint" });
    }
    if (homePrompt.kind === "open_task_reminder") {
      trackV2OpenTaskReminderDismissed({ channel: "home" });
    }
    if (homePrompt.kind === "quote") {
      trackV2QuoteDismissed({});
    }
    dismissV2HomePrompt(homePrompt);
    setHomePrompt(null);
  };

  const acceptWhyOnHome = () => {
    if (!homePrompt || homePrompt.kind !== "why_suggestion") return;
    trackV2WhySuggestionAccepted({ source: homePrompt.suggestion.source });
    // Journey: geen concrete taak, dus door naar dagstart. Taak: zacht als vandaag-ding.
    if (homePrompt.suggestion.source === "journey") {
      setHomePrompt(null);
      go("/v2/dagstart?start=energy");
      return;
    }
    const thing = acceptV2WhySuggestion(homePrompt.suggestion);
    update({ things: [thing], todayDone: false });
    setHomePrompt(null);
  };

  const openCycleSetup = () => {
    setHomePrompt(null);
    setCycleSetupOpen(true);
  };

  const completeCycleSetupFromHome = async (
    lastPeriodStart: string,
    averageLength: number,
    menstruationDuration: number,
  ) => {
    patchV2Settings({
      lastPeriodStart,
      cycleLength: averageLength,
      menstruationDuration,
      cycleOptInPromptDismissed: true,
    });
    update({ cyclusOptIn: true });
    trackV2OnboardingCycle({ optedIn: true });
    setCycleSetupOpen(false);
    setHomePrompt(null);
  };

  const skipCycleSetupFromHome = () => {
    dismissCycleOptInPrompt();
    trackV2OnboardingCycle({ optedIn: false });
    setCycleSetupOpen(false);
    setHomePrompt(null);
  };

  const renderPrompt = () => {
    if (cycleSetupOpen) {
      return (
        <section
          className="v2-fade rounded-[20px] p-5"
          style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}
          aria-live="polite"
        >
          <V2CycleSetupStep
            onSubmit={completeCycleSetupFromHome}
            onSkip={skipCycleSetupFromHome}
          />
        </section>
      );
    }

    if (!ready || !homePrompt) return null;

    if (homePrompt.kind === "why_anchor") {
      return (
        <section
          className="v2-fade v2-why-anchor relative rounded-[20px] p-4 pr-11"
          style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}
          aria-live="polite"
        >
          <button
            type="button"
            className="v2-why-anchor__close"
            onClick={dismissPrompt}
            aria-label="Sluiten"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path
                d="M3 3l8 8M11 3l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: "var(--accent)" }}
          >
            Even een zacht zetje
          </p>
          <p className="mt-1 text-[15px] font-medium" style={{ color: "var(--text)" }}>
            Je deed dit voor: &ldquo;{homePrompt.why}&rdquo;
          </p>
          {homePrompt.whyOutcome.length > 0 ? (
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              Het levert je op: {homePrompt.whyOutcome}
            </p>
          ) : null}
        </section>
      );
    }

    if (homePrompt.kind === "why_suggestion") {
      return (
        <section className="v2-fade v2-evening-cloud" aria-live="polite">
          <div className="v2-evening-cloud__body">
            <span className="v2-evening-cloud__moon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3.5v2.2M12 18.3v2.2M4.8 12H7M17 12h2.2M6.4 6.4l1.6 1.6M16 16l1.6 1.6M17.6 6.4 16 8M8 16l-1.6 1.6"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="12" r="3.2" fill="currentColor" opacity="0.9" />
              </svg>
            </span>
            <p className="v2-evening-cloud__text">
              {homePrompt.suggestion.invitation}
            </p>
            <div className="v2-evening-cloud__actions">
              <button
                type="button"
                className="v2-evening-cloud__cta"
                onClick={acceptWhyOnHome}
              >
                {homePrompt.suggestion.title}
              </button>
              <button
                type="button"
                className="v2-evening-cloud__later"
                onClick={dismissPrompt}
              >
                Of kies zelf
              </button>
            </div>
          </div>
          <span className="v2-evening-cloud__tail" aria-hidden />
        </section>
      );
    }

    if (homePrompt.kind === "shutdown_nudge") {
      return (
        <section className="v2-fade v2-evening-cloud" aria-live="polite">
          <div className="v2-evening-cloud__body">
            <span className="v2-evening-cloud__moon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M18.5 14.2A7.2 7.2 0 0 1 9.8 5.5 7.4 7.4 0 1 0 18.5 14.2Z"
                  fill="currentColor"
                  opacity="0.9"
                />
              </svg>
            </span>
            <p className="v2-evening-cloud__text">{homePrompt.line}</p>
            <div className="v2-evening-cloud__actions">
              <button
                type="button"
                className="v2-evening-cloud__cta"
                onClick={() => go("/v2/shutdown")}
              >
                Naar dagafsluiting
              </button>
              <button
                type="button"
                className="v2-evening-cloud__later"
                onClick={dismissPrompt}
              >
                Later
              </button>
            </div>
          </div>
          <span className="v2-evening-cloud__tail" aria-hidden />
        </section>
      );
    }

    if (homePrompt.kind === "cycle_optin") {
      return (
        <section
          className="v2-fade rounded-[20px] p-4"
          style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}
          aria-live="polite"
        >
          <p className="text-[15px] leading-snug" style={{ color: "var(--text)" }}>
            {homePrompt.line}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="text-[14px] font-medium"
              style={{
                color: "var(--accent)",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
              }}
              onClick={openCycleSetup}
            >
              Ja, zet aan
            </button>
            <button type="button" className="v2-link text-[14px]" onClick={dismissPrompt}>
              Niet nu
            </button>
          </div>
        </section>
      );
    }

    const line =
      homePrompt.kind === "morning_reminder"
        ? homePrompt.reminder.line
        : homePrompt.line;

    const primaryAction = (() => {
      switch (homePrompt.kind) {
        case "morning_reminder":
          return (
            <Link
              href="/v2/dump"
              className="text-[14px] font-medium no-underline"
              style={{ color: "var(--accent)" }}
            >
              Naar extern geheugen
            </Link>
          );
        case "day1_skip_hook":
          return (
            <button
              type="button"
              className="text-[14px] font-medium"
              style={{ color: "var(--accent)", background: "none", border: "none", padding: 0, cursor: "pointer" }}
              onClick={() => go("/v2/dagstart")}
            >
              Naar dagstart
            </button>
          );
        case "widget_hint":
          return (
            <button
              type="button"
              className="text-[14px] font-medium"
              style={{ color: "var(--accent)", background: "none", border: "none", padding: 0, cursor: "pointer" }}
              onClick={() => go("/v2/dagstart")}
            >
              Naar dagstart
            </button>
          );
        case "open_task_reminder":
          return (
            <button
              type="button"
              className="text-[14px] font-medium"
              style={{ color: "var(--accent)", background: "none", border: "none", padding: 0, cursor: "pointer" }}
              onClick={() => go("/v2/focus")}
            >
              Naar focus
            </button>
          );
        default:
          return null;
      }
    })();

    const dismissLabel =
      homePrompt.kind === "morning_reminder"
        ? "Niet nu"
        : homePrompt.kind === "quote"
          ? "Niet vandaag"
          : "Niet vandaag";

    const promptBackground =
      homePrompt.kind === "day1_skip_hook"
        ? "var(--accent-soft)"
        : homePrompt.kind === "quote"
          ? "var(--accent-soft)"
          : "#FFFFFF";

    return (
      <section
        className="v2-fade rounded-[20px] p-4"
        style={{
          background: promptBackground,
          border: "1px solid var(--border)",
        }}
        aria-live="polite"
      >
        <p className="text-[15px] leading-snug" style={{ color: "var(--text)" }}>
          {line}
        </p>
        {primaryAction ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {primaryAction}
            <button type="button" className="v2-link text-[14px]" onClick={dismissPrompt}>
              {dismissLabel}
            </button>
          </div>
        ) : null}
      </section>
    );
  };

  const isBottomPrompt =
    homePrompt?.kind === "shutdown_nudge" || homePrompt?.kind === "why_suggestion";
  const promptAtTop = cycleSetupOpen || (!isBottomPrompt && Boolean(homePrompt));

  return (
    <V2AppShell
      bottomSlot={
        isBottomPrompt && !cycleSetupOpen ? (
          <div className="v2-evening-cloud-slot">
            {renderPrompt()}
          </div>
        ) : null
      }
    >
      <div
        className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-5 pb-8 pt-6"
        style={{ minHeight: "100%" }}
      >
        {promptAtTop ? renderPrompt() : null}

        <header>
          <V2Eyebrow>Vandaag</V2Eyebrow>
          <div className="mt-1 flex items-end justify-between gap-3">
            <h1
              className="v2-serif min-w-0 flex-1"
              style={{ fontSize: "1.875rem", letterSpacing: "-0.02em" }}
            >
              {headline}
            </h1>
            {energyLabel ? (
              <span className="v2-home-chip shrink-0">{energyLabel}</span>
            ) : null}
          </div>
        </header>

        {!ready ? (
          <div
            className="rounded-[20px] p-6 text-center text-sm"
            style={{ color: "var(--text-muted)" }}
            aria-busy="true"
          >
            Even laden.
          </div>
        ) : state.todayDone ? (
          <section
            className="v2-card v2-fade p-6 text-center"
            aria-live="polite"
          >
            <div
              className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: "var(--accent)" }}
              aria-hidden
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 12l5 5 9-9" stroke="var(--text-on-ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="v2-serif" style={{ fontSize: "var(--fs-title)" }}>
              Vandaag is rond.
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              Je sloot de lus. Rust met een gerust hart. Morgen begin je opnieuw.
            </p>
            <button
              type="button"
              onClick={() => update({ todayDone: false })}
              className="v2-link mx-auto mt-3 block"
            >
              Toch nog iets doen
            </button>
          </section>
        ) : hasThings && activeThing ? (
          <>
            <section className="v2-card v2-fade p-5">
              <div className="flex items-center justify-between gap-3">
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.16em]"
                  style={{ color: "var(--accent)" }}
                >
                  Nu aan de beurt
                </p>
                {things.length > 1 ? (
                  <p
                    className="text-[11px] font-medium tabular-nums"
                    style={{ color: "var(--text-muted)" }}
                    aria-label={`Taak ${(heroIndex % things.length) + 1} van ${things.length}`}
                  >
                    {(heroIndex % things.length) + 1}/{things.length}
                  </p>
                ) : null}
              </div>
              <h2
                className="v2-serif v2-home-hero-title"
                style={{
                  fontSize: "1.35rem",
                  lineHeight: 1.35,
                  letterSpacing: "-0.015em",
                  color: "var(--text)",
                }}
              >
                {activeThing}
              </h2>

              {microSteps.length > 0 ? (
                <ul
                  className="v2-home-micro-list"
                  aria-label="Microstappen"
                >
                  {microSteps.map((step) => (
                    <li key={step.id}>
                      <button
                        type="button"
                        onClick={() => toggleMicroStep(step.id)}
                        className="v2-home-micro"
                        aria-pressed={step.done}
                      >
                        <span
                          className="v2-home-micro__chk"
                          aria-hidden
                          data-done={step.done ? "1" : "0"}
                        >
                          {step.done ? "✓" : ""}
                        </span>
                        <span
                          className="v2-home-micro__lbl"
                          data-done={step.done ? "1" : "0"}
                        >
                          {step.title}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              <button
                type="button"
                onClick={() =>
                  go(`/v2/focus?thing=${encodeURIComponent(activeThing)}`)
                }
                className="btn-primary mt-5 w-full"
              >
                Start focus
              </button>
              {things.length > 1 ? (
                <button
                  type="button"
                  className="v2-link mt-3 w-full text-center text-[14px]"
                  onClick={() =>
                    setHeroIndex((prev) => (prev + 1) % things.length)
                  }
                >
                  Andere taak
                </button>
              ) : null}

              <div className="v2-home-loop" aria-label="De lus van vandaag">
                <p className="v2-home-loop__label">De lus van vandaag</p>
                <div className="v2-home-loop__actions">
                  <Link href="/v2/dump" className="v2-home-loop__link">
                    Brein legen
                  </Link>
                  <span className="v2-home-loop__dot" aria-hidden>
                    ·
                  </span>
                  <button
                    type="button"
                    className="v2-home-loop__link"
                    onClick={() => go("/v2/shutdown")}
                  >
                    Dag afsluiten
                  </button>
                </div>
              </div>
            </section>

            {showAccountSave ? (
              <V2AccountSaveCta content="v2_home_after_win" surface="home" />
            ) : null}

            <p
              className="mt-auto pt-6 text-center text-[10.5px] italic"
              style={{ color: "rgba(26,35,64,0.5)" }}
            >
              Meer hoeft niet vandaag.
            </p>
          </>
        ) : (
          <section className="v2-card v2-fade p-6 text-center">
            <h2 className="v2-serif" style={{ fontSize: "var(--fs-title)" }}>
              Nog niks gekozen, en dat is prima.
            </h2>
            <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
              Begin je dag rustig. Structuro stelt voor, jij bevestigt.
            </p>
            <button
              type="button"
              onClick={() => go("/v2/dagstart")}
              className="btn-primary mx-auto mt-5"
            >
              Doe je dagstart
            </button>
            <Link href="/v2/dump" className="v2-link mx-auto mt-2 block">
              Brein legen
            </Link>
          </section>
        )}
      </div>
    </V2AppShell>
  );
}
