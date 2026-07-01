"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { V2Eyebrow, V2Header, V2Page, V2Progress } from "./V2Chrome";
import { v2Styles } from "./theme";
import { scrollV2ToTop, useV2Go } from "./v2nav";
import {
  V2_ENERGY_OPTIONS,
  V2_SUGGESTIONS,
  useV2,
  type V2Energy,
} from "./V2Context";

type Phase = "energy" | "thing" | "thing_custom" | "done";
const TOTAL = 3;

function stepNumberFor(phase: Phase): number {
  if (phase === "energy") return 1;
  if (phase === "done") return 3;
  return 2;
}

export default function DagstartV2Client() {
  const go = useV2Go();
  const { state, update } = useV2();
  const [phase, setPhase] = useState<Phase>("energy");
  const [history, setHistory] = useState<Phase[]>([]);
  const [customThing, setCustomThing] = useState("");

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
    update({ thing, todayDone: false });
    goTo("done");
  };
  const confirmCustom = () => {
    const trimmed = customThing.trim();
    chooseThing(trimmed.length > 0 ? trimmed : null);
  };
  const toHome = () => go("/v2/home");
  const finishDay = () => go("/v2/home", { todayDone: true });

  const canGoBack = history.length > 0;

  return (
    <V2Page>
      <V2Header exitHref="/v2/home" exitLabel="Naar home" />
      <V2Progress step={stepNumberFor(phase)} total={TOTAL} />

      <section key={phase} className="v2-fade" style={v2Styles.card} aria-live="polite">
        {phase === "energy" ? (
          <>
            <V2Eyebrow>Dagstart</V2Eyebrow>
            <h1 style={v2Styles.title}>Hoe is je energie vandaag?</h1>
            <p style={v2Styles.body}>
              Eén tik. Geen goede of foute keuze. Het past alleen aan wat ik voorstel.
            </p>
            <div style={v2Styles.optionList}>
              {V2_ENERGY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className="v2-choice"
                  onClick={() => selectEnergy(opt.value)}
                  aria-pressed={state.energy === opt.value}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div style={v2Styles.actions}>
              <button type="button" className="v2-link" onClick={skipEnergy}>
                Sla over
              </button>
            </div>
          </>
        ) : null}

        {phase === "thing" ? (
          <>
            <V2Eyebrow>Vandaag</V2Eyebrow>
            <h1 style={v2Styles.title}>Kies één ding.</h1>
            <p style={v2Styles.body}>Voorgekauwd op je energie. Tik op wat past.</p>
            <div style={v2Styles.optionList}>
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="v2-choice"
                  onClick={() => chooseThing(s)}
                >
                  {s}
                </button>
              ))}
            </div>
            <div style={v2Styles.softActions}>
              <button
                type="button"
                className="v2-link"
                onClick={() => {
                  setCustomThing("");
                  goTo("thing_custom");
                }}
              >
                Iets anders
              </button>
              <button type="button" className="v2-link" onClick={() => chooseThing(null)}>
                Niks kiezen, ook goed
              </button>
            </div>
          </>
        ) : null}

        {phase === "thing_custom" ? (
          <>
            <h1 style={v2Styles.title}>Wat wordt je ding van vandaag?</h1>
            <p style={v2Styles.body}>In je eigen woorden. Eén regel is genoeg.</p>
            <label htmlFor="v2-ds-custom" style={v2Styles.srOnly}>
              Jouw eigen ding van vandaag
            </label>
            <input
              id="v2-ds-custom"
              type="text"
              className="v2-field"
              value={customThing}
              onChange={(e) => setCustomThing(e.target.value)}
              placeholder="Bijvoorbeeld: de keuken opruimen"
              autoComplete="off"
            />
            <div style={v2Styles.actions}>
              <button type="button" className="btn-primary w-full" onClick={confirmCustom}>
                Dit kies ik
              </button>
            </div>
          </>
        ) : null}

        {phase === "done" ? (
          <>
            <h1 style={v2Styles.title}>
              {state.thing ? "Mooi. Dit staat klaar:" : "Helemaal goed."}
            </h1>
            <div style={v2Styles.resultCard}>
              <p style={v2Styles.resultThing}>
                {state.thing ? state.thing : "Vandaag hoeft er niks."}
              </p>
            </div>
            <p style={v2Styles.body}>Je dagstart is rond. Meer is niet nodig.</p>
            <div style={v2Styles.actions}>
              <button type="button" className="btn-primary w-full" onClick={toHome}>
                Naar je home
              </button>
              {/* H1 Shutdown-light: meteen afronden, geen aparte route. */}
              <button type="button" className="v2-link" onClick={finishDay}>
                Of: meteen klaar voor vandaag
              </button>
            </div>

            {/* Cyclus niet in de funnel, alleen hier optioneel. */}
            {!state.cyclusOptIn ? (
              <div style={{ ...v2Styles.anchorCard, marginTop: 4 }}>
                <p style={v2Styles.anchorOutcome}>Optioneel, geen haast.</p>
                <p style={v2Styles.body}>
                  Wil je dat je dagstart vanzelf terugkomt op de dagen die jou passen?
                  Dat kun je later instellen.
                </p>
                <div style={v2Styles.softActions}>
                  <button
                    type="button"
                    className="v2-link"
                    onClick={() => update({ cyclusOptIn: true })}
                  >
                    Ja, later instellen
                  </button>
                </div>
              </div>
            ) : (
              <p style={v2Styles.body}>
                Genoteerd. We bieden de cyclus rustig aan, nooit verplicht.
              </p>
            )}
          </>
        ) : null}
      </section>

      {canGoBack && phase !== "done" ? (
        <div style={v2Styles.footer}>
          <button type="button" className="v2-link" onClick={goBack}>
            Terug
          </button>
        </div>
      ) : null}
    </V2Page>
  );
}
