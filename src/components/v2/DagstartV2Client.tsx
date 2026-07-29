"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { V2FlowStickyChrome, V2Header, V2Page, V2Reassurance } from "./V2Chrome";
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
import V2ProgressDots from "./V2ProgressDots";
import { trackV2DagstartComplete } from "./v2Analytics";
import { useI18n } from "@/lib/i18n";
import { setDagstartCookieOnClient } from "@/lib/dagstartCookie";
import { createClient } from "@/lib/supabase/client";
import {
  updateProfileAfterDagstartComplete,
  type DagstartEnergy,
} from "@/lib/supabase/profileDagstartDb";
import V2ProposeStep from "./V2ProposeStep";
import V2AdjustStep from "./V2AdjustStep";
import V2DoneStep from "./V2DoneStep";

function mapV2EnergyToProfile(energy: V2Energy | null): DagstartEnergy {
  if (energy === "low") return "low";
  if (energy === "high") return "high";
  return "medium";
}

/**
 * Dagelijkse dagstart (terugkerend / met account):
 * energy+voorstellen → klaar. Geen welkom-intro (ook onboarding start bij energy).
 * Geen cyclus aan/uit-toggle: voorkeur zit in settings; status-ring mag wél.
 * Escape: zelf aanpassen.
 */
type Phase = "energy" | "adjust" | "done";
const TOTAL_STEPS = 3;

/** energy=1, adjust=2, done=3 */
function stepNumberFor(phase: Phase): number {
  if (phase === "energy") return 1;
  if (phase === "adjust") return 2;
  return 3;
}

export default function DagstartV2Client() {
  const go = useV2Go();
  const { t, locale } = useI18n();
  const { state, update, ready } = useV2();
  const freshEnergyRef = useRef(false);
  const userPickedEnergy = useRef(false);

  const [phase, setPhase] = useState<Phase>("energy");
  const [history, setHistory] = useState<Phase[]>([]);
  const [selectedThings, setSelectedThings] = useState<string[]>([]);
  /**
   * Lokale draft voor een frisse pill-keuze. Nooit `state.energy` wissen bij mount:
   * anders verdwijnt de home-chip als je dagstart opent en weer weggaat (Stoppen/back).
   */
  const [draftEnergy, setDraftEnergy] = useState<V2Energy | null>(null);

  const energy = draftEnergy;
  const maxSlots = v2MaxSlotsForEnergy(energy);
  const things = v2NormalizeThings(state.things);

  const proposals = useMemo(
    () =>
      energy ? v2StructuroThingPicks(energy, maxSlots, locale) : [],
    [energy, maxSlots, locale],
  );

  const adjustOptions = useMemo(
    () => v2BuildAdjustOptions(energy, selectedThings, 8, locale),
    [energy, selectedThings, locale],
  );

  // Pas ná provider-ready: frisse UI-keuze zonder hydrate-race of journey-wipe.
  useLayoutEffect(() => {
    if (!ready) return;
    if (freshEnergyRef.current) return;
    if (userPickedEnergy.current) return;
    freshEnergyRef.current = true;
    setSelectedThings([]);
    setDraftEnergy(null);
    setPhase("energy");
    setHistory([]);
  }, [ready]);

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

  const finishThings = async (nextThings: string[]) => {
    const normalized = v2NormalizeThings(nextThings);
    const nextEnergy = energy ?? state.energy;
    update({
      things: normalized,
      todayDone: false,
      ...(nextEnergy ? { energy: nextEnergy } : {}),
    });
    if (nextEnergy) recordV2EnergyForToday(nextEnergy);
    trackV2DagstartComplete({
      energy: nextEnergy,
      thingCount: normalized.length,
      hasWhy: state.why.trim().length > 0,
    });
    // Middleware gate leest profiles.last_dagstart_date; zonder write → redirect-lus.
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) {
        await updateProfileAfterDagstartComplete(
          user.id,
          mapV2EnergyToProfile(nextEnergy)
        );
        setDagstartCookieOnClient();
      }
    } catch (err) {
      console.warn("v2 dagstart profile update:", err);
    }
    goTo("done");
  };

  const pickEnergy = (next: V2Energy) => {
    userPickedEnergy.current = true;
    freshEnergyRef.current = true;
    setDraftEnergy(next);
    recordV2EnergyForToday(next);
    update({ energy: next });
    setSelectedThings(
      v2StructuroThingPicks(next, v2MaxSlotsForEnergy(next), locale),
    );
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

  const toHome = () => go("/");
  const finishDay = () => go("/", { todayDone: true });

  // Ook op klaar/confirm: terug naar propose of adjust (niet Stoppen).
  const canGoBack = history.length > 0;
  const flowLayout = v2FlowLayoutForDagstartPhase(phase);
  const showReassurance = phase === "energy";

  return (
    <V2Page>
      <V2FlowStickyChrome>
        <V2Header
          exitHref="/"
          exitLabel={t("v2.flowStop")}
          onBack={canGoBack ? goBack : undefined}
          brandMode="flow"
        />
        <V2ProgressDots
          step={stepNumberFor(phase)}
          total={TOTAL_STEPS}
          showLabel={false}
        />
      </V2FlowStickyChrome>

      <div style={v2Styles.flowShell}>
        <div style={v2FlowWrapStyle(flowLayout)}>
          <section
            style={phase === "energy" ? v2Styles.cardEnergy : v2Styles.card}
            aria-live="polite"
          >
            {phase === "energy" ? (
              <V2ProposeStep
                energy={energy}
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
                continueLabel={t("v2.flowToDay")}
                secondary={
                  <button type="button" className="v2-link" onClick={finishDay}>
                    {t("v2.flowEnoughToday")}
                  </button>
                }
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
