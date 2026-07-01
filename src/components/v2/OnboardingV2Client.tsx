"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { V2Header, V2Page, V2Progress } from "./V2Chrome";
import { v2Styles } from "./theme";
import { scrollV2ToTop, useV2Go } from "./v2nav";
import {
  V2_ENERGY_OPTIONS,
  V2_SUGGESTIONS,
  useV2,
  type V2Energy,
} from "./V2Context";

type Phase =
  | "welcome"
  | "energy"
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
  const { state, update } = useV2();
  const [phase, setPhase] = useState<Phase>("welcome");
  const [history, setHistory] = useState<Phase[]>([]);
  const [customThing, setCustomThing] = useState("");

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
    () => V2_SUGGESTIONS[state.energy ?? "enough"],
    [state.energy],
  );

  const selectEnergy = (energy: V2Energy) => {
    update({ energy });
    goTo("thing");
  };

  const skipEnergy = () => {
    update({ energy: state.energy ?? "enough" });
    goTo("thing");
  };

  const chooseThing = (thing: string | null) => {
    update({ thing });
    goTo("why_intro");
  };

  const confirmCustomThing = () => {
    const trimmed = customThing.trim();
    chooseThing(trimmed.length > 0 ? trimmed : null);
  };

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

  return (
    <V2Page>
      <V2Header exitHref="/v2" />
      <V2Progress step={stepNumber} total={TOTAL_STEPS} />

      <section key={phase} className="v2-fade" style={v2Styles.card} aria-live="polite">
        {phase === "welcome" && (
          <>
            <h1 style={v2Styles.title}>Even rustig. We doen één ding tegelijk.</h1>
            <p style={v2Styles.body}>
              Je hoeft niks te onthouden en niks goed te doen. Fout bestaat hier niet.
            </p>
            <div style={v2Styles.actions}>
              <button
                type="button"
                className="v2-cta"
                style={v2Styles.cta}
                onClick={() => goTo("energy")}
              >
                Begin
              </button>
            </div>
          </>
        )}

        {phase === "energy" && (
          <>
            <h1 style={v2Styles.title}>Hoe is je energie nu?</h1>
            <p style={v2Styles.body}>
              Eén tik is genoeg. Dit bepaalt alleen wat ik straks voorstel. We vragen
              het maar één keer.
            </p>
            <div style={v2Styles.optionList}>
              {V2_ENERGY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className="v2-option"
                  style={{
                    ...v2Styles.option,
                    ...(state.energy === opt.value ? v2Styles.optionActive : null),
                  }}
                  onClick={() => selectEnergy(opt.value)}
                  aria-pressed={state.energy === opt.value}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div style={v2Styles.actions}>
              <button
                type="button"
                className="v2-textlink"
                style={v2Styles.skipLink}
                onClick={skipEnergy}
              >
                Sla over
              </button>
            </div>
          </>
        )}

        {phase === "thing" && (
          <>
            <h1 style={v2Styles.title}>Kies één klein ding voor straks.</h1>
            <p style={v2Styles.body}>Tik op wat past. Meer hoeft niet.</p>
            <div style={v2Styles.optionList}>
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="v2-option"
                  style={v2Styles.option}
                  onClick={() => chooseThing(s)}
                >
                  {s}
                </button>
              ))}
            </div>
            <div style={v2Styles.softActions}>
              <button
                type="button"
                className="v2-textlink"
                style={v2Styles.skipLink}
                onClick={() => {
                  setCustomThing("");
                  goTo("thing_custom");
                }}
              >
                Iets anders
              </button>
              <button
                type="button"
                className="v2-textlink"
                style={v2Styles.skipLink}
                onClick={() => chooseThing(null)}
              >
                Niks kiezen, ook goed
              </button>
            </div>
          </>
        )}

        {phase === "thing_custom" && (
          <>
            <h1 style={v2Styles.title}>Wat zou jouw kleine ding zijn?</h1>
            <p style={v2Styles.body}>In je eigen woorden. Eén regel is genoeg.</p>
            <label htmlFor="v2-custom-thing" style={v2Styles.srOnly}>
              Jouw eigen kleine ding
            </label>
            <input
              id="v2-custom-thing"
              type="text"
              className="v2-input"
              style={v2Styles.input}
              value={customThing}
              onChange={(e) => setCustomThing(e.target.value)}
              placeholder="Bijvoorbeeld: vijf minuten lezen"
              autoComplete="off"
            />
            <div style={v2Styles.actions}>
              <button
                type="button"
                className="v2-cta"
                style={v2Styles.cta}
                onClick={confirmCustomThing}
              >
                Dit kies ik
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
              className="v2-input"
              style={v2Styles.input}
              value={state.why}
              onChange={(e) => update({ why: e.target.value })}
              placeholder="Bijvoorbeeld: rust in mijn hoofd"
              autoComplete="off"
            />
            <div style={v2Styles.actions}>
              <button
                type="button"
                className="v2-cta"
                style={v2Styles.cta}
                onClick={() => goTo("why_outcome")}
              >
                Volgende
              </button>
              <button
                type="button"
                className="v2-textlink"
                style={v2Styles.skipLink}
                onClick={skipWhy}
              >
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
              className="v2-input"
              style={v2Styles.input}
              value={state.whyOutcome}
              onChange={(e) => update({ whyOutcome: e.target.value })}
              placeholder="Bijvoorbeeld: meer ruimte voor mezelf"
              autoComplete="off"
            />
            <div style={v2Styles.actions}>
              <button
                type="button"
                className="v2-cta"
                style={v2Styles.cta}
                onClick={submitWhyOutcome}
              >
                Klaar
              </button>
              <button
                type="button"
                className="v2-textlink"
                style={v2Styles.skipLink}
                onClick={skipWhy}
              >
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
              <button
                type="button"
                className="v2-cta"
                style={v2Styles.cta}
                onClick={() => goTo("done")}
              >
                Verder
              </button>
            </div>
          </>
        )}

        {phase === "done" && (
          <>
            {state.thing ? (
              <>
                <h1 style={v2Styles.title}>Klaar. Dit staat voor je klaar:</h1>
                <div style={v2Styles.resultCard}>
                  <p style={v2Styles.resultThing}>{state.thing}</p>
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
              <button
                type="button"
                className="v2-cta"
                style={v2Styles.cta}
                onClick={finish}
              >
                Naar je home
              </button>
            </div>
          </>
        )}
      </section>

      {canGoBack && (
        <div style={v2Styles.footer}>
          <button
            type="button"
            className="v2-textlink"
            style={v2Styles.backLink}
            onClick={goBack}
          >
            Terug
          </button>
        </div>
      )}
    </V2Page>
  );
}
