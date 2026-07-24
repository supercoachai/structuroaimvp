"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { V2Header, V2Page, V2Reassurance } from "./V2Chrome";
import {
  v2FlowLayoutForOnboardingPhase,
  v2FlowWrapStyle,
  v2Styles,
} from "./theme";
import { scrollV2ToTop, useV2Go } from "./v2nav";
import { useV2, type V2Energy } from "./V2Context";
import {
  v2BuildAdjustOptions,
  v2MaxSlotsForEnergy,
  v2NormalizeThings,
  v2StructuroThingPicks,
} from "./v2Things";
import V2LanguageToggle from "./V2LanguageToggle";
import V2ProgressDots from "./V2ProgressDots";
import { shouldShowV2CycleDiscovery } from "./v2FlowGates";
import { dismissCycleOptInPrompt } from "./v2CycleOptInPrompt";
import {
  trackV2OnboardingDone,
  trackV2OnboardingEnergy,
  trackV2OnboardingStep,
  trackV2OnboardingTasks,
} from "./v2OnboardingFunnel";
import { useI18n } from "@/lib/i18n";
import { patchV2Settings } from "./v2Settings";
import V2ProposeStep from "./V2ProposeStep";
import V2AdjustStep from "./V2AdjustStep";
import V2DoneStep from "./V2DoneStep";

/**
 * Eerste reis + replay: energy+voorstellen → klaar → home.
 * Geen welkom-intro. Soft cyclus-discovery alleen voor guests; accounts in settings.
 * Escape: zelf aanpassen. Progress: 2 segmenten; adjust deelt energy.
 *
 * INITIAL_PHASE is altijd "energy" (SSR = client, geen hydration-mismatch).
 */
type Phase = "energy" | "adjust" | "done";

const TOTAL_STEPS = 2;

function stepNumberFor(phase: Phase): number {
  switch (phase) {
    case "energy":
    case "adjust":
      return 1;
    case "done":
      return 2;
  }
}

const INITIAL_PHASE: Phase = "energy";

