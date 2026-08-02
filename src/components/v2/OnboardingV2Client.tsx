"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { persistPreferredDisplayName } from "@/lib/accountDisplayName";
import { useI18n } from "@/lib/i18n";
import { resolveLoggedInInstallContinuePath } from "@/lib/pwaInstallHint";
import { createClient } from "@/lib/supabase/client";
import { isGiftCompSignupSource } from "@/lib/giftCompAccess";
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
  bounceGuestFromNamePhase,
  clearV2OnboardingUiPhase,
  peekV2OnboardingUiPhase,
  persistV2OnboardingUiPhase,
  shouldSkipFreshStartEnergyReset,
} from "./v2OnboardingPhaseGate";
import {
  buildOnboardingThingsWithCompanions,
  persistOnboardingOwnTask,
} from "./v2OnboardingOwnTask";
import V2ProposeStep from "./V2ProposeStep";
import V2OwnTaskStep, { type V2OwnTaskConfirmPayload } from "./V2OwnTaskStep";
import V2AdjustStep from "./V2AdjustStep";
import V2DoneStep from "./V2DoneStep";
import V2AccountSaveStep from "./V2AccountSaveStep";
import V2NameStep from "./V2NameStep";

/**
 * Eerste reis: energy → eigen taak (+ AI micros) → klaar → (guest) account → naam → home.
 * Escape: bank-adjust. Progress: 2 segmenten.
 *
 * INITIAL_PHASE is altijd "energy" (SSR = client, geen hydration-mismatch).
 */
type Phase = "energy" | "ownTask" | "adjust" | "done" | "account" | "name";

/** Standalone phone: 5 segmenten (energy → ownTask → done → account → name). */
const TOTAL_STEPS = 5;

