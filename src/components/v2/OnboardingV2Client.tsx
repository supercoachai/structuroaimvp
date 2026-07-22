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
import V2ProgressDots from "./V2ProgressDots";
import {
  trackV2OnboardingDone,
  trackV2OnboardingEnergy,
  trackV2OnboardingStep,
  trackV2OnboardingTasks,
} from "./v2OnboardingFunnel";
import { useI18n } from "@/lib/i18n";

/** Latere fases: heroicons niet in welcome-bundle. */
const V2ProposeStep = dynamic(() => import("./V2ProposeStep"), {
  ssr: false,
  loading: () => null,
});
const V2AdjustStep = dynamic(() => import("./V2AdjustStep"), {
  ssr: false,
  loading: () => null,
});
const V2DoneStep = dynamic(() => import("./V2DoneStep"), {
  ssr: false,
  loading: () => null,
});

/**
 * Happy path: welcome → energy+voorstellen → klaar → home.
 * Geen naam/register in dit pad (naam bij account).
 * Cyclus: compacte toggle op energy (Zonder/Cyclus), live orb-transform.
 * Escape: zelf aanpassen. Geen save-CTA op done.
 * Progress: 2 segmenten; welcome telt niet. Adjust deelt energy.
 */
type Phase = "welcome" | "energy" | "adjust" | "done";

const TOTAL_STEPS = 2;

/** Progress na welcome: energy/adjust=1, done=2. */
function stepNumberFor(phase: Phase): number {
  switch (phase) {
    case "welcome":
      return 0;
    case "energy":
    case "adjust":
      return 1;
    case "done":
      return 2;
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
  const [selectedThings, setSelectedThings] = useState<string[]>([]);
  const replayHandled = useRef(false);

  useEffect(() => {
    if (replayHandled.current) return;
    if (searchParams.get("replay") !== "1") return;
    replayHandled.current = true;
    setPhase("welcome");
    setHistory([]);
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
  }, [phase]);

  useEffect(() => {
    if (phase === "welcome") trackV2OnboardingStep("welcome");
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
  const canGoBack = history.length > 0 && phase !== "welcome" && phase !== "done";
  const isWelcome = phase === "welcome";

  const pickEnergy = (energy: V2Energy) => {
    update({ energy });
    setSelectedThings(
      v2StructuroThingPicks(energy, v2MaxSlotsForEnergy(energy), locale),
    );
    trackV2OnboardingEnergy(energy);
  };

  const beginIntro = () => {
    setSelectedThings([]);
    update({ energy: null });
    goTo("energy");
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
    trackV2OnboardingDone({
      energy: state.energy,
      thingCount: things.length,
      cycleOptIn: state.cyclusOptIn,
    });
    go("/v2/home", { todayDone: false });
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
              key={phase}
              className="v2-fade"
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
                  showCycleToggle
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
      )}
    </V2Page>
  );
}
