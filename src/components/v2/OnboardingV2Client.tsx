"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { persistPreferredDisplayName } from "@/lib/accountDisplayName";
import { useI18n } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { isEventSignupSource } from "@/lib/stripe/trialConfig";

import { V2FlowStickyChrome, V2Header, V2Page, V2Reassurance } from "./V2Chrome";
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
import { recordV2EnergyForToday } from "./v2Adaptive";
import V2LanguageToggle from "./V2LanguageToggle";
import V2ProgressDots from "./V2ProgressDots";
import { shouldShowV2CycleDiscovery } from "./v2FlowGates";
import { dismissCycleOptInPrompt } from "./v2CycleOptInPrompt";
import { dismissAccountSavePrompt, shouldShowPostOnboardingAccountSave } from "./v2AccountSavePrompt";
import {
  trackV2NameStepCompleted,
  trackV2NameStepShown,
  trackV2OnboardingDone,
  trackV2OnboardingEnergy,
  trackV2OnboardingStep,
  trackV2OnboardingTasks,
} from "./v2OnboardingFunnel";
import { patchV2Settings } from "./v2Settings";
import { persistV2PreferredName } from "./v2DisplayName";
import {
  consumeV2PostAccountNamePending,
  dismissV2PostAccountNamePrompt,
  peekV2PostAccountNamePending,
  prefillNameFromUserMetadata,
  shouldShowV2PostAccountNamePrompt,
} from "./v2PostAccountName";
import {
  clearV2OnboardingUiPhase,
  peekV2OnboardingUiPhase,
  persistV2OnboardingUiPhase,
  shouldSkipFreshStartEnergyReset,
} from "./v2OnboardingPhaseGate";
import V2ProposeStep from "./V2ProposeStep";
import V2AdjustStep from "./V2AdjustStep";
import V2DoneStep from "./V2DoneStep";
import V2AccountSaveStep from "./V2AccountSaveStep";
import V2NameStep from "./V2NameStep";

/**
 * Eerste reis + replay: energy+voorstellen → klaar → (guest) account → naam → home.
 * Geen welkom-intro. Soft cyclus-discovery alleen voor guests; accounts in settings.
 * Naam alleen ná account-aanmaak. Escape: zelf aanpassen. Progress: 2 segmenten.
 *
 * INITIAL_PHASE is altijd "energy" (SSR = client, geen hydration-mismatch).
 */
type Phase = "energy" | "adjust" | "done" | "account" | "name";

const TOTAL_STEPS = 2;

