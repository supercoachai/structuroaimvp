"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { V2Header, V2Page, V2Progress, V2Reassurance } from "./V2Chrome";
import {
  v2FlowLayoutForOnboardingPhase,
  v2FlowWrapStyle,
  v2Styles,
} from "./theme";
import { scrollV2ToTop, useV2Go } from "./v2nav";
import {
  V2_ENERGY_OPTIONS,
  useV2,
  type V2Energy,
} from "./V2Context";
import {
  v2HasThings,
  v2MaxSlotsForEnergy,
  v2NormalizeThings,
  v2StructuroThingPicks,
  v2SuggestionEnergyLabel,
  v2SuggestionsForDayEnergy,
  v2ThingCounter,
  v2ThingTitle,
} from "./v2Things";
import V2CycleChip, { useV2CycleChip } from "./V2CycleChip";
import V2PickWho from "./V2PickWho";
import V2EnergyStep, { v2GreetingWord } from "./V2EnergyStep";

type Phase =
  | "welcome"
  | "energy"
  | "pick_who"
  | "thing"
  | "thing_custom"
  | "why_intro"
  | "why_outcome"
  | "why_reflect"
  | "done";

const TOTAL_STEPS = 4;

function stepNumberFor(phase: Phase): number {
  switch (phase) {
    case "welcome":
      return 1;
    case "energy":
      return 2;
    case "pick_who":
    case "thing":
    case "thing_custom":
    case "why_intro":
    case "why_outcome":
    case "why_reflect":
      return 3;
    case "done":
      return 4;
  }
}