export default function OnboardingV2Client() {
  const go = useV2Go();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useI18n();
  const { state, update, ready } = useV2();
  const [phase, setPhase] = useState<Phase>(INITIAL_PHASE);
  const [history, setHistory] = useState<Phase[]>([]);
  const [selectedThings, setSelectedThings] = useState<string[]>([]);
  // Auth-hint alleen na mount; false is SSR-veilig (discovery zit niet in first paint).
  const [showCycleDiscover, setShowCycleDiscover] = useState(false);
  const replayHandled = useRef(false);
  const freshStartHandled = useRef(false);
  /** Voorkomt dat frisse-start-reset een snelle energieklik wist. */
  const userPickedEnergy = useRef(false);

  const resetToEnergy = useCallback(() => {
    setSelectedThings([]);
    update({ energy: null });
    setPhase("energy");
    setHistory([]);
  }, [update]);

  useEffect(() => {
    if (replayHandled.current) return;
    if (searchParams.get("replay") !== "1") return;
    replayHandled.current = true;
    freshStartHandled.current = true;
    userPickedEnergy.current = false;
    resetToEnergy();
    router.replace("/v2/onboarding", { scroll: false });
  }, [resetToEnergy, router, searchParams]);

  // Pas ná provider-ready: anders wist frisse-start een lege pre-hydrate state,
  // of late hydrate overschrijft een snelle energieklik.
  useLayoutEffect(() => {
    if (!ready) return;
    if (freshStartHandled.current) return;
    if (userPickedEnergy.current) return;
    freshStartHandled.current = true;
    resetToEnergy();
  }, [ready, resetToEnergy]);

  // Auth-hint na mount (SSR-veilig). Guests: soft cyclus-discovery; accounts: settings.
  useEffect(() => {
    setShowCycleDiscover(shouldShowV2CycleDiscovery());
  }, []);

  const maxSlots = v2MaxSlotsForEnergy(state.energy);
  const things = v2NormalizeThings(state.things);

  const proposals = useMemo(
    () =>
      state.energy
        ? v2StructuroThingPicks(state.energy, maxSlots, locale)
        : [],
    [state.energy, maxSlots, locale],
  );

  const adjustOptions = useMemo(
    () => v2BuildAdjustOptions(state.energy, selectedThings, 8, locale),
    [state.energy, selectedThings, locale],
  );

  useEffect(() => {
    scrollV2ToTop();
  }, [phase]);

  useEffect(() => {
    if (phase === "energy") trackV2OnboardingStep("energy");
  }, [phase]);

  const goTo = useCallback(
    (next: Phase) => {
      setHistory((prev) => [...prev, phase]);
      setPhase(next);
    },
    [phase],
  );

  const goBack = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      setPhase(prev[prev.length - 1]);
      return prev.slice(0, prev.length - 1);
    });
  }, []);

  const stepNumber = stepNumberFor(phase);
  // Ook op klaar/confirm: terug naar propose of adjust (niet Stoppen).
  const canGoBack = history.length > 0;

  const pickEnergy = (energy: V2Energy) => {
    userPickedEnergy.current = true;
    freshStartHandled.current = true;
    update({ energy });
    setSelectedThings(
      v2StructuroThingPicks(energy, v2MaxSlotsForEnergy(energy), locale),
    );
    trackV2OnboardingEnergy(energy);
  };

  const finishThings = (nextThings: string[], adjusted: boolean) => {
    const normalized = v2NormalizeThings(nextThings);
    update({ things: normalized, todayDone: false });
    trackV2OnboardingTasks({
      energy: state.energy,
      thingCount: normalized.length,
      adjusted,
    });
    goTo("done");
  };

  const confirmProposals = () => {
    const picks = selectedThings.length > 0 ? selectedThings : proposals;
    finishThings(picks, false);
  };

  const openAdjust = () => {
    const picks = selectedThings.length > 0 ? selectedThings : proposals;
    setSelectedThings(picks);
    goTo("adjust");
  };

  const toggleAdjust = (title: string) => {
    setSelectedThings((prev) => {
      if (prev.includes(title)) return prev.filter((x) => x !== title);
      if (prev.length >= maxSlots) return prev;
      return [...prev, title];
    });
  };

  const finish = () => {
    // Onboarding toonde de cycluskeuze (of account had die al): geen home-nag.
    dismissCycleOptInPrompt();
    trackV2OnboardingDone({
      energy: state.energy,
      thingCount: things.length,
      cycleOptIn: state.cyclusOptIn,
    });
    go("/v2/home", { todayDone: false });
  };

  const flowLayout = v2FlowLayoutForOnboardingPhase(phase);
  const showReassurance = phase === "energy" || phase === "done";
  const langTrailing =
    phase === "energy" ? (
      <V2LanguageToggle
        onChange={(next) => {
          patchV2Settings({ locale: next });
        }}
      />
    ) : undefined;

  return (
    <V2Page>
      <V2Header
        exitHref="https://www.structuro.eu"
        exitLabel={t("v2.flowStop")}
        onBack={canGoBack ? goBack : undefined}
        trailing={langTrailing}
        brandMode="flow"
      />
      <V2ProgressDots step={stepNumber} total={TOTAL_STEPS} showLabel={false} />

      <div style={v2Styles.flowShell}>
        <div style={v2FlowWrapStyle(flowLayout)}>
          <section
            style={phase === "energy" ? v2Styles.cardEnergy : v2Styles.card}
            aria-live="polite"
          >
            {phase === "energy" ? (
              <V2ProposeStep
                energy={state.energy}
                proposals={
                  selectedThings.length > 0 ? selectedThings : proposals
                }
                onPickEnergy={pickEnergy}
                onConfirm={confirmProposals}
                onAdjust={openAdjust}
                showCycleDiscover={showCycleDiscover}
              />
            ) : null}

            {phase === "adjust" ? (
              <V2AdjustStep
                options={adjustOptions}
                selected={selectedThings}
                maxSlots={maxSlots}
                onToggle={toggleAdjust}
                onConfirm={() => finishThings(selectedThings, true)}
                onSkip={() => finishThings([], true)}
              />
            ) : null}

            {phase === "done" ? (
              <V2DoneStep
                things={things}
                onContinue={finish}
                continueLabel={t("v2.flowToDay")}
              />
            ) : null}
          </section>
          {showReassurance ? (
            <V2Reassurance>{t("v2.flowAlwaysStop")}</V2Reassurance>
          ) : null}
        </div>
      </div>
    </V2Page>
  );
}
