"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useI18n } from "@/lib/i18n";

import { V2Eyebrow, V2Header, V2Page, V2Progress, V2Reassurance } from "./V2Chrome";
import {
  v2FlowLayoutForDagstartPhase,
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
import { getV2EnergyShortcut, recordV2EnergyForToday } from "./v2Adaptive";
import { getV2CycleEnergyHint } from "./v2CycleHint";
import V2CycleChip, { ensureV2CyclePeriodStart, useV2CycleChip } from "./V2CycleChip";
import V2PickWho from "./V2PickWho";
import V2EnergyStep, { v2GreetingWord } from "./V2EnergyStep";
import {
  trackV2CycleHintShown,
  trackV2DagstartComplete,
  trackV2EnergyShortcutAccepted,
  trackV2EnergyShortcutShown,
  trackV2EnergyShortcutSkipped,
  trackV2WhySuggestionAccepted,
  trackV2WhySuggestionShown,
} from "./v2Analytics";
import { isV2MutedToday } from "./v2Settings";
import {
  acceptV2WhySuggestion,
  dismissV2WhySuggestion,
  getV2WhySuggestion,
  type V2WhySuggestion,
} from "./v2WhySuggestion";

type Phase = "energy" | "pick_who" | "thing" | "thing_custom" | "done";
const TOTAL = 3;

function stepNumberFor(phase: Phase): number {
  if (phase === "energy") return 1;
  if (phase === "done") return 3;
  return 2;
}

export default function DagstartV2Client() {
  const go = useV2Go();
  const { t } = useI18n();
  const { state, update } = useV2();
  const [phase, setPhase] = useState<Phase>("energy");
  const [history, setHistory] = useState<Phase[]>([]);
  const [customThing, setCustomThing] = useState("");
  const [selectedThings, setSelectedThings] = useState<string[]>([]);
  const [whySuggestion, setWhySuggestion] = useState<V2WhySuggestion | null>(null);
  const [energyShortcut, setEnergyShortcut] = useState<ReturnType<typeof getV2EnergyShortcut>>(null);
  const [cycleHint, setCycleHint] = useState<ReturnType<typeof getV2CycleEnergyHint>>(null);
  const [whyTracked, setWhyTracked] = useState(false);
  const [shortcutTracked, setShortcutTracked] = useState(false);
  const [cycleHintTracked, setCycleHintTracked] = useState(false);
  const [suggestedByStructuro, setSuggestedByStructuro] = useState(false);
  const [energySkipped, setEnergySkipped] = useState(false);
  const [greeting, setGreeting] = useState("");
  const cycleChip = useV2CycleChip();

  useEffect(() => {
    setGreeting(v2GreetingWord());
  }, []);

  const maxSlots = v2MaxSlotsForEnergy(state.energy);
  const things = v2NormalizeThings(state.things);

  useEffect(() => {
    scrollV2ToTop();
  }, [phase]);

  useEffect(() => {
    if (isV2MutedToday()) {
      setWhySuggestion(null);
      setEnergyShortcut(null);
      setCycleHint(null);
      return;
    }
    setWhySuggestion(getV2WhySuggestion(state));
    setEnergyShortcut(getV2EnergyShortcut());
    setCycleHint(getV2CycleEnergyHint(state));
  }, [state]);

  useEffect(() => {
    if (phase !== "thing" || !whySuggestion || whyTracked) return;
    trackV2WhySuggestionShown({ source: whySuggestion.source });
    setWhyTracked(true);
  }, [phase, whySuggestion, whyTracked]);

  useEffect(() => {
    if (phase !== "energy" || !energyShortcut || shortcutTracked) return;
    trackV2EnergyShortcutShown({ energy: energyShortcut.energy });
    setShortcutTracked(true);
  }, [phase, energyShortcut, shortcutTracked]);

  useEffect(() => {
    if (phase !== "energy" || !cycleHint || cycleHintTracked) return;
    trackV2CycleHintShown({ kind: cycleHint.kind });
    setCycleHintTracked(true);
  }, [phase, cycleHint, cycleHintTracked]);

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
    () => v2SuggestionsForDayEnergy(state.energy),
    [state.energy],
  );

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

  const selectEnergy = (energy: V2Energy) => {
    recordV2EnergyForToday(energy);
    update({ energy });
    setSelectedThings([]);
    setSuggestedByStructuro(false);
    setEnergySkipped(false);
    goTo("pick_who");
  };

  const acceptEnergyShortcut = () => {
    if (!energyShortcut) return;
    trackV2EnergyShortcutAccepted({ energy: energyShortcut.energy });
    selectEnergy(energyShortcut.energy);
  };

  const skipEnergyShortcut = () => {
    trackV2EnergyShortcutSkipped();
    setEnergyShortcut(null);
  };
  const skipEnergy = () => {
    // Overslaan = genoeg als neutrale default, geen oude energie meenemen.
    recordV2EnergyForToday("enough");
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

  const acceptWhySuggestion = () => {
    if (!whySuggestion) return;
    trackV2WhySuggestionAccepted({ source: whySuggestion.source });
    const thing = acceptV2WhySuggestion(whySuggestion);
    if (maxSlots === 1) {
      finishThings([thing]);
      return;
    }
    setSelectedThings([thing]);
    goTo("thing");
  };

  const dismissWhy = () => {
    if (!whySuggestion) return;
    dismissV2WhySuggestion(whySuggestion.id);
    setWhySuggestion(null);
  };

  const toggleThing = (item: string) => {
    setSuggestedByStructuro(false);
    if (selectedThings.includes(item)) {
      setSelectedThings(selectedThings.filter((x) => x !== item));
      return;
    }
    if (selectedThings.length >= maxSlots) return;
    const next = [...selectedThings, item];
    if (maxSlots === 1 && !suggestedByStructuro) {
      finishThings(next);
      return;
    }
    setSelectedThings(next);
  };

  const confirmSelection = () => finishThings(selectedThings);

  const skipThings = () => finishThings([]);

  const confirmCustom = () => {
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

  const toHome = () => go("/v2/home");
  const finishDay = () => go("/v2/home", { todayDone: true });

  const canGoBack = history.length > 0;
  const counter = v2ThingCounter(selectedThings.length, maxSlots);
  const flowLayout = v2FlowLayoutForDagstartPhase(phase);

  return (
    <V2Page>
      <V2Header exitHref="/v2/home" exitLabel="Naar home" />
      <V2Progress step={stepNumberFor(phase)} total={TOTAL} showReassurance={false} />

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
        {phase === "energy" ? (
          <>
            {cycleChip ? <V2CycleChip info={cycleChip} /> : null}
            <V2EnergyStep
              greeting={greeting || undefined}
              userName={state.name.trim() || undefined}
              energy={state.energy}
              title="Hoe is je energie?"
              subtitle={
                cycleHint
                  ? t(cycleHint.tipKey)
                  : "Eén tik. Geen goede of foute keuze."
              }
              onPick={selectEnergy}
              onSkip={skipEnergy}
              abovePills={
                energyShortcut ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
                    <button
                      type="button"
                      className="v2-choice"
                      onClick={acceptEnergyShortcut}
                    >
                      Zelfde als gisteren: {energyShortcut.label}
                    </button>
                    <button type="button" className="v2-link" onClick={skipEnergyShortcut}>
                      Anders kiezen
                    </button>
                  </div>
                ) : null
              }
            />
          </>
        ) : null}

        {phase === "pick_who" ? (
          <V2PickWho
            energyLabel={energySkipped ? undefined : energyLabel}
            onStructuro={pickStructuro}
            onSelf={pickSelf}
          />
        ) : null}

        {phase === "thing" ? (
          <>
            <V2Eyebrow>Vandaag</V2Eyebrow>
            <h1 style={v2Styles.title}>{v2ThingTitle(maxSlots)}</h1>
            <p style={v2Styles.body}>
              {suggestedByStructuro
                ? "Structuro koos dit bij jouw energie. Pas aan of bevestig."
                : maxSlots === 1
                  ? "Voorgekauwd op je energie. Tik op wat past."
                  : "Tik om te kiezen. Tik nogmaals om af te vinken."}
            </p>
            {counter ? (
              <p style={{ ...v2Styles.body, marginTop: -4, color: "var(--text-muted)" }}>
                {counter}
              </p>
            ) : null}
            {whySuggestion ? (
              <div
                style={{
                  ...v2Styles.anchorCard,
                  marginBottom: 12,
                }}
              >
                <p style={{ ...v2Styles.body, margin: 0 }}>{whySuggestion.invitation}</p>
                <div style={{ ...v2Styles.softActions, marginTop: 10 }}>
                  <button type="button" className="btn-primary w-full" onClick={acceptWhySuggestion}>
                    {whySuggestion.title}
                  </button>
                  <button type="button" className="v2-link" onClick={dismissWhy}>
                    Niet nu
                  </button>
                </div>
              </div>
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
        ) : null}

        {phase === "thing_custom" ? (
          <>
            <h1 style={v2Styles.title}>Wat wordt je ding van vandaag?</h1>
            <p style={v2Styles.body}>
              {maxSlots === 1
                ? "In je eigen woorden. Eén regel is genoeg."
                : "In je eigen woorden. Je komt daarna terug om eventueel meer te kiezen."}
            </p>
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
                {maxSlots === 1 ? "Dit kies ik" : "Toevoegen"}
              </button>
            </div>
          </>
        ) : null}

        {phase === "done" ? (
          <>
            <h1 style={v2Styles.title}>
              {v2HasThings(things) ? "Mooi. Dit staat klaar:" : "Helemaal goed."}
            </h1>
            <div style={v2Styles.resultCard}>
              {v2HasThings(things) ? (
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                  {things.map((t) => (
                    <li key={t} style={v2Styles.resultThing}>
                      {t}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={v2Styles.resultThing}>Vandaag hoeft er niks.</p>
              )}
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
                    onClick={() => {
                      ensureV2CyclePeriodStart();
                      update({ cyclusOptIn: true });
                    }}
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

          <V2Reassurance />
        </div>
      </div>

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