export default function OnboardingV2Client() {
  const go = useV2Go();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, update } = useV2();
  const [phase, setPhase] = useState<Phase>("welcome");
  const [history, setHistory] = useState<Phase[]>([]);
  const [customThing, setCustomThing] = useState("");
  const [selectedThings, setSelectedThings] = useState<string[]>([]);
  const [suggestedByStructuro, setSuggestedByStructuro] = useState(false);
  const [energySkipped, setEnergySkipped] = useState(false);
  const [greeting, setGreeting] = useState("");
  const cycleChip = useV2CycleChip();
  const replayHandled = useRef(false);

  useEffect(() => {
    setGreeting(v2GreetingWord());
  }, []);

  // Settings "Tour opnieuw" → /v2/onboarding?replay=1
  useEffect(() => {
    if (replayHandled.current) return;
    if (searchParams.get("replay") !== "1") return;
    replayHandled.current = true;
    setPhase("welcome");
    setHistory([]);
    setSelectedThings([]);
    setSuggestedByStructuro(false);
    setEnergySkipped(false);
    setCustomThing("");
    router.replace("/v2/onboarding", { scroll: false });
  }, [router, searchParams]);

  const maxSlots = v2MaxSlotsForEnergy(state.energy);
  const things = v2NormalizeThings(state.things);

  // Bij elke stap-overgang terug naar boven, zodat de kop nooit onder de vouw staat.
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

  const stepNumber = stepNumberFor(phase);
  const canGoBack = history.length > 0 && phase !== "welcome";

  const suggestions = useMemo(
    () => v2SuggestionsForDayEnergy(state.energy),
    [state.energy],
  );

  const finishThings = (nextThings: string[]) => {
    update({ things: v2NormalizeThings(nextThings) });
    goTo("why_intro");
  };

  const selectEnergy = (energy: V2Energy) => {
    update({ energy });
    setSelectedThings([]);
    setSuggestedByStructuro(false);
    setEnergySkipped(false);
    goTo("pick_who");
  };

  const skipEnergy = () => {
    // Overslaan = genoeg als neutrale default, geen oude "hoog"/"laag" meenemen.
    update({ energy: "enough" });
    setSelectedThings([]);
    setSuggestedByStructuro(false);
    setEnergySkipped(true);
    goTo("pick_who");
  };

  const energyLabel =
    V2_ENERGY_OPTIONS.find((o) => o.value === (state.energy ?? "enough"))?.label ??
    "Genoeg";

  const pickStructuro = () => {
    setSelectedThings(v2StructuroThingPicks(state.energy, maxSlots));
    setSuggestedByStructuro(true);
    goTo("thing");
  };

  const pickSelf = () => {
    setSelectedThings([]);
    setSuggestedByStructuro(false);
    goTo("thing");
  };

  const toggleThing = (item: string) => {
    setSuggestedByStructuro(false);
    if (selectedThings.includes(item)) {
      setSelectedThings(selectedThings.filter((x) => x !== item));
      return;
    }
    if (selectedThings.length >= maxSlots) return;
    const next = [...selectedThings, item];
    // Na Structuro-suggestie altijd eerst bevestigen; bij zelf kiezen met 1 slot mag direct door.
    if (maxSlots === 1 && !suggestedByStructuro) {
      finishThings(next);
      return;
    }
    setSelectedThings(next);
  };

  const confirmSelection = () => finishThings(selectedThings);

  const skipThings = () => finishThings([]);

  const confirmCustomThing = () => {
    const trimmed = customThing.trim();
    if (maxSlots === 1) {
      finishThings(trimmed.length > 0 ? [trimmed] : []);
      return;
    }
    if (trimmed.length === 0) {
      goTo("thing");
      return;
    }
    setSelectedThings((prev) => {
      const without = prev.filter((x) => x !== trimmed);
      if (without.length >= maxSlots) return prev;
      return [...without, trimmed].slice(0, maxSlots);
    });
    setCustomThing("");
    goTo("thing");
  };

  const counter = v2ThingCounter(selectedThings.length, maxSlots);

  const submitWhyOutcome = () => {
    if (state.why.trim().length > 0 || state.whyOutcome.trim().length > 0) {
      goTo("why_reflect");
    } else {
      goTo("done");
    }
  };

  const skipWhy = () => goTo("done");

  const finish = () => {
    go("/v2/home", { todayDone: false });
  };

  const showAnchorInDone = state.energy === "low" && state.why.trim().length > 0;
  const flowLayout = v2FlowLayoutForOnboardingPhase(phase);

  return (
    <V2Page>
      <V2Header exitHref="/v2" />
      <V2Progress step={stepNumber} total={TOTAL_STEPS} showReassurance={false} />

      <div style={v2Styles.flowShell}>
        <div style={v2FlowWrapStyle(flowLayout)}>
          <section
            key={phase}
            className="v2-fade"
            style={{
              ...(phase === "energy" ? v2Styles.cardEnergy : v2Styles.card),
              ...(phase === "energy" ? { position: "relative" as const } : null),
            }}
            aria-live="polite"
          >
        {phase === "welcome" && (
          <>
            <h1 style={v2Styles.title}>Even rustig. We doen één ding tegelijk.</h1>
            <p style={v2Styles.body}>
              Je hoeft niks te onthouden en niks goed te doen. Fout bestaat hier niet.
            </p>
            <div style={v2Styles.actions}>
              <button type="button" className="btn-primary w-full" onClick={() => goTo("energy")}>
                Begin
              </button>
            </div>
          </>
        )}

        {phase === "energy" && (
          <>
            {cycleChip ? <V2CycleChip info={cycleChip} /> : null}
            <V2EnergyStep
              greeting={greeting || undefined}
              userName={state.name.trim() || undefined}
              energy={state.energy}
              title="Hoe is je energie?"
              subtitle="Eén tik. Dit bepaalt alleen wat Structuro straks voorstelt."
              onPick={selectEnergy}
              onSkip={skipEnergy}
            />
          </>
        )}

        {phase === "pick_who" && (
          <V2PickWho
            energyLabel={energySkipped ? undefined : energyLabel}
            onStructuro={pickStructuro}
            onSelf={pickSelf}
          />
        )}

        {phase === "thing" && (
          <>
            <h1 style={v2Styles.title}>{v2ThingTitle(maxSlots)}</h1>
            <p style={v2Styles.body}>
              {suggestedByStructuro
                ? "Structuro koos dit bij jouw energie. Pas aan of bevestig."
                : maxSlots === 1
                  ? "Tik op wat past. Meer hoeft niet."
                  : "Tik om te kiezen. Tik nogmaals om af te vinken."}
            </p>
            {counter ? (
              <p style={{ ...v2Styles.body, marginTop: -4, color: "var(--text-muted)" }}>
                {counter}
              </p>
            ) : null}
            <div style={v2Styles.optionList}>
              {suggestions.map((s) => {
                const picked = selectedThings.includes(s.title);
                return (
                  <button
                    key={`${s.energy}:${s.title}`}
                    type="button"
                    className="v2-choice"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                    onClick={() => toggleThing(s.title)}
                    aria-pressed={picked}
                  >
                    <span style={{ textAlign: "left" }}>
                      {picked ? `✓ ${s.title}` : s.title}
                    </span>
                    <span className="v2-meta" style={{ flexShrink: 0 }}>
                      {v2SuggestionEnergyLabel(s.energy)}
                    </span>
                  </button>
                );
              })}
            </div>
            <div style={v2Styles.softActions}>
              {selectedThings.length > 0 ? (
                <button type="button" className="btn-primary w-full" onClick={confirmSelection}>
                  Dit kies ik
                </button>
              ) : null}
              <button
                type="button"
                className="v2-link"
                onClick={() => {
                  setCustomThing("");
                  setSuggestedByStructuro(false);
                  goTo("thing_custom");
                }}
              >
                Iets anders
              </button>
              <button type="button" className="v2-link" onClick={skipThings}>
                Niks kiezen, ook goed
              </button>
            </div>
          </>
        )}

        {phase === "thing_custom" && (
          <>
            <h1 style={v2Styles.title}>Wat zou jouw kleine ding zijn?</h1>
            <p style={v2Styles.body}>
              {maxSlots === 1
                ? "In je eigen woorden. Eén regel is genoeg."
                : "In je eigen woorden. Je komt daarna terug om eventueel meer te kiezen."}
            </p>
            <label htmlFor="v2-custom-thing" style={v2Styles.srOnly}>
              Jouw eigen kleine ding
            </label>
            <input
              id="v2-custom-thing"
              type="text"
              className="v2-field"
              value={customThing}
              onChange={(e) => setCustomThing(e.target.value)}
              placeholder="Bijvoorbeeld: vijf minuten lezen"
              autoComplete="off"
            />
            <div style={v2Styles.actions}>
              <button type="button" className="btn-primary w-full" onClick={confirmCustomThing}>
                {maxSlots === 1 ? "Dit kies ik" : "Toevoegen"}
              </button>
            </div>
          </>
        )}

        {phase === "why_intro" && (
          <>
            <p style={v2Styles.kicker}>Mag ik je iets vragen? Je mag overslaan.</p>
            <h1 style={v2Styles.title}>Waarvoor doe je dit eigenlijk?</h1>
            <p style={v2Styles.body}>Kort, in je eigen woorden. Dit blijft van jou.</p>
            <label htmlFor="v2-why" style={v2Styles.srOnly}>
              Waarvoor doe je dit
            </label>
            <input
              id="v2-why"
              type="text"
              className="v2-field"
              value={state.why}
              onChange={(e) => update({ why: e.target.value })}
              placeholder="Bijvoorbeeld: rust in mijn hoofd"
              autoComplete="off"
            />
            <div style={v2Styles.actions}>
              <button
                type="button"
                className="btn-primary w-full"
                onClick={() => goTo("why_outcome")}
              >
                Volgende
              </button>
              <button type="button" className="v2-link" onClick={skipWhy}>
                Overslaan
              </button>
            </div>
          </>
        )}

        {phase === "why_outcome" && (
          <>
            <h1 style={v2Styles.title}>En wat zou dat je opleveren?</h1>
            <p style={v2Styles.body}>Ook dit mag je overslaan.</p>
            <label htmlFor="v2-why-outcome" style={v2Styles.srOnly}>
              Wat het je oplevert
            </label>
            <input
              id="v2-why-outcome"
              type="text"
              className="v2-field"
              value={state.whyOutcome}
              onChange={(e) => update({ whyOutcome: e.target.value })}
              placeholder="Bijvoorbeeld: meer ruimte voor mezelf"
              autoComplete="off"
            />
            <div style={v2Styles.actions}>
              <button type="button" className="btn-primary w-full" onClick={submitWhyOutcome}>
                Klaar
              </button>
              <button type="button" className="v2-link" onClick={skipWhy}>
                Overslaan
              </button>
            </div>
          </>
        )}

        {phase === "why_reflect" && (
          <>
            <h1 style={v2Styles.title}>Dit is jouw waarom.</h1>
            <div style={v2Styles.anchorCard}>
              {state.why.trim().length > 0 && (
                <p style={v2Styles.anchorQuote}>&ldquo;{state.why.trim()}&rdquo;</p>
              )}
              {state.whyOutcome.trim().length > 0 && (
                <p style={v2Styles.anchorOutcome}>
                  Het levert je op: {state.whyOutcome.trim()}
                </p>
              )}
            </div>
            <p style={v2Styles.body}>
              Daar mag je op terugvallen als een dag zwaar is. Structuro laat dit
              zachtjes terugkomen op een dag met lage energie, als reden om tóch dat
              ene kleine ding te doen.
            </p>
            <div style={v2Styles.actions}>
              <button type="button" className="btn-primary w-full" onClick={() => goTo("done")}>
                Verder
              </button>
            </div>
          </>
        )}

        {phase === "done" && (
          <>
            {v2HasThings(things) ? (
              <>
                <h1 style={v2Styles.title}>Klaar. Dit staat voor je klaar:</h1>
                <div style={v2Styles.resultCard}>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                    {things.map((t) => (
                      <li key={t} style={v2Styles.resultThing}>
                        {t}
                      </li>
                    ))}
                  </ul>
                  {showAnchorInDone && (
                    <p style={v2Styles.resultAnchor}>
                      Je deed dit voor: &ldquo;{state.why.trim()}&rdquo;
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <h1 style={v2Styles.title}>Klaar.</h1>
                <div style={v2Styles.resultCard}>
                  <p style={v2Styles.resultThing}>Vandaag hoeft er niks. Ook goed.</p>
                </div>
              </>
            )}
            <p style={v2Styles.body}>Meer hoeft niet vandaag.</p>
            <div style={v2Styles.actions}>
              <button type="button" className="btn-primary w-full" onClick={finish}>
                Naar je home
              </button>
            </div>
          </>
        )}
          </section>

          <V2Reassurance />
        </div>
      </div>

      {canGoBack && (
        <div style={v2Styles.footer}>
          <button type="button" className="v2-link" style={v2Styles.backLink} onClick={goBack}>
            Terug
          </button>
        </div>
      )}
    </V2Page>
  );
}