function stepNumberFor(phase: Phase): number {
  switch (phase) {
    case "energy":
      return 1;
    case "ownTask":
    case "adjust":
      return 2;
    case "done":
      return 3;
    case "account":
      return 4;
    case "name":
      return 5;
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
  const [primaryTaskTitle, setPrimaryTaskTitle] = useState<string | null>(null);
  const [primaryMicroSteps, setPrimaryMicroSteps] = useState<string[]>([]);
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
      setPrimaryTaskTitle(null);
      setPrimaryMicroSteps([]);
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
            // Jasper / café / gift zonder kaart: install (mobiel) of home.
            // Card-cohort: checkout-gate; install komt na Stripe of via home-gate.
            if (isEventSignupSource(source) || isGiftCompSignupSource(source)) {
              go(resolveLoggedInInstallContinuePath(), { todayDone: false });
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

      // Auth-gate eerst, snel en lokaal: de naamstap mag nooit
      // zichtbaar/getrackt worden zonder sessie (bv. Google afgebroken +
      // terug-navigatie met stale sessionStorage-vlag). getSession() leest
      // uit lokale opslag (geen netwerk-JWT-verify) en beslist meteen of we
      // bouncen, zodat de happy path geen extra flash/vertraging krijgt.
      const supabase = createClient();
      let hasSession = false;
      try {
        if (supabase) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          hasSession = Boolean(session?.user?.id);
        }
      } catch {
        /* geen sessie / netwerkfout: behandel als guest, geen naamstap */
      }

      if (!hasSession) {
        bounceGuestFromNamePhase();
        setHistory([]);
        setPhase("account");
        return;
      }

      // Sessie staat vast; ná de gate mag getUser() (netwerk-JWT-verify)
      // voor verse metadata bij het ophalen van de prefill-naam.
      let profilePreferred: string | null = null;
      let profileDisplay: string | null = null;
      let metaPrefill = "";

      try {
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
        /* best-effort prefill: sessie stond al vast via getSession */
      }

      persistV2OnboardingUiPhase("name");
      setHistory([]);
      setPhase("name");
      setNameError(null);
      trackV2NameStepShown();

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
      if (saved === "account") {
        setPhase("account");
      }
      // Bewust NIET direct naar "name" bij saved === "name", ?name=1 of een
      // losse pending-vlag: de auth-gated enterNamePhase-effect hieronder
      // bepaalt eerst of er een echte sessie is, anders blijft dit "energy"
      // (onschuldig) tot die check klaar is.
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
    if (phase === "ownTask") trackV2OnboardingStep("ownTask");
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

  const finishThings = (
    nextThings: string[],
    adjusted: boolean,
    meta?: {
      primaryTitle?: string | null;
      microSteps?: string[];
      usedWelcome?: boolean;
      usedAi?: boolean;
    },
  ) => {
    const normalized = v2NormalizeThings(nextThings);
    update({ things: normalized, todayDone: false });
    setPrimaryTaskTitle(meta?.primaryTitle?.trim() || null);
    setPrimaryMicroSteps(meta?.microSteps ?? []);
    const companionCount = Math.max(
      0,
      normalized.length - (meta?.primaryTitle?.trim() ? 1 : 0),
    );
    trackV2OnboardingTasks({
      energy: state.energy,
      thingCount: normalized.length,
      adjusted,
      usedWelcome: meta?.usedWelcome,
      usedAi: meta?.usedAi,
      companionCount,
    });
    goTo("done");
  };

  const openOwnTask = () => {
    goTo("ownTask");
  };

  const openAdjust = () => {
    const picks = selectedThings.length > 0 ? selectedThings : proposals;
    setSelectedThings(picks);
    goTo("adjust");
  };

  const confirmOwnTask = (payload: V2OwnTaskConfirmPayload) => {
    persistOnboardingOwnTask({
      title: payload.title,
      microStepTitles: payload.microStepTitles,
      energy: state.energy,
    });
    const nextThings = buildOnboardingThingsWithCompanions(
      payload.title,
      state.energy,
      locale,
    );
    finishThings(nextThings, false, {
      primaryTitle: payload.title,
      microSteps: payload.microStepTitles,
      usedWelcome: payload.usedWelcome,
      usedAi: payload.usedAi,
    });
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

  // Energy: welcome-wrap vult hoogte; V2ProposeStep centreert content en pin’t CTA onderaan.
  // Own-task: choices (opties bovenaan).
  const flowLayout =
    phase === "ownTask"
      ? "choices"
      : v2FlowLayoutForOnboardingPhase(phase);
  // Cyclus-hint onderaan op energy: geen dubbele "Stoppen kan altijd" onderaan.
  // Done: bewust geen reassurance.
  const showReassurance = phase === "energy" && !showCycleDiscover;
  const ownTaskPhone = phase === "ownTask";
  const energyPhone = phase === "energy";
  const langTrailing =
    phase === "energy" ? (
      <V2LanguageToggle
        onChange={(next) => {
          patchV2Settings({ locale: next });
        }}
      />
    ) : undefined;

  if (phase === "account") {
    // Bewijskaart: de dagstart-taken (niet de microstappen van één taak).
    const previewTasks =
      things.length > 0
        ? things
        : primaryTaskTitle
          ? [primaryTaskTitle]
          : [];
    return (
      <V2Page>
        <V2AccountSaveStep
          previewSteps={previewTasks}
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
            brandMode="none"
            backPlain
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
          brandMode="none"
          backPlain
        />
        <V2ProgressDots step={stepNumber} total={TOTAL_STEPS} showLabel={false} />
      </V2FlowStickyChrome>

      <div style={v2Styles.flowShell}>
        <div
          style={
            energyPhone
              ? {
                  ...v2FlowWrapStyle("welcome"),
                  /* Vullen, niet als blok centreren: body/footer doen de layout. */
                  justifyContent: "flex-start",
                }
              : v2FlowWrapStyle(flowLayout)
          }
        >
          <section
            style={
              energyPhone || ownTaskPhone ? v2Styles.cardEnergy : v2Styles.card
            }
            className={
              ownTaskPhone
                ? "v2-own-task-shell"
                : energyPhone
                  ? "v2-energy-shell"
                  : undefined
            }
            aria-live="polite"
          >
            {phase === "energy" ? (
              <V2ProposeStep
                energy={state.energy}
                proposals={[]}
                showProposals={false}
                showOwnTasksHint={false}
                showAdjust={false}
                confirmLabel={t("v2.ownTaskEnergyContinue")}
                onPickEnergy={pickEnergy}
                onConfirm={openOwnTask}
                onAdjust={openAdjust}
                showCycleDiscover={showCycleDiscover}
              />
            ) : null}

            {phase === "ownTask" ? (
              <V2OwnTaskStep
                energy={state.energy}
                onConfirm={confirmOwnTask}
                onAdjust={openAdjust}
              />
            ) : null}

            {phase === "adjust" ? (
              <V2AdjustStep
                options={adjustOptions}
                selected={selectedThings}
                maxSlots={maxSlots}
                onToggle={toggleAdjust}
                onConfirm={() =>
                  finishThings(selectedThings, true, {
                    primaryTitle: selectedThings[0] ?? null,
                    microSteps: [],
                  })
                }
                onSkip={() => finishThings([], true)}
              />
            ) : null}

            {phase === "done" ? (
              <V2DoneStep
                things={things}
                primaryTitle={primaryTaskTitle}
                microSteps={primaryMicroSteps}
                companionsLead={
                  primaryTaskTitle && things.length > 1
                    ? state.energy === "enough"
                      ? t("v2.ownTaskCompanionsLeadEnough")
                      : t("v2.ownTaskCompanionsLeadHigh")
                    : null
                }
                companionsNote={
                  primaryTaskTitle && things.length > 1
                    ? t("v2.ownTaskCompanionsNote")
                    : null
                }
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