function stepNumberFor(phase: Phase): number {
  switch (phase) {
    case "energy":
    case "adjust":
      return 1;
    case "done":
    case "account":
    case "name":
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
  const [namePrefill, setNamePrefill] = useState("");
  const [nameBusy, setNameBusy] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const replayHandled = useRef(false);
  const freshStartHandled = useRef(false);
  const nameEntryHandled = useRef(false);
  /** Voorkomt dat frisse-start-reset een snelle energieklik wist. */
  const userPickedEnergy = useRef(false);
  const energyRef = useRef(state.energy);
  energyRef.current = state.energy;

  const resetToEnergy = useCallback(
    (opts?: { clearPersistedEnergy?: boolean }) => {
      setSelectedThings([]);
      // Geen standaard wipe van journey-energy: anders verdwijnt de home-chip
      // als je onboarding opent en weer weggaat. Alleen bij expliciete replay.
      if (opts?.clearPersistedEnergy) update({ energy: null });
      setPhase("energy");
      setHistory([]);
    },
    [update],
  );

  const goHomeAfterOnboarding = useCallback(() => {
    void (async () => {
      try {
        const supabase = createClient();
        if (supabase) {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user?.id) {
            // Claim vóór navigatie: anders bounce middleware terug naar /onboarding
            // en wist fresh-start de suggest-stap opnieuw in (energie nog in geheugen).
            const current = energyRef.current;
            const energy =
              current === "low"
                ? "low"
                : current === "high"
                  ? "high"
                  : "medium";
            let claimed = false;
            try {
              const res = await fetch(
                "/api/profile/claim-anonymous-onboarding",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "same-origin",
                  body: JSON.stringify({ energy }),
                },
              );
              claimed = res.ok;
              if (!claimed) {
                const retry = await fetch(
                  "/api/profile/claim-anonymous-onboarding",
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "same-origin",
                    body: JSON.stringify({ energy }),
                  },
                );
                claimed = retry.ok;
              }
            } catch {
              claimed = false;
            }

            const { data: profile } = await supabase
              .from("profiles")
              .select("signup_source, onboarding_completed")
              .eq("id", user.id)
              .maybeSingle();
            const alreadyOnboarded = profile?.onboarding_completed === true;
            if (!claimed && !alreadyOnboarded) {
              // Blijf op naamstap i.p.v. navigatie die middleware terugbounce’t.
              persistV2OnboardingUiPhase("name");
              setPhase("name");
              return;
            }

            const source =
              typeof profile?.signup_source === "string"
                ? profile.signup_source
                : null;
            clearV2OnboardingUiPhase();
            // Jasper / café: app-trial zonder kaart → home. Anders checkout-gate.
            if (isEventSignupSource(source)) {
              go("/", { todayDone: false });
              return;
            }
            go("/abonnement", { todayDone: false });
            return;
          }
        }
      } catch {
        /* anon pad */
      }
      clearV2OnboardingUiPhase();
      go("/", { todayDone: false });
    })();
  }, [go]);

  const enterNamePhase = useCallback(
    async (opts?: { fromAccountSave?: boolean }) => {
      dismissAccountSavePrompt();
      nameEntryHandled.current = true;
      freshStartHandled.current = true;
      // Commit UI vóór awaits: anders wist een remount/resetToEnergy de suggest-stap terug
      // terwijl getUser/profile nog loopt (lange load na e-mail-signup).
      persistV2OnboardingUiPhase("name");
      setHistory([]);
      setPhase("name");
      setNameError(null);
      trackV2NameStepShown();

      let profilePreferred: string | null = null;
      let profileDisplay: string | null = null;
      let metaPrefill = "";

      try {
        const supabase = createClient();
        if (supabase) {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user?.id) {
            metaPrefill = prefillNameFromUserMetadata(
              user.user_metadata as Record<string, unknown> | undefined,
            );
            const { data: profile } = await supabase
              .from("profiles")
              .select("preferred_name, display_name")
              .eq("id", user.id)
              .maybeSingle();
            profilePreferred =
              typeof profile?.preferred_name === "string"
                ? profile.preferred_name
                : null;
            profileDisplay =
              typeof profile?.display_name === "string"
                ? profile.display_name
                : null;
          }
        }
      } catch {
        /* best-effort prefill */
      }

      consumeV2PostAccountNamePending();

      if (
        !shouldShowV2PostAccountNamePrompt({
          profilePreferredName: profilePreferred,
          profileDisplayName: profileDisplay,
        })
      ) {
        dismissV2PostAccountNamePrompt();
        goHomeAfterOnboarding();
        return;
      }

      setNamePrefill(metaPrefill);
      if (opts?.fromAccountSave) return;
    },
    [goHomeAfterOnboarding],
  );

  useEffect(() => {
    if (replayHandled.current) return;
    if (searchParams.get("replay") !== "1") return;
    replayHandled.current = true;
    freshStartHandled.current = true;
    userPickedEnergy.current = false;
    clearV2OnboardingUiPhase();
    resetToEnergy({ clearPersistedEnergy: true });
    router.replace("/onboarding", { scroll: false });
  }, [resetToEnergy, router, searchParams]);

  // Post-auth naamstap (OAuth return of e-mail-signup redirect).
  useEffect(() => {
    if (nameEntryHandled.current) return;
    const fromQuery = searchParams.get("name") === "1";
    const fromFlag = peekV2PostAccountNamePending();
    const savedPhase = peekV2OnboardingUiPhase();
    if (!fromQuery && !fromFlag && savedPhase !== "name") return;
    nameEntryHandled.current = true;
    freshStartHandled.current = true;
    if (fromQuery) {
      router.replace("/onboarding", { scroll: false });
    }
    void enterNamePhase();
  }, [enterNamePhase, router, searchParams]);

  // Pas ná provider-ready: anders wist frisse-start een lege pre-hydrate state,
  // of late hydrate overschrijft een snelle energieklik.
  useLayoutEffect(() => {
    if (!ready) return;
    if (freshStartHandled.current) return;
    if (userPickedEnergy.current) return;
    if (searchParams.get("name") === "1" || shouldSkipFreshStartEnergyReset()) {
      freshStartHandled.current = true;
      const saved = peekV2OnboardingUiPhase();
      if (saved === "account" || saved === "name") {
        setPhase(saved);
      } else if (
        searchParams.get("name") === "1" ||
        peekV2PostAccountNamePending()
      ) {
        setPhase("name");
      }
      return;
    }
    freshStartHandled.current = true;
    resetToEnergy();
  }, [ready, resetToEnergy, searchParams]);

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
      return prev.slice(0, -1);
    });
  }, []);

  const stepNumber = stepNumberFor(phase);
  // Ook op klaar/confirm: terug naar propose of adjust (niet Stoppen).
  const canGoBack =
    history.length > 0 && phase !== "account" && phase !== "name";

  const pickEnergy = (energy: V2Energy) => {
    userPickedEnergy.current = true;
    freshStartHandled.current = true;
    recordV2EnergyForToday(energy);
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
    if (shouldShowPostOnboardingAccountSave()) {
      persistV2OnboardingUiPhase("account");
      goTo("account");
      return;
    }
    goHomeAfterOnboarding();
  };

  const finishName = async (name: string) => {
    setNameBusy(true);
    setNameError(null);
    const trimmed = persistV2PreferredName(name);
    update({ name: trimmed });
    try {
      const supabase = createClient();
      if (supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { error } = await persistPreferredDisplayName(user, trimmed);
          if (error) {
            setNameError(t("v2.nameError"));
            setNameBusy(false);
            return;
          }
        }
      }
      dismissV2PostAccountNamePrompt();
      trackV2NameStepCompleted({
        skipped: false,
        hadPrefill: namePrefill.length >= 2,
      });
      goHomeAfterOnboarding();
    } catch {
      setNameError(t("v2.nameError"));
      setNameBusy(false);
    }
  };

  const skipName = () => {
    // Soft: Google-prefill toch gebruiken voor begroeting, zonder te forceren.
    if (namePrefill.trim().length >= 2) {
      const soft = persistV2PreferredName(namePrefill);
      update({ name: soft });
    }
    dismissV2PostAccountNamePrompt();
    trackV2NameStepCompleted({
      skipped: true,
      hadPrefill: namePrefill.length >= 2,
    });
    goHomeAfterOnboarding();
  };

  const flowLayout = v2FlowLayoutForOnboardingPhase(phase);
  // Cyclus-hint onderaan op energy: geen dubbele "Stoppen kan altijd" onderaan.
  // Done: bewust geen reassurance.
  const showReassurance = phase === "energy" && !showCycleDiscover;
  const langTrailing =
    phase === "energy" ? (
      <V2LanguageToggle
        onChange={(next) => {
          patchV2Settings({ locale: next });
        }}
      />
    ) : undefined;

  if (phase === "account") {
    return (
      <V2Page>
        <V2AccountSaveStep
          onAccountCreated={() => {
            nameEntryHandled.current = true;
            freshStartHandled.current = true;
            void enterNamePhase({ fromAccountSave: true });
          }}
        />
      </V2Page>
    );
  }

  if (phase === "name") {
    return (
      <V2Page>
        <V2FlowStickyChrome>
          <V2Header
            exitHref="/"
            exitLabel={t("v2.flowStop")}
            brandMode="flow"
          />
        </V2FlowStickyChrome>
        <div style={v2Styles.flowShell}>
          <div style={v2FlowWrapStyle("welcome")}>
            <section style={v2Styles.card} aria-live="polite">
              <V2NameStep
                key={namePrefill}
                initialName={namePrefill}
                busy={nameBusy}
                error={nameError}
                onContinue={finishName}
                onSkip={skipName}
              />
            </section>
          </div>
        </div>
      </V2Page>
    );
  }

  return (
    <V2Page>
      <V2FlowStickyChrome>
        <V2Header
          exitHref="https://www.structuro.eu"
          exitLabel={t("v2.flowStop")}
          onBack={canGoBack ? goBack : undefined}
          trailing={langTrailing}
          brandMode="flow"
        />
        <V2ProgressDots step={stepNumber} total={TOTAL_STEPS} showLabel={false} />
      </V2FlowStickyChrome>

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
