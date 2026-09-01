"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { useI18n } from "@/lib/i18n";
import { HAPTIC_PATTERNS, triggerHaptic } from "@/lib/haptics";
import Battery from "@/components/dagstart/design/Battery";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { captureProductEvent } from "@/lib/posthog/track";

import { V2AppShell } from "./V2Chrome";
import StructuroLogoLoading from "@/components/structuro/StructuroLogoLoading";
import { useV2 } from "./V2Context";
import { useV2Go } from "./v2nav";
import { v2ActiveMicroStepIndex, v2EnergyToMicro } from "./v2FocusMicro";
import {
  dismissV2HomePrompt,
  resolveV2HomePrompt,
  type V2HomePrompt,
} from "./v2HomePrompt";
import {
  trackV2HomePromptPriority,
  trackV2HomeSessionStart,
  trackV2LastTaskShutdownStarted,
  trackV2OpenTaskReminderDismissed,
  trackV2OpenTaskReminderShown,
  trackV2QuoteDismissed,
  trackV2QuoteShown,
  trackV2ReturnReminderDismissed,
  trackV2ReturnReminderShown,
  trackV2SkipDay1HookShown,
  trackV2WhySuggestionAccepted,
  trackV2WhySuggestionShown,
} from "./v2Analytics";
import { trackV2OnboardingCycle } from "./v2OnboardingFunnel";
import {
  acceptV2WhySuggestion,
  recordWhySuggestionIdleOpen,
} from "./v2WhySuggestion";
import { v2HasThings, v2NormalizeThings } from "./v2Things";
import { markV2OpenTaskReminderShown } from "./v2OpenTaskReminder";
import { markV2QuoteShown } from "./v2Quotes";
import { ensureV2ThingsHaveTasks } from "./v2MicroDefaults";
import { dismissCycleOptInPrompt } from "./v2CycleOptInPrompt";
import { patchV2Settings } from "./v2Settings";
import { getV2EnergyForToday } from "./v2Adaptive";
import { v2EnergyMeta, v2TaskEnergyToDay } from "./v2EnergyMeta";
import { estimateFocusDurationBucket } from "./v2FocusDurationEstimate";
import { formatV2HomeClock, formatV2HomeDateLabel } from "./v2HomeDate";
import V2TaskBattery from "./V2TaskBattery";
import V2InstallGate from "./V2InstallGate";
import {
  completeV2TaskByTitle,
  findV2TaskByTitle,
  saveV2Tasks,
  v2Id,
  type V2MicroStep,
  type V2Task,
} from "./v2Tasks";
import { recordV2Done } from "./v2DoneTally";
import {
  clearV2ShutdownInPlace,
  hasV2ShutdownInPlace,
  isLastDagstartThing,
  markV2ShutdownInPlace,
} from "./v2LastTaskShutdown";

const V2CycleSetupStep = dynamic(() => import("./V2CycleSetupStep"), {
  ssr: false,
  loading: () => null,
});

const V2ShellWelcomeSheet = dynamic(() => import("./V2ShellWelcomeSheet"), {
  ssr: false,
  loading: () => null,
});

const ShutdownV2Client = dynamic(() => import("./ShutdownV2Client"), {
  ssr: false,
  loading: () => null,
});

const ENERGY_CHIP_KEY: Record<string, string> = {
  low: "v2.energyLow",
  enough: "v2.energyEnough",
  high: "v2.energyHigh",
};

const ENERGY_ARIA_KEY: Record<string, string> = {
  low: "v2.homeEnergyLow",
  enough: "v2.homeEnergyEnough",
  high: "v2.homeEnergyHigh",
};

const TASK_ENERGY_KEY: Record<string, string> = {
  low: "v2.homeTaskEnergyLow",
  enough: "v2.homeTaskEnergyEnough",
  high: "v2.homeTaskEnergyHigh",
};

/** Lege batterij-segmenten zoals in home-richting B. */
const HOME_BATTERY_MUTED = "#ABB3C5";

