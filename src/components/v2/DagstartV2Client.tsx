"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";

import { V2Header, V2Page, V2Reassurance } from "./V2Chrome";
import {
  v2FlowLayoutForDagstartPhase,
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
import { recordV2EnergyForToday } from "./v2Adaptive";
import V2IntroStep from "./V2IntroStep";
import V2ProgressDots from "./V2ProgressDots";
import { trackV2DagstartComplete } from "./v2Analytics";

/** Energy/adjust/done: CycleRing e.d. niet in welcome first paint. */
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
 * Zelfde design-phone flow als onboarding:
 * welcome → energy+voorstellen → klaar. Escape: zelf aanpassen.
 */
type Phase = "welcome" | "energy" | "adjust" | "done";
const TOTAL_STEPS = 3;

/** welcome=0 (geen bar), energy=1, adjust=2, done=3 */
function stepNumberFor(phase: Phase): number {
  if (phase === "welcome") return 0;
  if (phase === "energy") return 1;
  if (phase === "adjust") return 2;
  return 3;
}

export default function DagstartV2Client() {
  const go = useV2Go();
  const { state, update } = useV2();
  const [phase, setPhase] = useState<Phase>("welcome");
  const [history, setHistory] = useState<Phase[]>([]);
  const [selectedThings, setSelectedThings] = useState<string[]>([]);

  const maxSlots = v2MaxSlotsForEnergy(state.energy);
  const things = v2NormalizeThings(state.things);

  const proposals = useMemo(
    () => (state.energy ? v2StructuroThingPicks(state.energy, maxSlots) : []),
    [state.energy, maxSlots],
  );

  const adjustOptions = useMemo(
    () => v2BuildAdjustOptions(state.energy, selectedThings),
    [state.energy, selectedThings],
  );

  useEffect(() => {
    scrollV2ToTop();
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

  const finishThings = (nextThings: string[]) => {
    const normalized = v2NormalizeThings(nextThings);
    update({ things: normalized, todayDone: false });
    if (state.energy) recordV2EnergyForToday(state.energy);
    trackV2DagstartComplete({
      energy: state.energy,
      thingCount: normalized.length,
      hasWhy: state.why.trim().length > 0,
    });
    goTo("done");
  };

  const pickEnergy = (energy: V2Energy) => {
    recordV2EnergyForToday(energy);
    update({ energy });
    setSelectedThings(v2StructuroThingPicks(energy, v2MaxSlotsForEnergy(energy)));
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

  const toHome = () => go("/v2/home");
  const finishDay = () => go("/v2/home", { todayDone: true });

  const canGoBack =
    history.length > 0 && phase !== "welcome" && phase !== "done";
  const flowLayout = v2FlowLayoutForDagstartPhase(phase);
  const isWelcome = phase === "welcome";
  const showReassurance = phase === "energy" || phase === "done";

  const beginIntro = () => {
    // Frisse keuze: geen pre-select "Genoeg". Pills eerst, voorstellen live.
    setSelectedThings([]);
    update({ energy: null });
    goTo("energy");
  };

  return (
    <V2Page>
      {!isWelcome ? (
        <>
          <V2Header
            exitHref="/v2/home"
            exitLabel="Stoppen"
            onBack={canGoBack ? goBack : undefined}
            brandMode="flow"
          />
          <V2ProgressDots
            step={stepNumberFor(phase)}
            total={TOTAL_STEPS}
            showLabel={false}
          />
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
                  proposals={selectedThings.length > 0 ? selectedThings : proposals}
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
                  onContinue={toHome}
                  continueLabel="Naar je dag"
                  secondary={
                    <button type="button" className="v2-link" onClick={finishDay}>
                      Vandaag al genoeg
                    </button>
                  }
                />
              ) : null}
            </section>
            {showReassurance ? (
              <V2Reassurance>Stoppen kan altijd.</V2Reassurance>
            ) : null}
          </div>
        </div>
      )}
    </V2Page>
  );
}
