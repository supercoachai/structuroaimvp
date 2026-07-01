"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Energy = "low" | "enough" | "high";

type Phase =
  | "welcome"
  | "energy"
  | "thing"
  | "thing_custom"
  | "why_intro"
  | "why_outcome"
  | "why_reflect"
  | "done";

type OnboardingProState = {
  energy: Energy | null;
  thing: string | null;
  why: string;
  whyOutcome: string;
};

const STORAGE_KEY = "onboardingpro_state";

const SUGGESTIONS: Record<Energy, string[]> = {
  low: ["Eén glas water pakken", "Eén bericht beantwoorden", "Twee minuten opruimen"],
  enough: ["Die ene mail versturen", "Tien minuten opruimen", "Een blokje om"],
  high: ["Twintig minuten aan dat ene project", "Administratie wegwerken", "Een afspraak inplannen"],
};

const ENERGY_OPTIONS: { value: Energy; label: string }[] = [
  { value: "low", label: "Laag" },
  { value: "enough", label: "Genoeg" },
  { value: "high", label: "Veel" },
];

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

const emptyState: OnboardingProState = {
  energy: null,
  thing: null,
  why: "",
  whyOutcome: "",
};

export default function OnboardingProClient() {
  const [phase, setPhase] = useState<Phase>("welcome");
  const [history, setHistory] = useState<Phase[]>([]);
  const [state, setState] = useState<OnboardingProState>(emptyState);
  const [customThing, setCustomThing] = useState("");
  const [savedAway, setSavedAway] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<OnboardingProState>;
        setState({
          energy: parsed.energy ?? null,
          thing: parsed.thing ?? null,
          why: parsed.why ?? "",
          whyOutcome: parsed.whyOutcome ?? "",
        });
      }
    } catch {
      // Corrupte of ontoegankelijke storage negeren we stilletjes.
    }
  }, []);

  const persist = useCallback((next: OnboardingProState) => {
    setState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage kan geblokkeerd zijn (privémodus). Geen blokkade voor de flow.
    }
  }, []);

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

  const leave = useCallback((href: string) => {
    window.location.href = href;
  }, []);

  const stepNumber = stepNumberFor(phase);
  const progress = Math.round((stepNumber / TOTAL_STEPS) * 100);
  const canGoBack = history.length > 0 && phase !== "welcome";

  const suggestions = useMemo(
    () => SUGGESTIONS[state.energy ?? "enough"],
    [state.energy],
  );

  const selectEnergy = (energy: Energy) => {
    persist({ ...state, energy });
    goTo("thing");
  };

  const skipEnergy = () => {
    persist({ ...state, energy: state.energy ?? "enough" });
    goTo("thing");
  };

  const chooseThing = (thing: string | null) => {
    persist({ ...state, thing });
    goTo("why_intro");
  };

  const confirmCustomThing = () => {
    const trimmed = customThing.trim();
    chooseThing(trimmed.length > 0 ? trimmed : null);
  };

  const submitWhyIntro = () => goTo("why_outcome");

  const submitWhyOutcome = () => {
    if (state.why.trim().length > 0 || state.whyOutcome.trim().length > 0) {
      goTo("why_reflect");
    } else {
      goTo("done");
    }
  };

  const skipWhy = () => goTo("done");

  const showAnchorInDone = state.energy === "low" && state.why.trim().length > 0;

  return (
    <main style={styles.page}>
      <style>{scopedCss}</style>
      <div style={styles.shell}>
        <header style={styles.header}>
          <span style={styles.wordmark}>Structuro</span>
          <button
            type="button"
            className="opro-textlink"
            style={styles.stopLink}
            onClick={() => leave("/")}
            aria-label="Stoppen en terug naar start"
          >
            Stoppen
          </button>
        </header>

        <div style={styles.progressWrap} aria-hidden="true">
          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressFill, width: `${progress}%` }} />
          </div>
        </div>
        <p style={styles.progressLabel}>
          Stap {stepNumber} van {TOTAL_STEPS}
          <span style={styles.progressHint}> Stoppen kan altijd, er gaat niets verloren.</span>
        </p>

        <section key={phase} className="opro-fade" style={styles.card} aria-live="polite">
          {phase === "welcome" && (
            <>
              <h1 style={styles.title}>Even rustig. We doen één ding tegelijk.</h1>
              <p style={styles.body}>
                Je hoeft niks te onthouden en niks goed te doen. Fout bestaat hier niet.
              </p>
              <div style={styles.actions}>
                <button
                  type="button"
                  className="opro-cta"
                  style={styles.cta}
                  onClick={() => goTo("energy")}
                >
                  Begin
                </button>
              </div>
            </>
          )}

          {phase === "energy" && (
            <>
              <h1 style={styles.title}>Hoe is je energie nu?</h1>
              <p style={styles.body}>Eén tik is genoeg. Dit bepaalt alleen wat ik straks voorstel.</p>
              <div style={styles.optionList}>
                {ENERGY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className="opro-option"
                    style={{
                      ...styles.option,
                      ...(state.energy === opt.value ? styles.optionActive : null),
                    }}
                    onClick={() => selectEnergy(opt.value)}
                    aria-pressed={state.energy === opt.value}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div style={styles.actions}>
                <button type="button" className="opro-textlink" style={styles.skipLink} onClick={skipEnergy}>
                  Sla over
                </button>
              </div>
            </>
          )}

          {phase === "thing" && (
            <>
              <h1 style={styles.title}>Kies één klein ding voor straks.</h1>
              <p style={styles.body}>Tik op wat past. Meer hoeft niet.</p>
              <div style={styles.optionList}>
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="opro-option"
                    style={styles.option}
                    onClick={() => chooseThing(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div style={styles.softActions}>
                <button
                  type="button"
                  className="opro-textlink"
                  style={styles.skipLink}
                  onClick={() => {
                    setCustomThing("");
                    goTo("thing_custom");
                  }}
                >
                  Iets anders
                </button>
                <button
                  type="button"
                  className="opro-textlink"
                  style={styles.skipLink}
                  onClick={() => chooseThing(null)}
                >
                  Niks kiezen, ook goed
                </button>
              </div>
            </>
          )}

          {phase === "thing_custom" && (
            <>
              <h1 style={styles.title}>Wat zou jouw kleine ding zijn?</h1>
              <p style={styles.body}>In je eigen woorden. Eén regel is genoeg.</p>
              <label htmlFor="opro-custom-thing" style={styles.srOnly}>
                Jouw eigen kleine ding
              </label>
              <input
                id="opro-custom-thing"
                type="text"
                className="opro-input"
                style={styles.input}
                value={customThing}
                onChange={(e) => setCustomThing(e.target.value)}
                placeholder="Bijvoorbeeld: vijf minuten lezen"
                autoComplete="off"
              />
              <div style={styles.actions}>
                <button type="button" className="opro-cta" style={styles.cta} onClick={confirmCustomThing}>
                  Dit kies ik
                </button>
              </div>
            </>
          )}

          {phase === "why_intro" && (
            <>
              <p style={styles.kicker}>Mag ik je iets vragen? Je mag overslaan.</p>
              <h1 style={styles.title}>Waarvoor doe je dit eigenlijk?</h1>
              <p style={styles.body}>Kort, in je eigen woorden. Dit blijft van jou.</p>
              <label htmlFor="opro-why" style={styles.srOnly}>
                Waarvoor doe je dit
              </label>
              <input
                id="opro-why"
                type="text"
                className="opro-input"
                style={styles.input}
                value={state.why}
                onChange={(e) => persist({ ...state, why: e.target.value })}
                placeholder="Bijvoorbeeld: rust in mijn hoofd"
                autoComplete="off"
              />
              <div style={styles.actions}>
                <button type="button" className="opro-cta" style={styles.cta} onClick={submitWhyIntro}>
                  Volgende
                </button>
                <button type="button" className="opro-textlink" style={styles.skipLink} onClick={skipWhy}>
                  Overslaan
                </button>
              </div>
            </>
          )}

          {phase === "why_outcome" && (
            <>
              <h1 style={styles.title}>En wat zou dat je opleveren?</h1>
              <p style={styles.body}>Ook dit mag je overslaan.</p>
              <label htmlFor="opro-why-outcome" style={styles.srOnly}>
                Wat het je oplevert
              </label>
              <input
                id="opro-why-outcome"
                type="text"
                className="opro-input"
                style={styles.input}
                value={state.whyOutcome}
                onChange={(e) => persist({ ...state, whyOutcome: e.target.value })}
                placeholder="Bijvoorbeeld: meer ruimte voor mezelf"
                autoComplete="off"
              />
              <div style={styles.actions}>
                <button type="button" className="opro-cta" style={styles.cta} onClick={submitWhyOutcome}>
                  Klaar
                </button>
                <button type="button" className="opro-textlink" style={styles.skipLink} onClick={skipWhy}>
                  Overslaan
                </button>
              </div>
            </>
          )}

          {phase === "why_reflect" && (
            <>
              <h1 style={styles.title}>Dit is jouw waarom.</h1>
              <div style={styles.anchorCard}>
                {state.why.trim().length > 0 && (
                  <p style={styles.anchorQuote}>&ldquo;{state.why.trim()}&rdquo;</p>
                )}
                {state.whyOutcome.trim().length > 0 && (
                  <p style={styles.anchorOutcome}>Het levert je op: {state.whyOutcome.trim()}</p>
                )}
              </div>
              <p style={styles.body}>
                Daar mag je op terugvallen als een dag zwaar is. Structuro laat dit zachtjes terugkomen op
                een dag met lage energie, als reden om tóch dat ene kleine ding te doen.
              </p>
              <div style={styles.actions}>
                <button type="button" className="opro-cta" style={styles.cta} onClick={() => goTo("done")}>
                  Verder
                </button>
              </div>
            </>
          )}

          {phase === "done" && (
            <>
              {state.thing ? (
                <>
                  <h1 style={styles.title}>Klaar. Dit staat voor je klaar:</h1>
                  <div style={styles.resultCard}>
                    <p style={styles.resultThing}>{state.thing}</p>
                    {showAnchorInDone && (
                      <p style={styles.resultAnchor}>Je deed dit voor: &ldquo;{state.why.trim()}&rdquo;</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <h1 style={styles.title}>Klaar.</h1>
                  <div style={styles.resultCard}>
                    <p style={styles.resultThing}>Vandaag hoeft er niks. Ook goed.</p>
                  </div>
                </>
              )}
              <p style={styles.body}>Meer hoeft niet vandaag.</p>

              {!savedAway ? (
                <>
                  <p style={styles.saveQuestion}>Wil je dat dit er morgen weer is?</p>
                  <div style={styles.actions}>
                    <button
                      type="button"
                      className="opro-cta"
                      style={styles.cta}
                      onClick={() => leave("/registreren")}
                    >
                      Bewaren
                    </button>
                    <button
                      type="button"
                      className="opro-textlink"
                      style={styles.skipLink}
                      onClick={() => setSavedAway(true)}
                    >
                      Nu nog niet
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p style={styles.body}>Helemaal goed. Je kunt altijd terugkomen.</p>
                  <div style={styles.actions}>
                    <button
                      type="button"
                      className="opro-textlink"
                      style={styles.skipLink}
                      onClick={() => leave("/")}
                    >
                      Terug naar start
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </section>

        {canGoBack && (
          <div style={styles.footer}>
            <button type="button" className="opro-textlink" style={styles.backLink} onClick={goBack}>
              Terug
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

const scopedCss = `
.opro-fade { animation: oproFadeIn 180ms ease-out; }
@keyframes oproFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.opro-cta { transition: background-color 160ms ease; }
.opro-cta:hover { background-color: var(--story-cta-hover) !important; }
.opro-option { transition: border-color 160ms ease, background-color 160ms ease; }
.opro-option:hover { border-color: var(--story-accent) !important; }
.opro-textlink { transition: color 160ms ease; }
.opro-textlink:hover { color: var(--story-text) !important; }
.opro-cta:focus-visible,
.opro-option:focus-visible,
.opro-textlink:focus-visible,
.opro-input:focus-visible {
  outline: 2px solid var(--story-accent);
  outline-offset: 2px;
}
.opro-input:focus { border-color: var(--story-accent) !important; }
@media (prefers-reduced-motion: reduce) {
  .opro-fade { animation: none !important; }
  .opro-cta, .opro-option, .opro-textlink { transition: none !important; }
}
`;

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100dvh",
    backgroundColor: "var(--story-bg)",
    color: "var(--story-text)",
    display: "flex",
    justifyContent: "center",
    padding: "24px 20px 48px",
  },
  shell: {
    width: "100%",
    maxWidth: 480,
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  wordmark: {
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: "0.02em",
    color: "var(--story-text)",
  },
  stopLink: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    color: "var(--story-text-muted)",
    padding: "8px 4px",
  },
  progressWrap: {
    marginTop: 4,
  },
  progressTrack: {
    width: "100%",
    height: 4,
    borderRadius: 999,
    backgroundColor: "var(--story-border)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "var(--story-accent)",
    transition: "width 200ms ease",
  },
  progressLabel: {
    fontSize: 13,
    color: "var(--story-text-muted)",
    margin: 0,
  },
  progressHint: {
    color: "var(--story-text-muted)",
    opacity: 0.85,
  },
  card: {
    backgroundColor: "#FFFFFF",
    border: "1px solid var(--story-border)",
    borderRadius: 16,
    padding: "28px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  kicker: {
    fontSize: 14,
    color: "var(--story-accent)",
    margin: 0,
  },
  title: {
    fontSize: 22,
    lineHeight: 1.3,
    fontWeight: 600,
    margin: 0,
    color: "var(--story-text)",
  },
  body: {
    fontSize: 15,
    lineHeight: 1.6,
    color: "var(--story-text-muted)",
    margin: 0,
  },
  optionList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  option: {
    width: "100%",
    minHeight: 56,
    padding: "16px 18px",
    borderRadius: 14,
    border: "1px solid var(--story-border)",
    backgroundColor: "#FFFFFF",
    color: "var(--story-text)",
    fontSize: 16,
    textAlign: "left",
    cursor: "pointer",
  },
  optionActive: {
    borderColor: "var(--story-accent)",
    backgroundColor: "rgba(45, 90, 86, 0.06)",
  },
  input: {
    width: "100%",
    minHeight: 56,
    padding: "14px 16px",
    borderRadius: 14,
    border: "1px solid var(--story-border)",
    backgroundColor: "#FFFFFF",
    color: "var(--story-text)",
    fontSize: 16,
  },
  actions: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  softActions: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  cta: {
    width: "100%",
    minHeight: 56,
    borderRadius: 14,
    border: "none",
    backgroundColor: "var(--story-cta)",
    color: "var(--story-text-on-navy)",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
  },
  skipLink: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    color: "var(--story-text-muted)",
    padding: "10px 8px",
  },
  anchorCard: {
    backgroundColor: "rgba(45, 90, 86, 0.06)",
    border: "1px solid var(--story-border)",
    borderRadius: 14,
    padding: "18px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  anchorQuote: {
    fontSize: 18,
    lineHeight: 1.5,
    color: "var(--story-text)",
    margin: 0,
  },
  anchorOutcome: {
    fontSize: 14,
    color: "var(--story-text-muted)",
    margin: 0,
  },
  resultCard: {
    backgroundColor: "rgba(45, 90, 86, 0.06)",
    border: "1px solid var(--story-border)",
    borderRadius: 14,
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  resultThing: {
    fontSize: 18,
    fontWeight: 600,
    color: "var(--story-text)",
    margin: 0,
  },
  resultAnchor: {
    fontSize: 14,
    color: "var(--story-accent)",
    margin: 0,
  },
  saveQuestion: {
    fontSize: 15,
    color: "var(--story-text)",
    margin: 0,
  },
  footer: {
    display: "flex",
    justifyContent: "flex-start",
  },
  backLink: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    color: "var(--story-text-muted)",
    padding: "8px 4px",
  },
  srOnly: {
    position: "absolute",
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: "hidden",
    clip: "rect(0,0,0,0)",
    whiteSpace: "nowrap",
    border: 0,
  },
};