const DAYSTART_RAIL = [
  ["v2.homeEmptyStepEnergy", "v2.homeEmptyStepEnergyHint"],
  ["v2.homeEmptyStepPick", "v2.homeEmptyStepPickHint"],
  ["v2.homeEmptyStepStart", "v2.homeEmptyStepStartHint"],
] as const;

function homeDurationKey(bucket: "short" | "medium" | "long"): string {
  if (bucket === "medium") return "v2.focusRingMinutesMedium";
  if (bucket === "long") return "v2.focusRingMinutesLong";
  return "v2.focusRingMinutesShort";
}

function greetingKey(): string {
  const h = new Date().getHours();
  if (h < 6) return "v2.homeGreetingNight";
  if (h < 12) return "v2.homeGreetingMorning";
  if (h < 18) return "v2.homeGreetingAfternoon";
  return "v2.homeGreetingEvening";
}

function trackPromptShown(prompt: V2HomePrompt): void {
  trackV2HomePromptPriority({ prompt_kind: prompt.kind });
  switch (prompt.kind) {
    case "day1_skip_hook":
      trackV2SkipDay1HookShown();
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
  const { t, locale } = useI18n();
  const { state, ready, update } = useV2();
  const [greetingKeyState, setGreetingKeyState] = useState(greetingKey);
  const [now, setNow] = useState(() => new Date());
  const [homePrompt, setHomePrompt] = useState<V2HomePrompt | null>(null);
  const [promptTracked, setPromptTracked] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [tasks, setTasks] = useState<V2Task[]>([]);
  const [cycleSetupOpen, setCycleSetupOpen] = useState(false);
  const [suggestBusy, setSuggestBusy] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggestDismissed, setSuggestDismissed] = useState(false);
  const [inPlaceShutdown, setInPlaceShutdown] = useState(false);
  const suggestShownRef = useRef(false);

  const things = v2NormalizeThings(state.things);
  const hasThings = v2HasThings(things);
  const activeThing =
    hasThings ? things[heroIndex % things.length] ?? things[0] : null;
  const activeTask = activeThing ? findV2TaskByTitle(tasks, activeThing) : null;
  const microSteps: V2MicroStep[] = activeTask?.microSteps ?? [];
  const activeMicroIdx = v2ActiveMicroStepIndex(microSteps);
  const allMicrosDone =
    microSteps.length > 0 && microSteps.every((s) => s.done);
  const taskCount = things.length;
  const taskOrdinal = taskCount > 0 ? (heroIndex % taskCount) + 1 : 0;
  const showMicroSuggest =
    Boolean(activeThing) &&
    microSteps.length === 0 &&
    !suggestDismissed;

  useEffect(() => {
    setGreetingKeyState(greetingKey());
    setNow(new Date());
    const id = window.setInterval(() => {
      setGreetingKeyState(greetingKey());
      setNow(new Date());
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!ready) return;
    setTasks(ensureV2ThingsHaveTasks(v2NormalizeThings(state.things), locale));
  }, [ready, state.things, locale]);

  useEffect(() => {
    if (!ready) return;
    trackV2HomeSessionStart();
  }, [ready]);

  // Herstel chip als journey-energy per ongeluk is gewist maar vandaag nog in adaptive staat.
  useEffect(() => {
    if (!ready || state.energy) return;
    const today = getV2EnergyForToday();
    if (today) update({ energy: today });
  }, [ready, state.energy, update]);

  useEffect(() => {
    setHeroIndex(0);
    setSuggestDismissed(false);
    suggestShownRef.current = false;
  }, [state.things]);

  useEffect(() => {
    if (!ready) return;
    if (state.todayDone) {
      setInPlaceShutdown(false);
      clearV2ShutdownInPlace();
      return;
    }
    if (hasV2ShutdownInPlace() && !hasThings) {
      setInPlaceShutdown(true);
    }
  }, [ready, state.todayDone, hasThings]);

  useEffect(() => {
    setSuggestDismissed(false);
    suggestShownRef.current = false;
    setSuggestError(null);
  }, [activeThing]);

  useEffect(() => {
    if (!showMicroSuggest || suggestShownRef.current) return;
    suggestShownRef.current = true;
    captureProductEvent(ANALYTICS_EVENTS.microsteps_suggest_shown, {
      source: "home_v2",
    });
  }, [showMicroSuggest]);

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

  const greeting = t(greetingKeyState);
  const headline = greeting || t("v2.homeGreetingFallback");
  const dateLabel = formatV2HomeDateLabel(now, locale);
  const energyMeta = v2EnergyMeta(state.energy);
  const energyChipKey = state.energy ? ENERGY_CHIP_KEY[state.energy] : null;
  const energyAriaKey = state.energy ? ENERGY_ARIA_KEY[state.energy] : null;
  const energyChipLabel = energyChipKey ? t(energyChipKey) : null;
  const energyAria = energyAriaKey ? t(energyAriaKey) : null;
  const showEnergyChip = Boolean(
    hasThings && !state.todayDone && energyMeta && energyChipLabel,
  );
  const closedClock = formatV2HomeClock(state.todayDoneAt, locale);
  const closedLine = closedClock
    ? t("v2.homeDoneClosedAt", { time: closedClock })
    : t("v2.homeDoneClosed");
  const activeDayEnergy = v2TaskEnergyToDay(activeTask?.energy ?? null);
  const activeEnergyLabel = activeDayEnergy
    ? t(TASK_ENERGY_KEY[activeDayEnergy])
    : null;
  const activeDurationLabel = activeThing
    ? t(
        homeDurationKey(
          estimateFocusDurationBucket({
            title: activeThing,
            energy: activeTask?.energy ?? null,
            taskDurationBucket: activeTask?.durationBucket ?? null,
          }).durationBucket,
        ),
      )
    : null;
  const restThings = things.filter((thing) => thing !== activeThing);

  const toggleMicroStep = (stepId: string) => {
    if (!activeTask) return;
    const step = activeTask.microSteps.find((s) => s.id === stepId);
    const markingDone = step ? !step.done : false;
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
    if (markingDone) {
      const nextTask = next.find((t) => t.id === activeTask.id);
      const lastMicro =
        nextTask != null &&
        nextTask.microSteps.length > 0 &&
        nextTask.microSteps.every((s) => s.done);
      triggerHaptic(
        lastMicro ? HAPTIC_PATTERNS.TASK_DONE : HAPTIC_PATTERNS.MICROSTEP_DONE,
        { respectReducedMotion: true },
      );
      if (lastMicro && activeThing && isLastDagstartThing(things, activeThing)) {
        const completed = completeV2TaskByTitle(next, activeTask.title);
        setTasks(completed);
        saveV2Tasks(completed);
        if (completed !== next) recordV2Done();
        markV2ShutdownInPlace();
        trackV2LastTaskShutdownStarted({ source: "home" });
        update({ things: [] });
        setInPlaceShutdown(true);
      }
    }
  };

  const applySuggestedSteps = async () => {
    if (!activeThing || suggestBusy) return;
    setSuggestBusy(true);
    setSuggestError(null);
    try {
      const { fetchMicroStepSuggestions } = await import(
        "@/lib/ai/fetchMicroStepSuggestions"
      );
      const energy =
        activeTask?.energy ??
        v2EnergyToMicro(state.energy);
      const result = await fetchMicroStepSuggestions({
        title: activeTask?.title || activeThing,
        energyLevel: energy,
        locale: locale === "en" ? "en" : "nl",
      });
      const nextSteps: V2MicroStep[] = result.steps.slice(0, 4).map((title) => ({
        id: v2Id("ms"),
        title,
        done: false,
      }));
      if (activeTask) {
        const keepDone = activeTask.microSteps.filter((s) => s.done);
        const next = tasks.map((tRow) =>
          tRow.id === activeTask.id
            ? { ...tRow, microSteps: [...keepDone, ...nextSteps] }
            : tRow,
        );
        setTasks(next);
        saveV2Tasks(next);
      }
      captureProductEvent(ANALYTICS_EVENTS.microsteps_suggest_accepted, {
        source: "home_v2",
        step_count: nextSteps.length,
      });
    } catch {
      setSuggestError(t("v2.focusMicroSuggestError"));
    } finally {
      setSuggestBusy(false);
    }
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
      go("/dagstart?start=energy");
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
            aria-label={t("v2.focusClose")}
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
            {t("v2.homeWhyKicker")}
          </p>
          <p className="mt-1 text-[15px] font-medium" style={{ color: "var(--text)" }}>
            {t("v2.homeWhyAnchor", { why: homePrompt.why })}
          </p>
          {homePrompt.whyOutcome.length > 0 ? (
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              {t("v2.homeWhyOutcome", { outcome: homePrompt.whyOutcome })}
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
                {t("v2.homeWhyPickSelf")}
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
              {t("v2.homeCycleYes")}
            </button>
            <button type="button" className="v2-link text-[14px]" onClick={dismissPrompt}>
              {t("v2.focusMicroSuggestSkip")}
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
              href="/dump"
              className="text-[14px] font-medium no-underline"
              style={{ color: "var(--accent)" }}
            >
              {t("v2.homeToDump")}
            </Link>
          );
        case "day1_skip_hook":
          return (
            <button
              type="button"
              className="text-[14px] font-medium"
              style={{ color: "var(--accent)", background: "none", border: "none", padding: 0, cursor: "pointer" }}
              onClick={() => go("/dagstart?start=energy")}
            >
              {t("v2.homeToDayStart")}
            </button>
          );
        case "widget_hint":
          return (
            <button
              type="button"
              className="text-[14px] font-medium"
              style={{ color: "var(--accent)", background: "none", border: "none", padding: 0, cursor: "pointer" }}
              onClick={() => go("/dagstart?start=energy")}
            >
              {t("v2.homeToDayStart")}
            </button>
          );
        case "open_task_reminder":
          return (
            <button
              type="button"
              className="text-[14px] font-medium"
              style={{ color: "var(--accent)", background: "none", border: "none", padding: 0, cursor: "pointer" }}
              onClick={() => go("/focus")}
            >
              {t("v2.homeToFocus")}
            </button>
          );
        default:
          return null;
      }
    })();

    const dismissLabel =
      homePrompt.kind === "morning_reminder"
        ? t("v2.focusMicroSuggestSkip")
        : homePrompt.kind === "quote"
          ? t("v2.homeNotToday")
          : t("v2.homeNotToday");

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

  const isBottomPrompt = homePrompt?.kind === "why_suggestion";
  const promptAtTop = cycleSetupOpen || (!isBottomPrompt && Boolean(homePrompt));

  return (
    <V2InstallGate>
    <>
    <V2AppShell
      scroll={!inPlaceShutdown}
      bottomSlot={
        isBottomPrompt && !cycleSetupOpen && !inPlaceShutdown ? (
          <div className="v2-evening-cloud-slot">
            {renderPrompt()}
          </div>
        ) : null
      }
    >
      {inPlaceShutdown ? (
        <ShutdownV2Client
          embedded
          onExit={() => setInPlaceShutdown(false)}
        />
      ) : (
      <div className="v2-home">
        {promptAtTop ? <div className="v2-home__prompt">{renderPrompt()}</div> : null}

        <header className="v2-home__head">
          <div>
            <p className="v2-home__date">
              <i aria-hidden />
              {dateLabel}
            </p>
            <h1 className="v2-home__greet">{headline}</h1>
          </div>
          {ready && showEnergyChip && energyMeta && energyChipLabel ? (
            <span
              className="v2-home-chip"
              title={energyAria ?? energyChipLabel}
              aria-label={energyAria ?? energyChipLabel}
            >
              <span className="v2-home-chip__battery" aria-hidden>
                <Battery
                  level={energyMeta.level}
                  color={energyMeta.color}
                  mutedColor={HOME_BATTERY_MUTED}
                  size={24}
                />
              </span>
              {energyChipLabel}
            </span>
          ) : null}
        </header>

        {!ready ? (
          <StructuroLogoLoading
            fullScreen={false}
            className="min-h-[40vh] bg-transparent py-10"
            size={72}
          />
        ) : state.todayDone ? (
              <div className="v2-home__body">
                <section className="v2-home-page v2-fade" aria-live="polite">
                  <span className="v2-home-kicker">{t("v2.homeDoneEyebrow")}</span>
                  <h2 className="v2-home-page__title">{t("v2.homeDoneTitle")}</h2>
                  <p className="v2-home-lede">{t("v2.homeDoneBody")}</p>
                  <div className="v2-home-closed">
                    <i className="v2-home-closed__stub" aria-hidden />
                    <i className="v2-home-closed__tick" aria-hidden>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M4.5 12.6l5 5.2L19.5 6.6"
                          stroke="currentColor"
                          strokeWidth="2.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </i>
                    <span>{closedLine}</span>
                  </div>
                </section>
                <button
                  type="button"
                  onClick={() => update({ todayDone: false })}
                  className="v2-home-escape v2-home-escape--teal"
                >
                  {t("v2.homeDoneMore")}
                </button>
                <p className="v2-home-under">{t("v2.homeDoneTomorrow")}</p>
              </div>
            ) : hasThings && activeThing ? (
              <>
                <div className="v2-home__body v2-home__body--top">
                  <section className="v2-home-page v2-fade">
                    <div className="v2-home-page__top">
                      <span className="v2-home-kicker">{t("v2.focusNow")}</span>
                      <span
                        className="v2-home-count"
                        aria-label={t("v2.homeTaskOfAria", {
                          n: String(taskOrdinal),
                          m: String(taskCount),
                        })}
                      >
                        {t("v2.homeTaskOf", {
                          n: String(taskOrdinal),
                          m: String(taskCount),
                        })}
                      </span>
                    </div>
                    <h2 className="v2-home-page__hero">{activeThing}</h2>
                    {activeEnergyLabel || activeDurationLabel ? (
                      <p className="v2-home-meta">
                        {activeEnergyLabel ? (
                          <span className="v2-home-meta__lbl">
                            <V2TaskBattery
                              energy={activeDayEnergy}
                              size={24}
                              mutedColor={HOME_BATTERY_MUTED}
                            />
                            {activeEnergyLabel}
                          </span>
                        ) : null}
                        {activeEnergyLabel && activeDurationLabel ? (
                          <i className="v2-home-meta__sep" aria-hidden />
                        ) : null}
                        {activeDurationLabel ? (
                          <span>{activeDurationLabel}</span>
                        ) : null}
                      </p>
                    ) : null}

                    {microSteps.length > 0 ? (
                      <>
                        <div
                          className="v2-home-rail v2-home-rail--ruled"
                          aria-label={t("v2.focusMicroListAria")}
                        >
                          <i className="v2-home-rail__line" aria-hidden />
                          {microSteps.map((step, idx) => {
                            const isNext = !step.done && idx === activeMicroIdx;
                            const stepState = step.done
                              ? "done"
                              : isNext
                                ? "next"
                                : "todo";
                            return (
                              <button
                                key={step.id}
                                type="button"
                                onClick={() => toggleMicroStep(step.id)}
                                className="v2-home-step"
                                data-state={stepState}
                                aria-pressed={step.done}
                              >
                                <i className="v2-home-step__dot" aria-hidden />
                                <span className="v2-home-step__txt">{step.title}</span>
                              </button>
                            );
                          })}
                        </div>
                        {allMicrosDone ? (
                          <p className="v2-done-ack v2-done-ack--block" role="status">
                            {t("v2.doneAckLastStep")}
                          </p>
                        ) : null}
                        {suggestError ? (
                          <p className="v2-home-micro-suggest__err">{suggestError}</p>
                        ) : null}
                      </>
                    ) : showMicroSuggest ? (
                      <section className="v2-home-micro-suggest" aria-live="polite">
                        <p className="v2-home-micro-suggest__title">
                          {t("v2.focusMicroSuggestTitle")}
                        </p>
                        <p className="v2-home-micro-suggest__lead">
                          {t("v2.focusMicroSuggestLead")}
                        </p>
                        <button
                          type="button"
                          onClick={() => void applySuggestedSteps()}
                          disabled={suggestBusy}
                          className="btn-primary w-full"
                        >
                          {suggestBusy
                            ? t("v2.focusMicroSuggestBusy")
                            : t("v2.focusMicroSuggestCta")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSuggestDismissed(true)}
                          className="v2-link mt-2 w-full text-center"
                        >
                          {t("v2.focusMicroSuggestSkip")}
                        </button>
                        {suggestError ? (
                          <p className="v2-home-micro-suggest__err">{suggestError}</p>
                        ) : null}
                      </section>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSuggestDismissed(false);
                          void applySuggestedSteps();
                        }}
                        disabled={suggestBusy}
                        className="v2-link mt-2 w-full text-center"
                      >
                        {suggestBusy
                          ? t("v2.focusMicroSuggestBusy")
                          : t("v2.focusMicroSuggestRetry")}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        go(`/focus?thing=${encodeURIComponent(activeThing)}`)
                      }
                      className="btn-primary v2-home-primary"
                    >
                      {t("v2.focusStart")}
                    </button>
                    {things.length > 1 ? (
                      <button
                        type="button"
                        className="v2-home-escape"
                        onClick={() =>
                          setHeroIndex((prev) => (prev + 1) % things.length)
                        }
                      >
                        {t("v2.homeOtherTask")}
                      </button>
                    ) : null}
                  </section>

                  {restThings.length > 0 ? (
                    <div className="v2-home-rest">
                      <b>{t("v2.homeRestLabel")}</b>
                      {restThings.map((thing) => {
                        const restTask = findV2TaskByTitle(tasks, thing);
                        const restEnergy = v2TaskEnergyToDay(restTask?.energy ?? null);
                        const stepCount = restTask?.microSteps.length ?? 0;
                        return (
                          <button
                            key={thing}
                            type="button"
                            className="v2-home-rest__row"
                            onClick={() => {
                              const idx = things.indexOf(thing);
                              if (idx >= 0) setHeroIndex(idx);
                            }}
                          >
                            <span className="v2-home-rest__rt">
                              <V2TaskBattery
                                energy={restEnergy}
                                size={22}
                                mutedColor={HOME_BATTERY_MUTED}
                              />
                              {thing}
                            </span>
                            {stepCount > 0 ? (
                              <span className="v2-home-rest__count">
                                {stepCount === 1
                                  ? t("v2.homeStepsCountOne")
                                  : t("v2.homeStepsCount", { n: String(stepCount) })}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
                <p className="v2-home-foot">{t("v2.homeNoMore")}</p>
              </>
            ) : (
              <div className="v2-home__body">
                <section className="v2-home-page v2-fade">
                  <span className="v2-home-kicker">{t("v2.homeEmptyEyebrow")}</span>
                  <h2 className="v2-home-page__title">{t("v2.homeEmptyTitle")}</h2>
                  <p className="v2-home-lede">{t("v2.homeEmptyBody")}</p>
                  <div className="v2-home-rail v2-home-rail--plain">
                    <i className="v2-home-rail__line" aria-hidden />
                    {DAYSTART_RAIL.map(([titleKey, hintKey], i) => (
                      <div
                        key={titleKey}
                        className={`v2-home-q${i === 0 ? " is-on" : ""}`}
                      >
                        <i className="v2-home-q__dot" aria-hidden />
                        <b>{t(titleKey)}</b>
                        <span>{t(hintKey)}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => go("/dagstart?start=energy")}
                    className="btn-primary v2-home-primary"
                  >
                    {t("v2.homeDoDayStart")}
                  </button>
                  <div className="v2-home-also">
                    <b>{t("v2.homeAlsoPossible")}</b>
                    <div className="v2-home-also__links">
                      <button
                        type="button"
                        onClick={() => go("/todo")}
                      >
                        {t("v2.homeEmptyNotNow")}
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            )}
      </div>
      )}
    </V2AppShell>
    <V2ShellWelcomeSheet />
    </>
    </V2InstallGate>
  );
}
