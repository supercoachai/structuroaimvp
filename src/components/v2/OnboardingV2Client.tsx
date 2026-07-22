"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import V2IntroStep from "./V2IntroStep";
import type { V2CycleOptInStage } from "./V2CycleOptInStep";
import V2ProgressDots from "./V2ProgressDots";
import V2AccountSaveCta from "./V2AccountSaveCta";
import { patchV2Settings } from "./v2Settings";
import { useI18n } from "@/lib/i18n";

/** Latere fases: CycleRing/heroicons/setup niet in welcome-bundle. */
const V2ProposeStep = dynamic(() => import("./V2ProposeStep"), {
  ssr: false,
  loading: () => null,
});
const V2AdjustStep = dynamic(() => import("./V2AdjustStep"), {
  ssr: false,
  loading: () => null,
});
const V2CycleOptInStep = dynamic(() => import("./V2CycleOptInStep"), {
  ssr: false,
  loading: () => null,
});
const V2DoneStep = dynamic(() => import("./V2DoneStep"), {
  ssr: false,
  loading: () => null,
});

/**
 * Design-phone happy path: welcome → cyclus intro → (bij Ja: setup) → energy+voorstellen → klaar.
 * Escape: zelf aanpassen (checkbox). Geen pick_who / swipe.
 * Progress: 3 segmenten; welcome telt niet. Cycle intro+setup delen stap 1; adjust deelt stap met energy.
 * Cyclus vóór energy: orb-ring + fase-label + info-sheet op propose (geen chip).
 */
type Phase = "welcome" | "cycle" | "energy" | "adjust" | "done";

const TOTAL_STEPS = 3;

/** Progress na welcome: cycle=1, energy/adjust=2, done=3. Welcome heeft geen bar. */
function stepNumberFor(phase: Phase): number {
  switch (phase) {
    case "welcome":
      return 0;
    case "cycle":
      return 1;
    case "energy":
    case "adjust":
      return 2;
    case "done":
      return 3;
  }
}

export default function OnboardingV2Client() {
  const go = useV2Go();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useI18n();
  const { state, update } = useV2();
  const [phase, setPhase] = useState<Phase>("welcome");
  const [history, setHistory] = useState<Phase[]>([]);
  const [cycleStage, setCycleStage] = useState<V2CycleOptInStage>("intro");
  const [selectedThings, setSelectedThings] = useState<string[]>([]);
  const replayHandled = useRef(false);

  useEffect(() => {
    if (replayHandled.current) return;
    if (searchParams.get("replay") !== "1") return;
    replayHandled.current = true;
    setPhase("welcome");
    setHistory([]);
    setCycleStage("intro");
    setSelectedThings([]);
    router.replace("/v2/onboarding", { scroll: false });
  }, [router, searchParams]);

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
  }, [phase, cycleStage]);

  const goTo = useCallback(
    (next: Phase) => {
      setHistory((prev) => [...prev, phase]);
      setPhase(next);
    },
    [phase],
  );

  const goBack = useCallback(() => {
    if (phase === "cycle" && cycleStage === "setup") {
      setCycleStage("intro");
      return;
    }
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      setPhase(prev[prev.length - 1]);
      return prev.slice(0, prev.length - 1);
    });
  }, [phase, cycleStage]);

  const stepNumber = stepNumberFor(phase);
  const canGoBack =
    (phase === "cycle" && cycleStage === "setup") ||
    (history.length > 0 && phase !== "welcome" && phase !== "done");
  const isWelcome = phase === "welcome";

  const pickEnergy = (energy: V2Energy) => {
    update({ energy });
    setSelectedThings(
      v2StructuroThingPicks(energy, v2MaxSlotsForEnergy(energy), locale),
    );
  };

  const proceedToEnergy = (extra?: { cyclusOptIn?: boolean }) => {
    // Geen pre-select: eerst energie-pill, dan voorstellen (één lus).
    setSelectedThings([]);
    update({
      energy: null,
      ...(extra?.cyclusOptIn ? { cyclusOptIn: true } : {}),
    });
    goTo("energy");
  };

  const enableCycle = () => {
    setCycleStage("setup");
  };

  const skipCycle = () => {
    setCycleStage("intro");
    proceedToEnergy();
  };

  const completeCycleSetup = async (
    lastPeriodStart: string,
    averageLength: number,
    menstruationDuration: number,
  ) => {
    patchV2Settings({
      lastPeriodStart,
      cycleLength: averageLength,
      menstruationDuration,
    });
    proceedToEnergy({ cyclusOptIn: true });
  };

  const finishThings = (nextThings: string[]) => {
    update({ things: v2NormalizeThings(nextThings), todayDone: false });
    goTo("done");
  };

  const confirmProposals = () => {
    const picks = selectedThings.length > 0 ? selectedThings : proposals;
    finishThings(picks);
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
    go("/v2/home", { todayDone: false });
  };

  const beginIntro = () => {
    setCycleStage("intro");
    goTo("cycle");
  };

  const flowLayout = v2FlowLayoutForOnboardingPhase(phase);
  const showReassurance = phase === "energy" || phase === "done";

  return (
    <V2Page>
      {!isWelcome ? (
        <>
          <V2Header
            exitHref="/v2"
            exitLabel={t("v2.flowStop")}
            onBack={canGoBack ? goBack : undefined}
            brandMode="flow"
          />
          <V2ProgressDots step={stepNumber} total={TOTAL_STEPS} showLabel={false} />
        </>
      ) : null}

      {isWelcome ? (
        <V2IntroStep onBegin={beginIntro} />
      ) : (
        <div style={v2Styles.flowShell}>
          <div style={v2FlowWrapStyle(flowLayout)}>
            <section
              key={`${phase}-${cycleStage}`}
              className="v2-fade"
              style={
                phase === "energy" || phase === "cycle"
                  ? v2Styles.cardEnergy
                  : v2Styles.card
              }
              aria-live="polite"
            >
              {phase === "cycle" ? (
                <V2CycleOptInStep
                  stage={cycleStage}
                  onEnable={enableCycle}
                  onSkip={skipCycle}
                  onSetupSubmit={completeCycleSetup}
                />
              ) : null}

              {phase === "energy" ? (
                <V2ProposeStep
                  energy={state.energy}
                  proposals={
                    selectedThings.length > 0 ? selectedThings : proposals
                  }
                  onPickEnergy={pickEnergy}
                  onConfirm={confirmProposals}
                  onAdjust={openAdjust}
                />
              ) : null}

              {phase === "adjust" ? (
                <V2AdjustStep
                  options={adjustOptions}
                  selected={selectedThings}
                  maxSlots={maxSlots}
                  onToggle={toggleAdjust}
                  onConfirm={() => finishThings(selectedThings)}
                  onSkip={() => finishThings([])}
                />
              ) : null}

              {phase === "done" ? (
                <V2DoneStep
                  things={things}
                  onContinue={finish}
                  continueLabel={t("v2.flowToDay")}
                  secondary={
                    <V2AccountSaveCta content="v2_onboarding_done" />
                  }
                />
              ) : null}
            </section>
            {showReassurance ? (
              <V2Reassurance>{t("v2.flowAlwaysStop")}</V2Reassurance>
            ) : null}
          </div>
        </div>
      )}
    </V2Page>
  );
}
