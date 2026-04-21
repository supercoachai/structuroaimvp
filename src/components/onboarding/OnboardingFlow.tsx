"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Layers,
  Moon,
  Smile,
  Sun,
  Target,
  Zap,
} from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { persistPreferredDisplayName } from "@/lib/accountDisplayName";
import { setProfileOnboardingCompleted } from "@/lib/onboardingMutations";
import {
  isLocalOnboardingCompleted,
  setLocalOnboardingCompleted,
} from "@/lib/onboardingProfile";
import { clearLocalSessionFresh } from "@/lib/localModeSession";
import {
  hasStructuroLocalModeCookieOnClient,
  setLocalOnboardingDoneCookieOnClient,
} from "@/lib/localOnboardingCookie";
import { triggerHaptic, HAPTIC_PATTERNS } from "@/lib/haptics";
import {
  getCalendarDateAmsterdam,
  getTimeOfDayGreetingNl,
  setDagstartCookieOnClient,
} from "@/lib/dagstartCookie";
import { updateProfileAfterDagstartComplete } from "@/lib/supabase/profileDagstartDb";
import { microStepId, type MicroStep } from "@/lib/microSteps";
import { addTaskToSupabase } from "@/lib/supabase/tasksDb";
import { upsertCheckInToSupabase } from "@/lib/supabase/checkinsDb";
import { addTaskToStorage, saveCheckInToStorage } from "@/lib/localStorageTasks";

const STEP_COUNT = 10;
/** Horizontale slide tussen stappen (bewust rustig). */
const SLIDE_MS = 1200;
const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

/** Gecombineerde microstappen + parkeren-demo (0-based stap-index). */
const MICRO_MERGED_SLIDE_INDEX = 4;
const NAME_SLIDE_INDEX = 5;
const FIRST_DAY_SLIDE_INDEX = 7;

const MICRO_DEMO_STEPS = [
  "Bureau leegmaken",
  "Kleding in de kast",
  "Vloer stofzuigen",
] as const;

const PARKEREN_TEXT = "Bel mama terug...";

/** Parkeren-demo: korte pauzes, rustigere typing, daarna klik → toast. */
/** Eerst H2 + uitleg lezen, daarna pas voorbeeldzin "Bel mama terug" en demo. */
const PARKEREN_READ_INTRO_MS = 2000;
const PARKEREN_ANIM_BASE_MS = 400;
const PARKEREN_STAGE2_DELAY_MS = 280;
/** Ms per teken in parkeren-demo (bewust traag leesbaar). */
const PARKEREN_TYPE_CHAR_MS = 64;
const PARKEREN_AFTER_TYPE_BEFORE_CLICK_MS = 220;
/** Tijd tussen knop-highlight en toast (+1,5 s t.o.v. korte variant). */
const PARKEREN_CLICK_TO_TOAST_MS = 1860;

/** Eerste zin van de tagline (letter voor letter, rustig tempo). */
const WELCOME_TAGLINE_TYPED = "De app voor mensen die anders denken.";
/** Ms tussen tekens tagline (2x sneller t.o.v. eerdere 142ms). */
const WELCOME_TAGLINE_CHAR_MS = 71;
/** Na kernwoorden: spatie + slot met punt (letter voor letter). */
const WELCOME_TYPING_SUFFIX = " op jouw energie.";

/** Bodycopy onder H2: zelfde opmaak als designref (regulier, #4A5568, vaste regelafstand). */
const OB_INTRO_OUTER =
  "mt-4 flex w-full max-w-md flex-col items-stretch gap-y-[1.05em] text-center";
const OB_INTRO_P =
  "font-normal text-[#4A5568] text-base leading-[1.65] tracking-normal";

export default function OnboardingFlow() {
  const { user, loading: userLoading } = useUser();
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const touchStartX = useRef<number | null>(null);
  /**
   * Demo-animatie microstappen: 0 = eerste actief, 1..3 = zoveel stappen afgerond, 4 = afronding getoond.
   * Loopt alleen op het microstappen-scherm; reset bij verlaten van die stap.
   */
  const [microDemoStage, setMicroDemoStage] = useState(0);
  const [energyStage, setEnergyStage] = useState(0);
  const [focuspuntenStage, setFocuspuntenStage] = useState(0);
  const [focusModeStage, setFocusModeStage] = useState(0);
  const [parkerenStage, setParkerenStage] = useState(0);
  const [parkerenTypedChars, setParkerenTypedChars] = useState(0);
  /** Parkeren-sectie zichtbaar in viewport (IO); animatie start pas daarna en na micro-demo. */
  const [parkerenSectionInView, setParkerenSectionInView] = useState(false);
  const parkerenAnimStartedRef = useRef(false);
  const autoScrollToParkerenRef = useRef(false);
  const parkerenSectionElRef = useRef<HTMLDivElement | null>(null);
  /** Eén confetti-burst als micro-demo "Klaar." bereikt (zelfde bezoek aan de slide). */
  const microDemoConfettiFiredRef = useRef(false);
  /** Welkom-slide animatie (alleen stap 0). */
  const [welcomeShowLogo, setWelcomeShowLogo] = useState(false);
  const [welcomeShowTitle, setWelcomeShowTitle] = useState(false);
  const [welcomeTaglineCharCount, setWelcomeTaglineCharCount] = useState(0);
  /** 0 = nog geen kernwoord; 1 = rust,; 2 = +focus; 3 = +en structuur */
  const [welcomeBlueStep, setWelcomeBlueStep] = useState(0);
  const [welcomeTypingChars, setWelcomeTypingChars] = useState(0);
  const [welcomeShowSubtitle, setWelcomeShowSubtitle] = useState(false);
  const [welcomeShowCta, setWelcomeShowCta] = useState(false);
  /** Browser timer id (number); los van NodeJS.Timeout uit @types/node. */
  const welcomeTypingIntervalRef = useRef<number | null>(null);
  const welcomeTaglineIntervalRef = useRef<number | null>(null);
  const [firstDayEnergy, setFirstDayEnergy] = useState<"low" | "medium" | "high" | null>(null);
  const [firstTaskTitle, setFirstTaskTitle] = useState("");
  const [firstTaskEstimatedMinutes, setFirstTaskEstimatedMinutes] = useState<number | null>(null);
  /** null = nog niet gekozen op eerste-dag-slide */
  const [firstDayUseMicroSteps, setFirstDayUseMicroSteps] = useState<boolean | null>(null);
  const [firstDayMicroTitles, setFirstDayMicroTitles] = useState<string[]>([]);
  const [firstDayMicroInput, setFirstDayMicroInput] = useState("");
  /** Stap B (taak) pas na korte pauze na energiekeuze, zodat het rustig binnenkomt. */
  const [firstDayTaskPhaseVisible, setFirstDayTaskPhaseVisible] = useState(false);
  /** Minutenblok pas na korte pauze + eigen fade-in (niet “pats” na taak). */
  const [firstDayDurationVisible, setFirstDayDurationVisible] = useState(false);
  const firstDayTaskBlockRef = useRef<HTMLDivElement | null>(null);
  const firstTaskInputRef = useRef<HTMLInputElement | null>(null);
  const firstDayDurationBlockRef = useRef<HTMLDivElement | null>(null);
  const firstTaskDurationInputRef = useRef<HTMLInputElement | null>(null);
  const firstDayBeginCtaRef = useRef<HTMLButtonElement | null>(null);
  const durationAutoFocusDoneRef = useRef(false);
  const reduceMotionRef = useRef(false);

  const isLocalMode = hasStructuroLocalModeCookieOnClient();

  /** Begroeting op basis van actuele tijd in Amsterdam (zelfde als dagstart). Vernieuwt als je deze stap opnieuw opent. */
  const firstDaySlideGreeting = useMemo(() => getTimeOfDayGreetingNl(), [step]);

  const firstDayMinutesOk =
    firstTaskEstimatedMinutes != null &&
    firstTaskEstimatedMinutes >= 1 &&
    firstTaskEstimatedMinutes <= 480;
  const firstDayMicroStepsResolved =
    firstDayUseMicroSteps === false ||
    (firstDayUseMicroSteps === true && firstDayMicroTitles.length > 0);
  const firstDayReady =
    Boolean(firstDayEnergy) &&
    firstTaskTitle.trim().length >= 2 &&
    firstDayMinutesOk &&
    firstDayUseMicroSteps !== null &&
    firstDayMicroStepsResolved;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      reduceMotionRef.current = mq.matches;
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (isLocalMode && isLocalOnboardingCompleted()) {
      setLocalOnboardingDoneCookieOnClient();
      clearLocalSessionFresh();
      window.location.replace("/");
    }
  }, [isLocalMode]);

  useEffect(() => {
    if (isLocalMode) return;
    if (userLoading) return;
    if (!user?.id) window.location.replace("/login");
  }, [isLocalMode, userLoading, user?.id]);

  /** Laatste slide: stap voor stap opbouwen tot de CTA zichtbaar is. */
  const [readySlidePhase, setReadySlidePhase] = useState(0);
  const readySlideConfettiFiredRef = useRef(false);

  useEffect(() => {
    if (step !== STEP_COUNT - 1) {
      setReadySlidePhase(0);
      readySlideConfettiFiredRef.current = false;
      return;
    }
    const rm = reduceMotionRef.current;
    if (rm) {
      setReadySlidePhase(7);
      return;
    }
    setReadySlidePhase(0);
    const timers: number[] = [];
    const t = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms) as unknown as number);
    t(120, () => setReadySlidePhase(1));
    t(420, () => setReadySlidePhase(2));
    t(780, () => setReadySlidePhase(3));
    t(1120, () => setReadySlidePhase(4));
    t(1460, () => setReadySlidePhase(5));
    t(1800, () => setReadySlidePhase(6));
    t(2240, () => setReadySlidePhase(7));
    return () => timers.forEach(clearTimeout);
  }, [step]);

  useEffect(() => {
    if (step !== STEP_COUNT - 1) return;
    if (readySlidePhase < 7) return;
    if (readySlideConfettiFiredRef.current) return;
    readySlideConfettiFiredRef.current = true;
    confetti({
      particleCount: 70,
      spread: 65,
      origin: { y: 0.55 },
      colors: ["#22c55e", "#3b82f6", "#a855f7", "#f59e0b"],
    });
  }, [step, readySlidePhase]);

  /** Eerste dagstart: brugzin direct; invoerveld na 300ms fade + korte buffer (progressive disclosure). */
  useEffect(() => {
    if (step !== FIRST_DAY_SLIDE_INDEX) {
      setFirstDayTaskPhaseVisible(false);
      return;
    }
    if (!firstDayEnergy) {
      setFirstDayTaskPhaseVisible(false);
      return;
    }
    const t = window.setTimeout(() => setFirstDayTaskPhaseVisible(true), 350);
    return () => clearTimeout(t);
  }, [step, firstDayEnergy]);

  /** Minuten-sectie: korte adempauze na 2+ tekens taak, dan vloeiend tonen. */
  useEffect(() => {
    if (step !== FIRST_DAY_SLIDE_INDEX) {
      setFirstDayDurationVisible(false);
      return;
    }
    if (firstTaskTitle.trim().length < 2) {
      setFirstDayDurationVisible(false);
      return;
    }
    const t = window.setTimeout(() => setFirstDayDurationVisible(true), 200);
    return () => clearTimeout(t);
  }, [step, firstTaskTitle]);

  /** Zodra taak-sectie zichtbaar is: scroll naar blok en focus op het veld. */
  useEffect(() => {
    if (!firstDayTaskPhaseVisible) return;
    const instant = reduceMotionRef.current;
    const id = requestAnimationFrame(() => {
      firstDayTaskBlockRef.current?.scrollIntoView({
        behavior: instant ? "auto" : "smooth",
        block: "nearest",
      });
      firstTaskInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [firstDayTaskPhaseVisible]);

  useEffect(() => {
    if (firstTaskTitle.trim().length < 2) {
      setFirstTaskEstimatedMinutes(null);
      durationAutoFocusDoneRef.current = false;
    }
  }, [firstTaskTitle]);

  /** Minuten ongeldig: micro-keuze resetten */
  useEffect(() => {
    if (step !== FIRST_DAY_SLIDE_INDEX) return;
    if (firstDayMinutesOk) return;
    setFirstDayUseMicroSteps(null);
    setFirstDayMicroTitles([]);
    setFirstDayMicroInput("");
  }, [step, firstDayMinutesOk]);

  useEffect(() => {
    if (step !== FIRST_DAY_SLIDE_INDEX) durationAutoFocusDoneRef.current = false;
  }, [step]);

  /** Na zichtbare minuten-sectie: één keer zacht scrollen en focus (na fade-in). */
  useEffect(() => {
    if (!firstDayTaskPhaseVisible) return;
    if (!firstDayDurationVisible) return;
    if (firstTaskTitle.trim().length < 2) return;
    if (durationAutoFocusDoneRef.current) return;
    durationAutoFocusDoneRef.current = true;
    const instant = reduceMotionRef.current;
    const t = window.setTimeout(() => {
      firstDayDurationBlockRef.current?.scrollIntoView({
        behavior: instant ? "auto" : "smooth",
        block: "nearest",
      });
      firstTaskDurationInputRef.current?.focus({ preventScroll: true });
    }, instant ? 0 : 360);
    return () => clearTimeout(t);
  }, [firstDayTaskPhaseVisible, firstDayDurationVisible, firstTaskTitle]);

  /** Taak + minuten compleet: scroll binnen de slide zodat "Begin mijn dag" zichtbaar is. */
  useEffect(() => {
    if (step !== FIRST_DAY_SLIDE_INDEX) return;
    if (!firstDayReady) return;
    const instant = reduceMotionRef.current;
    const id = requestAnimationFrame(() => {
      firstDayBeginCtaRef.current?.scrollIntoView({
        behavior: instant ? "auto" : "smooth",
        block: "nearest",
        inline: "nearest",
      });
    });
    return () => cancelAnimationFrame(id);
  }, [step, firstDayReady]);

  /** Bij stapwissel: meteen naar top (layout + na slide-transitie), zodat de volgende stap niet “leeg onderaan” start. */
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const scrollAllToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.documentElement.scrollTop = 0;
      document.documentElement.scrollLeft = 0;
      document.body.scrollTop = 0;
      document.body.scrollLeft = 0;
      document.querySelectorAll("[data-ob-slide]").forEach((node) => {
        const el = node as HTMLElement;
        el.scrollTop = 0;
        el.scrollLeft = 0;
      });
    };
    scrollAllToTop();
    requestAnimationFrame(() => {
      scrollAllToTop();
      requestAnimationFrame(scrollAllToTop);
    });
    setParkerenSectionInView(false);
    parkerenAnimStartedRef.current = false;
    autoScrollToParkerenRef.current = false;
    const afterSlide = window.setTimeout(scrollAllToTop, SLIDE_MS + 80);
    return () => clearTimeout(afterSlide);
  }, [step]);

  /** Microstappen-demo alleen (zelfde slide als parkeren; parkeren start apart na scroll + IO). */
  useEffect(() => {
    if (step !== MICRO_MERGED_SLIDE_INDEX) {
      setMicroDemoStage(0);
      setParkerenStage(0);
      setParkerenTypedChars(0);
      return;
    }
    if (typeof window === "undefined") return;
    const reduceMotion = reduceMotionRef.current;
    if (reduceMotion) {
      setMicroDemoStage(4);
      setParkerenStage(4);
      setParkerenTypedChars(PARKEREN_TEXT.length);
      setParkerenSectionInView(true);
      return;
    }
    setMicroDemoStage(0);
    setParkerenStage(0);
    setParkerenTypedChars(0);
    /** Rust voor de kaart; daarna gelijke tussenruimte per stap (~30% strakker dan eerdere versie). */
    const START_MS = 1550;
    const STEP_MS = 1260;
    /** Kortere pauze zodra alle drie de microstappen klaar zijn, vóór "Klaar." */
    const PAUSE_AFTER_ALL_THREE_MS = 400;
    const t4At = START_MS + STEP_MS * 2 + PAUSE_AFTER_ALL_THREE_MS;
    const t1 = window.setTimeout(() => {
      setMicroDemoStage(1);
      triggerHaptic(HAPTIC_PATTERNS.MICROSTEP_DONE);
    }, START_MS);
    const t2 = window.setTimeout(() => {
      setMicroDemoStage(2);
      triggerHaptic(HAPTIC_PATTERNS.MICROSTEP_DONE);
    }, START_MS + STEP_MS);
    const t3 = window.setTimeout(() => {
      setMicroDemoStage(3);
      triggerHaptic(HAPTIC_PATTERNS.MICROSTEP_DONE);
    }, START_MS + STEP_MS * 2);
    const t4 = window.setTimeout(() => setMicroDemoStage(4), t4At);
    return () => {
      [t1, t2, t3, t4].forEach(clearTimeout);
    };
  }, [step]);

  /** Dopamine-moment: confetti wanneer alle microstappen klaar zijn (ADHD-vriendelijke beloning). */
  useEffect(() => {
    if (step !== MICRO_MERGED_SLIDE_INDEX) {
      microDemoConfettiFiredRef.current = false;
      return;
    }
    if (microDemoStage < 4) {
      microDemoConfettiFiredRef.current = false;
      return;
    }
    if (microDemoConfettiFiredRef.current) return;
    microDemoConfettiFiredRef.current = true;
    const rm = reduceMotionRef.current;
    confetti({
      particleCount: rm ? 26 : 56,
      spread: rm ? 48 : 70,
      startVelocity: rm ? 22 : 36,
      gravity: 0.9,
      origin: { x: 0.5, y: 0.38 },
      colors: ["#22c55e", "#3b82f6", "#a855f7", "#f59e0b", "#8b5cf6"],
      ticks: rm ? 100 : 180,
      scalar: 0.95,
    });
  }, [step, microDemoStage]);

  /** Parkeren-demo: alleen als micro klaar is én parkeren-sectie in beeld (niet tegelijk met micro). */
  useEffect(() => {
    if (step !== MICRO_MERGED_SLIDE_INDEX) return;
    if (reduceMotionRef.current) return;
    if (!parkerenSectionInView || microDemoStage < 4) return;
    if (parkerenAnimStartedRef.current) return;
    parkerenAnimStartedRef.current = true;
    setParkerenStage(0);
    setParkerenTypedChars(0);
    const stage2At =
      PARKEREN_READ_INTRO_MS +
      PARKEREN_ANIM_BASE_MS +
      PARKEREN_STAGE2_DELAY_MS;
    const stage3At =
      stage2At +
      PARKEREN_TEXT.length * PARKEREN_TYPE_CHAR_MS +
      PARKEREN_AFTER_TYPE_BEFORE_CLICK_MS;
    const stage4At = stage3At + PARKEREN_CLICK_TO_TOAST_MS;
    const t5 = window.setTimeout(() => setParkerenStage(1), PARKEREN_READ_INTRO_MS);
    const t6 = window.setTimeout(() => setParkerenStage(2), stage2At);
    const t7 = window.setTimeout(() => setParkerenStage(3), stage3At);
    const t8 = window.setTimeout(() => setParkerenStage(4), stage4At);
    return () => {
      [t5, t6, t7, t8].forEach(clearTimeout);
      parkerenAnimStartedRef.current = false;
    };
  }, [step, parkerenSectionInView, microDemoStage]);

  /** Intersection Observer: parkeren-sectie in beeld (animatie start pas dan). */
  useEffect(() => {
    if (step !== MICRO_MERGED_SLIDE_INDEX) return;
    if (reduceMotionRef.current) {
      setParkerenSectionInView(true);
      return;
    }
    let obs: IntersectionObserver | null = null;
    const id = requestAnimationFrame(() => {
      const el = parkerenSectionElRef.current;
      if (!el) return;
      obs = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting && e.intersectionRatio >= 0.12) {
              setParkerenSectionInView(true);
              break;
            }
          }
        },
        { threshold: [0, 0.12, 0.25, 0.45] }
      );
      obs.observe(el);
    });
    return () => {
      cancelAnimationFrame(id);
      obs?.disconnect();
    };
  }, [step]);

  /** Na micro-afronding: één keer vloeiend naar parkeren-sectie scrollen. */
  useEffect(() => {
    if (step !== MICRO_MERGED_SLIDE_INDEX) return;
    if (reduceMotionRef.current) return;
    if (microDemoStage < 4) return;
    if (autoScrollToParkerenRef.current) return;
    autoScrollToParkerenRef.current = true;
    const t = window.setTimeout(() => {
      parkerenSectionElRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 420);
    return () => clearTimeout(t);
  }, [step, microDemoStage]);

  /** Welkom: logo + titel, zin 1 letter voor letter (rustig), kernwoorden in blauw, slot letter voor letter. */
  useEffect(() => {
    if (step !== 0) {
      if (welcomeTypingIntervalRef.current) {
        clearInterval(welcomeTypingIntervalRef.current);
        welcomeTypingIntervalRef.current = null;
      }
      if (welcomeTaglineIntervalRef.current != null) {
        clearInterval(welcomeTaglineIntervalRef.current as unknown as number);
        welcomeTaglineIntervalRef.current = null;
      }
      setWelcomeShowLogo(false);
      setWelcomeShowTitle(false);
      setWelcomeTaglineCharCount(0);
      setWelcomeBlueStep(0);
      setWelcomeTypingChars(0);
      setWelcomeShowSubtitle(false);
      setWelcomeShowCta(false);
      return;
    }
    const rm = reduceMotionRef.current;
    if (rm) {
      setWelcomeShowLogo(true);
      setWelcomeShowTitle(true);
      setWelcomeTaglineCharCount(WELCOME_TAGLINE_TYPED.length);
      setWelcomeBlueStep(3);
      setWelcomeTypingChars(WELCOME_TYPING_SUFFIX.length);
      setWelcomeShowSubtitle(true);
      setWelcomeShowCta(true);
      return;
    }
    setWelcomeShowLogo(false);
    setWelcomeShowTitle(false);
    setWelcomeTaglineCharCount(0);
    setWelcomeBlueStep(0);
    setWelcomeTypingChars(0);
    setWelcomeShowSubtitle(false);
    setWelcomeShowCta(false);

    const timers: number[] = [];
    const extraTimers: number[] = [];
    const pushTimeout = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(fn, ms) as unknown as number);
    };
    let at = 280;
    pushTimeout(() => setWelcomeShowLogo(true), at);
    at += 720;
    pushTimeout(() => setWelcomeShowTitle(true), at);
    at += 980;
    pushTimeout(() => {
      let c = 0;
      welcomeTaglineIntervalRef.current = window.setInterval(() => {
        c += 1;
        setWelcomeTaglineCharCount(c);
        if (c >= WELCOME_TAGLINE_TYPED.length) {
          if (welcomeTaglineIntervalRef.current != null) {
            clearInterval(welcomeTaglineIntervalRef.current as unknown as number);
            welcomeTaglineIntervalRef.current = null;
          }
          let delay = 620;
          extraTimers.push(
            window.setTimeout(() => {
              setWelcomeBlueStep(1);
              triggerHaptic(HAPTIC_PATTERNS.MICROSTEP_DONE);
            }, delay) as unknown as number
          );
          delay += 820;
          extraTimers.push(
            window.setTimeout(() => {
              setWelcomeBlueStep(2);
              triggerHaptic(HAPTIC_PATTERNS.MICROSTEP_DONE);
            }, delay) as unknown as number
          );
          delay += 920;
          extraTimers.push(
            window.setTimeout(() => {
              setWelcomeBlueStep(3);
              triggerHaptic(HAPTIC_PATTERNS.MICROSTEP_DONE);
            }, delay) as unknown as number
          );
          delay += 640;
          extraTimers.push(
            window.setTimeout(() => {
              let sc = 0;
              welcomeTypingIntervalRef.current = window.setInterval(() => {
                sc += 1;
                setWelcomeTypingChars(sc);
                if (sc >= WELCOME_TYPING_SUFFIX.length) {
                  if (welcomeTypingIntervalRef.current != null) {
                    clearInterval(welcomeTypingIntervalRef.current as unknown as number);
                    welcomeTypingIntervalRef.current = null;
                  }
                  const subtitleDelay = 1400;
                  const ctaAfterSubtitle = 1100;
                  extraTimers.push(
                    window.setTimeout(() => setWelcomeShowSubtitle(true), subtitleDelay) as unknown as number
                  );
                  extraTimers.push(
                    window.setTimeout(
                      () => setWelcomeShowCta(true),
                      subtitleDelay + ctaAfterSubtitle
                    ) as unknown as number
                  );
                }
              }, 76) as unknown as number;
            }, delay) as unknown as number
          );
        }
      }, WELCOME_TAGLINE_CHAR_MS) as unknown as number;
    }, at);

    return () => {
      timers.forEach((id) => clearTimeout(id as unknown as ReturnType<typeof setTimeout>));
      extraTimers.forEach((id) => clearTimeout(id as unknown as ReturnType<typeof setTimeout>));
      if (welcomeTypingIntervalRef.current != null) {
        clearInterval(welcomeTypingIntervalRef.current as unknown as number);
        welcomeTypingIntervalRef.current = null;
      }
      if (welcomeTaglineIntervalRef.current != null) {
        clearInterval(welcomeTaglineIntervalRef.current as unknown as number);
        welcomeTaglineIntervalRef.current = null;
      }
    };
  }, [step]);

  useEffect(() => {
    if (step !== 1) { setEnergyStage(0); return; }
    const rm = reduceMotionRef.current;
    if (rm) { setEnergyStage(4); return; }
    setEnergyStage(0);
    const t1 = setTimeout(() => setEnergyStage(1), 1000);
    const t2 = setTimeout(() => setEnergyStage(2), 1800);
    const t3 = setTimeout(() => setEnergyStage(3), 2600);
    const t4 = setTimeout(() => setEnergyStage(4), 3800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [step]);

  useEffect(() => {
    if (step !== 2) { setFocuspuntenStage(0); return; }
    const rm = reduceMotionRef.current;
    if (rm) { setFocuspuntenStage(3); return; }
    setFocuspuntenStage(0);
    const t1 = setTimeout(() => setFocuspuntenStage(1), 1000);
    const t2 = setTimeout(() => setFocuspuntenStage(2), 1800);
    const t3 = setTimeout(() => setFocuspuntenStage(3), 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [step]);

  useEffect(() => {
    if (step !== 3) { setFocusModeStage(0); return; }
    const rm = reduceMotionRef.current;
    if (rm) { setFocusModeStage(3); return; }
    setFocusModeStage(0);
    const t1 = setTimeout(() => setFocusModeStage(1), 1000);
    const t2 = setTimeout(() => setFocusModeStage(2), 1800);
    const t3 = setTimeout(() => setFocusModeStage(3), 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [step]);

  useEffect(() => {
    if (parkerenStage !== 2) return;
    let i = 0;
    setParkerenTypedChars(0);
    const interval = setInterval(() => {
      i++;
      setParkerenTypedChars(i);
      if (i >= PARKEREN_TEXT.length) clearInterval(interval);
    }, PARKEREN_TYPE_CHAR_MS);
    return () => clearInterval(interval);
  }, [parkerenStage]);

  const goNext = useCallback(async () => {
    if (step >= STEP_COUNT - 1) return;
    if (step === MICRO_MERGED_SLIDE_INDEX && parkerenStage < 4) return;
    if (step === FIRST_DAY_SLIDE_INDEX) {
      if (!firstDayReady) return;
      setStep((s) => Math.min(s + 1, STEP_COUNT - 1));
      return;
    }
    if (step === NAME_SLIDE_INDEX) {
      const name = firstName.trim();
      if (name.length < 2) return;
      if (user?.id) {
        setSaving(true);
        try { await persistPreferredDisplayName(user, name); } finally { setSaving(false); }
      } else {
        try { window.localStorage.setItem("structuro_user_name", name); } catch { /* ignore */ }
      }
      setStep((s) => s + 1);
      return;
    }
    setStep((s) => Math.min(s + 1, STEP_COUNT - 1));
  }, [step, firstName, user, firstDayReady, parkerenStage]);

  const goPrev = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (dx < -50) {
      if (step === NAME_SLIDE_INDEX && firstName.trim().length < 2) return;
      if (step === MICRO_MERGED_SLIDE_INDEX && parkerenStage < 4) return;
      if (step === FIRST_DAY_SLIDE_INDEX && !firstDayReady) return;
      void goNext();
    }
    else if (dx > 50) goPrev();
  };

  const persistFirstDayTaskAndEnergy = async () => {
    const title = firstTaskTitle.trim();
    const energy = firstDayEnergy;
    const mins = firstTaskEstimatedMinutes;
    if (!title || !energy || mins == null || mins < 1 || mins > 480) return;
    if (firstDayUseMicroSteps !== true && firstDayUseMicroSteps !== false) return;
    const microSteps: MicroStep[] =
      firstDayUseMicroSteps === true
        ? firstDayMicroTitles.map((line) => ({
            id: microStepId(),
            title: line.trim(),
            minutes: null,
            difficulty: null,
            done: false,
          }))
        : [];
    if (firstDayUseMicroSteps === true && microSteps.length === 0) return;
    const dateStr = getCalendarDateAmsterdam();
    const energyLevel = energy;
    if (user?.id) {
      const task = await addTaskToSupabase(user.id, {
        title,
        done: false,
        started: false,
        priority: 1,
        dueAt: null,
        duration: mins,
        source: "regular",
        reminders: [],
        repeat: "none",
        impact: "🌱",
        energyLevel,
        estimatedDuration: mins,
        microSteps,
        notToday: false,
      });
      await upsertCheckInToSupabase(user.id, dateStr, {
        energy_level: energyLevel,
        top3_task_ids: [task.id],
      });
    } else {
      const created = addTaskToStorage({
        title,
        done: false,
        started: false,
        priority: 1,
        dueAt: null,
        duration: mins,
        source: "regular",
        completedAt: null,
        reminders: [],
        repeat: "none",
        impact: "🌱",
        energyLevel,
        estimatedDuration: mins,
        microSteps,
        notToday: false,
      });
      saveCheckInToStorage({
        date: dateStr,
        energy_level: energyLevel,
        top3_task_ids: [created.id],
        user_id: "local",
      });
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("structuro_tasks_updated"));
    }
  };

  const finish = async () => {
    if (!firstDayReady) {
      alert(
        "Vul op de vorige stap je energie in, je eerste taak, hoeveel minuten je nodig hebt, en of je microstappen wilt (bij ja minstens één stap)."
      );
      return;
    }
    setFinishing(true);
    try {
      try {
        await persistFirstDayTaskAndEnergy();
      } catch (e) {
        console.error("Eerste taak opslaan mislukt:", e);
        alert("Je eerste taak kon niet worden opgeslagen. Probeer het opnieuw of voeg een taak toe in Taken.");
      }
      if (user?.id) {
        const { error } = await setProfileOnboardingCompleted(true);
        if (error) {
          const dbHint = error.includes("onboarding_completed")
            ? " Voer in Supabase onder SQL het bestand supabase/migration_onboarding_completed.sql uit (kolom onboarding_completed op profiles)."
            : "";
          alert(`Kon intro niet afronden: ${error}.${dbHint}`);
          setFinishing(false);
          return;
        }
      } else {
        setLocalOnboardingCompleted();
        setLocalOnboardingDoneCookieOnClient();
        clearLocalSessionFresh();
      }
      setDagstartCookieOnClient();
      if (user?.id && firstDayEnergy) {
        try {
          await updateProfileAfterDagstartComplete(user.id, firstDayEnergy);
        } catch (e) {
          console.warn("Profiel dagstart na onboarding niet gezet:", e);
        }
      }
      window.location.assign("/");
    } catch { setFinishing(false); }
  };

  if (!isLocalMode && userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 text-slate-500">
        <div className="animate-pulse text-base">Structuro laden…</div>
      </div>
    );
  }

  if (!isLocalMode && !user?.id) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-50 to-blue-50 px-6 text-center text-slate-500">
        <div className="animate-pulse text-base">Je wordt doorgestuurd naar inloggen…</div>
        <p className="text-sm text-slate-400">Geen actieve sessie. Even geduld.</p>
      </div>
    );
  }

  const nameOk = firstName.trim().length >= 2;

  const backBtn = step > 0 && (
    <button
      type="button"
      onClick={goPrev}
      className="absolute top-5 left-5 z-10 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-white/70 transition-all duration-[600ms]"
      aria-label="Vorige stap"
    >
      <ChevronLeft className="w-6 h-6" />
    </button>
  );

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50 pt-[max(0px,env(safe-area-inset-top))] pb-[max(0px,env(safe-area-inset-bottom))]">
      <div className="flex min-h-0 flex-1 flex-col touch-pan-y" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {backBtn}
          <div
            className="flex h-full min-h-0"
            style={{
              width: `${STEP_COUNT * 100}vw`,
              transform: `translateX(-${step * 100}vw)`,
              transition: `transform ${SLIDE_MS}ms ${EASE}`,
            }}
          >
            {/* ── 1 — Welkom (geanimeerde intro) ── */}
            <section data-ob-slide className="box-border h-full min-h-0 w-screen shrink-0 overflow-x-hidden overflow-y-auto no-scrollbar">
              <style>{`
                @keyframes ob-welcome-blue-in {
                  from { opacity: 0; transform: translateY(12px); }
                  to { opacity: 1; transform: translateY(0); }
                }
                .ob-welcome-blue-in {
                  animation: ob-welcome-blue-in 0.62s cubic-bezier(0.22, 1, 0.36, 1) both;
                }
                @media (prefers-reduced-motion: reduce) {
                  .ob-welcome-blue-in { animation: none !important; }
                }
              `}</style>
              <div className="flex min-h-full w-full flex-col justify-center px-6 py-8 md:px-4">
                <div className="mx-auto flex w-full max-w-[600px] min-h-0 flex-1 flex-col justify-center">
                  <div className="flex flex-col items-center text-center">
                  <img
                    src="/Logo Structuro.png"
                    alt=""
                    width={112}
                    height={112}
                    className={`mb-8 h-24 w-24 object-contain transition-all duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] sm:h-28 sm:w-28 ${
                      welcomeShowLogo ? "translate-y-0 opacity-100 scale-100" : "translate-y-2 opacity-0 scale-95"
                    }`}
                  />
                  <h1
                    className={`text-2xl font-bold text-gray-900 transition-all duration-[1000ms] ease-[cubic-bezier(0.22,1,0.36,1)] sm:text-3xl ${
                      welcomeShowTitle ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                    }`}
                  >
                    Welkom bij Structuro
                  </h1>
                  <p className="mt-6 flex min-h-[5.5rem] max-w-full flex-wrap items-baseline justify-center gap-x-2.5 gap-y-2 text-center text-base leading-[1.55] tracking-[0.01em] text-gray-700 sm:text-lg">
                    {welcomeTaglineCharCount > 0 ? (
                      <span className="inline-block text-gray-700">
                        {WELCOME_TAGLINE_TYPED.slice(0, welcomeTaglineCharCount)}
                        <span
                          className={`ml-px inline-block h-[1.05em] w-0.5 translate-y-px bg-blue-500 align-middle ${
                            welcomeTaglineCharCount < WELCOME_TAGLINE_TYPED.length ? "animate-pulse" : "opacity-0"
                          }`}
                          aria-hidden
                        />
                      </span>
                    ) : null}
                    {welcomeBlueStep >= 1 ? (
                      <span className="ob-welcome-blue-in inline-block font-semibold text-blue-600">Rust,</span>
                    ) : null}
                    {welcomeBlueStep >= 2 ? (
                      <span className="ob-welcome-blue-in inline-block font-semibold text-blue-600">focus</span>
                    ) : null}
                    {welcomeBlueStep >= 3 ? (
                      <span className="ob-welcome-blue-in inline-flex flex-wrap items-baseline justify-center">
                        <span className="text-gray-600">en</span>
                        <span className="font-semibold text-blue-600 pl-[0.45em]">structuur</span>
                      </span>
                    ) : null}
                    {welcomeTypingChars > 0 ? (
                      <span className="inline-block min-w-[1ch] text-gray-700">
                        {WELCOME_TYPING_SUFFIX.slice(0, welcomeTypingChars)}
                        <span
                          className={`ml-px inline-block h-[1.05em] w-0.5 translate-y-px bg-blue-500 align-middle ${
                            welcomeTypingChars < WELCOME_TYPING_SUFFIX.length ? "animate-pulse" : "opacity-0"
                          }`}
                          aria-hidden
                        />
                      </span>
                    ) : null}
                  </p>
                  <p
                    className={`mt-5 max-w-md text-sm leading-relaxed text-gray-500 transition-all duration-[780ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      welcomeShowSubtitle ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                    }`}
                  >
                    Even een korte rondleiding, duurt 30 seconden.
                  </p>
                  <button
                    type="button"
                    onClick={() => void goNext()}
                    className={`mt-10 w-full max-w-sm rounded-xl bg-blue-600 py-3.5 font-semibold text-white shadow-md transition-all duration-[780ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-blue-700 active:scale-[0.98] ${
                      welcomeShowCta ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
                    }`}
                  >
                    Laten zien
                  </button>
                  </div>
                </div>
              </div>
            </section>

            {/* ── 2 — Energie ── */}
            <section data-ob-slide className="box-border h-full min-h-0 w-screen shrink-0 overflow-x-hidden overflow-y-auto no-scrollbar">
              <div className="flex min-h-full w-full flex-col justify-center px-4 py-8 md:px-0">
                <div className="mx-auto flex w-full max-w-[600px] min-h-0 flex-1 flex-col justify-center">
                <div className="flex flex-col items-center text-center">
                <Sun className="w-14 h-14 text-amber-500 mb-4" strokeWidth={1.75} aria-hidden />
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Elke dag begint met één vraag</h2>
                <div className={OB_INTRO_OUTER}>
                  <p className={`${OB_INTRO_P} text-balance`}>Hoe zit je in je energie vandaag?</p>
                  <p className={`${OB_INTRO_P} text-balance mt-2`}>
                    Elke ochtend begin je hier, daarna is alles beschikbaar.
                  </p>
                </div>
                <div className="mt-8 grid grid-cols-3 gap-3 w-full max-w-md">
                  {[
                    { icon: <Moon className="w-10 h-10 text-slate-500" strokeWidth={1.5} />, label: "Laag", sub: "1 rustige taak", idx: 1 },
                    { icon: <Smile className="w-10 h-10 text-amber-500" strokeWidth={1.5} />, label: "Normaal", sub: "2 taken", idx: 2 },
                    { icon: <Zap className="w-10 h-10 text-violet-600" strokeWidth={1.75} />, label: "Hoog", sub: "3 taken", idx: 3 },
                  ].map((c) => (
                    <div
                      key={c.label}
                      className={`rounded-2xl border bg-white p-4 text-center shadow-sm cursor-default transition-all duration-[1000ms] ease-out ${
                        energyStage >= c.idx ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                      } ${
                        energyStage >= 4 && c.label === "Normaal"
                          ? "border-blue-400 ring-2 ring-blue-200 shadow-md scale-105"
                          : "border-slate-200"
                      }`}
                    >
                      <div className="flex justify-center">{c.icon}</div>
                      <p className="mt-2 font-semibold text-gray-900 text-sm">{c.label}</p>
                      <p className="text-xs text-gray-500 mt-1">{c.sub}</p>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => void goNext()} className="mt-10 w-full max-w-sm py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold shadow-md transition-all duration-[700ms]">
                  Volgende
                </button>
                </div>
                </div>
              </div>
            </section>

            {/* ── 3 — Focuspunten ── */}
            <section data-ob-slide className="box-border h-full min-h-0 w-screen shrink-0 overflow-x-hidden overflow-y-auto no-scrollbar">
              <div className="flex min-h-full w-full flex-col justify-center px-4 py-8 md:px-0">
                <div className="mx-auto flex w-full max-w-[600px] min-h-0 flex-1 flex-col justify-center">
                <div className="flex flex-col items-center text-center">
                <Check className="w-14 h-14 text-emerald-600 mb-4" strokeWidth={2} aria-hidden />
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Kies wat echt telt vandaag</h2>
                <div className={OB_INTRO_OUTER}>
                  <p className={OB_INTRO_P}>
                    Geen lange lijsten. Jij kiest maximaal 3 focuspunten, afhankelijk van je energie. Wij passen ons aan op wat werkt voor jouw brein. De rest bestaat even niet.
                  </p>
                </div>
                <ul className="mt-8 w-full max-w-md space-y-3 text-left">
                  {[
                    { n: "1", label: "Kernfocus", sub: "De basislijn voor vandaag", bg: "bg-blue-50", border: "border-blue-100", numColor: "text-blue-700", textColor: "text-blue-900", subColor: "text-blue-600", idx: 1 },
                    { n: "2", label: "Vervolgstap", sub: "Zodra de motor draait", bg: "bg-teal-50", border: "border-teal-100", numColor: "text-teal-700", textColor: "text-teal-900", subColor: "text-teal-600", idx: 2 },
                    { n: "3", label: "Bonusactie", sub: "Beschikbaar bij hoge energie", bg: "bg-violet-50", border: "border-violet-100", numColor: "text-violet-700", textColor: "text-violet-900", subColor: "text-violet-600", idx: 3 },
                  ].map((r) => (
                    <li
                      key={r.n}
                      className={`flex gap-3 rounded-xl ${r.bg} border ${r.border} px-4 py-3 cursor-default transition-all duration-[1000ms] ease-out ${
                        focuspuntenStage >= r.idx ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-6"
                      }`}
                    >
                      <span className={`font-bold ${r.numColor} w-6 pt-0.5`}>{r.n}</span>
                      <div>
                        <p className={`font-semibold ${r.textColor}`}>{r.label}</p>
                        <p className={`text-xs ${r.subColor} mt-0.5`}>{r.sub}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <button type="button" onClick={() => void goNext()} className="mt-10 w-full max-w-sm py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold shadow-md transition-all duration-[700ms]">
                  Volgende
                </button>
                </div>
                </div>
              </div>
            </section>

            {/* ── 4 — Focus modus ── */}
            <section data-ob-slide className="box-border h-full min-h-0 w-screen shrink-0 overflow-x-hidden overflow-y-auto no-scrollbar">
              <div className="flex min-h-full w-full flex-col justify-center px-4 py-8 md:px-0">
                <div className="mx-auto flex w-full max-w-[600px] min-h-0 flex-1 flex-col justify-center">
                <div className="flex flex-col items-center text-center">
                <Target className="w-14 h-14 text-blue-600 mb-4" strokeWidth={1.75} aria-hidden />
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Eén taak tegelijk</h2>
                <div className={OB_INTRO_OUTER}>
                  <p className={OB_INTRO_P}>
                    Structuro heeft een Focus modus. Geen afleiding, geen keuzes. Gewoon beginnen en stap voor stap verder.
                  </p>
                </div>

                <div className={`mt-8 w-full max-w-sm rounded-2xl overflow-hidden shadow-lg transition-all duration-[700ms] ease-out ${
                  focusModeStage >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                }`}>
                  <div className="bg-slate-800 text-white px-5 pt-4 pb-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Nu aan zet</p>
                    <p className="text-base font-bold mt-1">Boodschappenlijst maken</p>
                    <p className="text-xs text-slate-400 mt-0.5">10 min · Rustig</p>
                  </div>
                  <div className={`bg-white border border-t-0 border-slate-200 px-5 py-4 transition-all duration-[1000ms] ease-out ${
                    focusModeStage >= 2 ? "opacity-100" : "opacity-0"
                  }`}>
                    <div className={`w-full py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm text-center transition-all duration-[1000ms] ${
                      focusModeStage >= 3 ? "animate-pulse shadow-lg shadow-emerald-200" : ""
                    }`}>
                      Start focus sessie
                    </div>
                  </div>
                </div>

                <p className={`mt-5 text-xs text-blue-600 font-medium transition-all duration-[1000ms] ease-out ${
                  focusModeStage >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                }`}>
                  Zodra je begint, verdwijnt de rest. Je ziet alleen de taak, een timer en je voortgang.
                </p>

                <button type="button" onClick={() => void goNext()} className="mt-8 w-full max-w-sm py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold shadow-md transition-all duration-[700ms]">
                  Volgende
                </button>
                </div>
                </div>
              </div>
            </section>

            {/* ── 5 — Microstappen (sectie 1) + gedachten parkeren (sectie 2), één verticaal scrollbare slide */}
            <section
              data-ob-slide
              className="box-border h-full min-h-0 w-screen shrink-0 overflow-x-hidden overflow-y-auto scroll-smooth no-scrollbar"
            >
              <div className="flex min-h-full w-full flex-col px-4 py-8 pb-10 md:px-0">
                <div className="mx-auto flex w-full max-w-[600px] flex-col items-center text-center">
                  <style>{`
                    @keyframes ob-micro-row-in {
                      from { opacity: 0.7; transform: scale(0.99); }
                      to { opacity: 1; transform: scale(1); }
                    }
                    @keyframes ob-micro-done-banner {
                      from { opacity: 0; transform: translateY(8px); }
                      to { opacity: 1; transform: translateY(0); }
                    }
                    @media (prefers-reduced-motion: reduce) {
                      .ob-micro-done-banner { animation: none !important; opacity: 1 !important; transform: none !important; }
                    }
                  `}</style>

                  {/* Sectie 1: microstappen */}
                  <div className="flex w-full flex-col items-center justify-center py-6">
                    <Layers className="w-14 h-14 text-violet-600 mb-4" strokeWidth={1.75} aria-hidden />
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Groot project? Breek op.</h2>
                    <div className={OB_INTRO_OUTER}>
                      <p className={OB_INTRO_P}>
                        Deel grote dingen in microstappen. Zo breek je een grote taak op in kleine, haalbare stukken.
                      </p>
                    </div>

                    {(() => {
                      const doneCount = Math.min(microDemoStage, 3);
                      const activeRow = microDemoStage < 3 ? microDemoStage : -1;
                      return (
                        <div
                          className={`mt-8 w-full max-w-sm rounded-2xl overflow-hidden transition-[box-shadow] duration-[600ms] ease-out ${
                            microDemoStage >= 4 ? "shadow-xl shadow-emerald-100/50 ring-1 ring-emerald-100/90" : "shadow-lg"
                          }`}
                          aria-live="polite"
                        >
                          <div className="rounded-t-2xl bg-slate-800 text-white px-5 pt-4 pb-3">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Focus modus</p>
                            <p className="text-base font-bold mt-1">Kamer opruimen</p>
                            <p className="text-xs text-slate-400 mt-0.5">15 min · Normaal</p>
                          </div>

                          <div className="rounded-b-2xl bg-white border border-t-0 border-slate-200 px-5 py-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Layers className="w-3.5 h-3.5 text-violet-600" aria-hidden />
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Microstappen</p>
                            </div>
                            <ul className="space-y-0">
                              {MICRO_DEMO_STEPS.map((label, i) => {
                                const isDone = i < microDemoStage;
                                const isActive = activeRow === i;
                                return (
                                  <li
                                    key={label}
                                    className={`overflow-hidden rounded-lg transition-all duration-[720ms] ease-out motion-reduce:transition-none ${
                                      isDone ? "max-h-0 opacity-0 py-0 my-0" : "max-h-14 opacity-100 py-0.5 my-0.5"
                                    } ${isActive && !isDone ? "bg-violet-50 -mx-2 px-2 py-1.5 ring-1 ring-violet-200" : ""}`}
                                  >
                                    <div className="flex items-center gap-3">
                                      {isDone ? (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" aria-hidden />
                                      ) : isActive ? (
                                        <div className="relative shrink-0" aria-hidden>
                                          <Circle className="w-5 h-5 text-violet-500" />
                                          <ChevronRight className="absolute top-0.5 left-0.5 w-4 h-4 text-violet-500" />
                                        </div>
                                      ) : (
                                        <Circle className="w-5 h-5 text-gray-300 shrink-0" aria-hidden />
                                      )}
                                      <span
                                        className={`text-sm text-left transition-colors duration-[600ms] ${
                                          isActive ? "font-medium text-violet-900" : "text-gray-500"
                                        }`}
                                      >
                                        {label}
                                      </span>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>

                            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
                              <span className="text-xs text-gray-400 tabular-nums">
                                {doneCount} van 3 klaar
                              </span>
                              <div className="flex gap-1 shrink-0" aria-hidden>
                                {[0, 1, 2].map((j) => {
                                  const isDonePill = j < doneCount;
                                  const isCurrentPill = j === doneCount && doneCount < 3;
                                  return (
                                    <div
                                      key={j}
                                      className={`h-1.5 w-6 rounded-full transition-colors duration-[720ms] ease-out ${
                                        isDonePill
                                          ? "bg-emerald-400"
                                          : isCurrentPill
                                            ? "bg-violet-400"
                                            : "bg-gray-200"
                                      }`}
                                    />
                                  );
                                })}
                              </div>
                            </div>

                            {microDemoStage >= 4 ? (
                              <p
                                className="mt-4 text-center text-base font-medium text-slate-500"
                                style={{ animation: "ob-micro-done-banner 1.2s ease-out both" }}
                              >
                                Klaar.
                              </p>
                            ) : null}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="my-14 w-full max-w-sm border-t border-slate-200/90" aria-hidden />

                  {/* Sectie 2: parkeren (IO + scroll start animatie pas hier) */}
                  <div
                    ref={parkerenSectionElRef}
                    id="onboarding-parkeren-section"
                    className="scroll-mt-8 flex w-full flex-col items-center pb-8 sm:scroll-mt-12"
                  >
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Gedachte tussendoor?</h2>
                    <div className={OB_INTRO_OUTER}>
                      <p className={OB_INTRO_P}>
                        Komt er iets tussendoor? Parkeer het even. Zo blijf je in flow, zonder chaos en zonder je hoofdtaak te verliezen.
                      </p>
                    </div>

                    <p
                      className={`mt-6 text-sm text-gray-500 italic transition-all duration-[600ms] ease-out ${
                        parkerenStage >= 1 ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      &ldquo;Bel mama terug&rdquo;
                    </p>

                    <div className="mt-6 w-full max-w-sm rounded-2xl overflow-hidden shadow-lg">
                      <div className="bg-slate-800 text-white px-5 pt-4 pb-3">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Focus modus</p>
                        <p className="text-base font-bold mt-1">Projectplanning opstellen</p>
                      </div>
                      <div className="bg-white border border-t-0 border-slate-200 px-5 py-4">
                        <div
                          className={`bg-white rounded-xl border border-slate-200 p-4 shadow-sm transition-all duration-[700ms] ease-out ${
                            parkerenStage >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                          }`}
                        >
                          <p className="text-xs font-medium text-gray-800 mb-3">Parkeer een gedachte</p>
                          <div
                            className={`w-full px-2.5 py-2 border rounded-lg text-xs bg-gray-50 mb-3 text-left min-h-[1.75rem] transition-colors duration-[600ms] ${
                              parkerenStage >= 2 ? "border-blue-300" : "border-slate-200"
                            }`}
                          >
                            {parkerenStage >= 2 && (
                              <span className="text-gray-800">{PARKEREN_TEXT.substring(0, parkerenTypedChars)}</span>
                            )}
                            {parkerenStage >= 1 && parkerenStage < 3 && (
                              <span className="inline-block w-0.5 h-3.5 bg-blue-500 animate-pulse align-middle" />
                            )}
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-center text-gray-500">
                              Annuleer
                            </div>
                            <div
                              className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs text-center font-medium transition-all duration-[600ms] ${
                                parkerenStage >= 3
                                  ? "bg-blue-700 text-white shadow-lg shadow-blue-300 scale-110 ring-2 ring-blue-300"
                                  : "bg-blue-600 text-white"
                              }`}
                            >
                              Parkeer dit even
                            </div>
                          </div>
                        </div>

                        {parkerenStage >= 4 && (
                          <div
                            className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/95 px-4 py-2.5 flex items-center gap-2.5"
                            style={{ animation: "ob-micro-done-banner 0.5s ease-out both" }}
                          >
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden />
                            <p className="text-xs font-medium text-emerald-800">
                              Opgeslagen voor later. Focus blijft intact.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="mt-5 text-xs text-gray-500 leading-relaxed max-w-sm">
                      Later zet je geparkeerde gedachten om naar echte taken.
                    </p>

                    <button
                      type="button"
                      disabled={parkerenStage < 4}
                      onClick={() => void goNext()}
                      className="mt-10 w-full max-w-sm rounded-xl bg-blue-600 py-3.5 font-semibold text-white shadow-md transition-all duration-[700ms] hover:bg-blue-700 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
                    >
                      Volgende
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* ── 6 — Naam ── */}
            <section data-ob-slide className="box-border h-full min-h-0 w-screen shrink-0 overflow-x-hidden overflow-y-auto no-scrollbar">
              <div className="flex min-h-full w-full flex-col justify-center px-4 py-8 md:px-0">
                <div className="mx-auto flex w-full max-w-[600px] min-h-0 flex-1 flex-col justify-center">
                <div className="flex flex-col items-center text-center">
                <img src="/Logo Structuro.png" alt="" width={112} height={112} className="w-24 h-24 object-contain mb-6" />
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Hoe mogen we je aanspreken?</h2>
                <p className="mt-3 text-sm text-gray-600">Alleen je voornaam, voor een persoonlijke begroeting.</p>
                <input
                  type="text"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && nameOk && !saving) void goNext(); }}
                  placeholder="Voornaam"
                  className="mt-8 w-full max-w-sm px-4 py-3.5 rounded-xl border border-gray-200 text-center text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                />
                <button
                  type="button"
                  disabled={!nameOk || saving}
                  onClick={() => void goNext()}
                  className="mt-8 w-full max-w-sm py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-[700ms]"
                >
                  {saving ? "Opslaan…" : "Verder"}
                </button>
                </div>
                </div>
              </div>
            </section>

            {/* ── 7 — Persoonlijk welkom ── */}
            <section data-ob-slide className="box-border h-full min-h-0 w-screen shrink-0 overflow-x-hidden overflow-y-auto no-scrollbar">
              <div className="flex min-h-full w-full flex-col justify-center px-4 py-8 md:px-0">
                <div className="mx-auto flex w-full max-w-[600px] min-h-0 flex-1 flex-col justify-center">
                <div className="flex flex-col items-center text-center">
                <img src="/Logo Structuro.png" alt="" width={112} height={112} className="w-24 h-24 object-contain mb-6" />
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">Welkom, {firstName.trim() || "daar"}!</p>
                <p className="mt-4 text-base leading-relaxed text-gray-700">
                  Structuro helpt je elke dag starten met{" "}
                  <span className="font-semibold text-blue-600">rust</span>,{" "}
                  <span className="font-semibold text-blue-600">focus</span> en{" "}
                  <span className="font-semibold text-blue-600">structuur</span>, op jouw tempo en met jouw energie.
                </p>
                <button type="button" onClick={() => void goNext()} className="mt-10 w-full max-w-sm py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold shadow-md transition-all duration-[700ms]">
                  Verder
                </button>
                </div>
                </div>
              </div>
            </section>

            {/* ── 8 — Echte eerste dagstart (progressive disclosure, geen formulier-gevoel) ── */}
            <section data-ob-slide className="box-border h-full min-h-0 w-screen shrink-0 overflow-x-hidden overflow-y-auto no-scrollbar">
              <style>{`
                @keyframes ob-first-day-bridge-in {
                  from { opacity: 0; transform: translateY(8px); }
                  to { opacity: 1; transform: translateY(0); }
                }
                .ob-first-day-bridge-in {
                  animation: ob-first-day-bridge-in 300ms ease-out both;
                }
                @keyframes ob-first-day-task-in {
                  from { opacity: 0; transform: translateY(12px); }
                  to { opacity: 1; transform: translateY(0); }
                }
                .ob-first-day-task-in {
                  animation: ob-first-day-task-in 320ms ease-out both;
                }
                @keyframes ob-first-day-duration-in {
                  from { opacity: 0; transform: translateY(10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
                .ob-first-day-duration-in {
                  animation: ob-first-day-duration-in 400ms ease-out both;
                }
                @media (prefers-reduced-motion: reduce) {
                  .ob-first-day-bridge-in,
                  .ob-first-day-task-in,
                  .ob-first-day-duration-in { animation: none !important; opacity: 1 !important; transform: none !important; }
                }
              `}</style>
              <div className="flex min-h-full w-full flex-col justify-center px-5 py-8 md:px-4">
                <div className="mx-auto flex w-full max-w-[520px] min-h-0 flex-1 flex-col justify-center">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-3 text-4xl leading-none" aria-hidden>
                    {"\u{1F331}"}
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl md:text-4xl">
                    {firstDaySlideGreeting}
                    {firstName.trim() ? (
                      <>
                        , <span className="whitespace-nowrap">{firstName.trim()}</span>
                      </>
                    ) : null}
                    .
                  </h2>
                  <p className="mt-3 max-w-md text-base text-gray-500">Hoe zit je in je energie?</p>

                  <div className="mt-10 w-full max-w-md">
                    <div className="grid grid-cols-3 gap-3">
                      {([
                        {
                          key: "low" as const,
                          label: "Laag",
                          icon: <Moon className="h-10 w-10 text-slate-500" strokeWidth={1.5} aria-hidden />,
                        },
                        {
                          key: "medium" as const,
                          label: "Normaal",
                          icon: <Smile className="h-10 w-10 text-amber-500" strokeWidth={1.5} aria-hidden />,
                        },
                        {
                          key: "high" as const,
                          label: "Hoog",
                          icon: <Zap className="h-10 w-10 text-violet-600" strokeWidth={1.75} aria-hidden />,
                        },
                      ]).map((c) => (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => setFirstDayEnergy(c.key)}
                          className={`rounded-2xl px-2 py-3 text-center shadow-sm transition-all duration-300 ease-out sm:py-4 ${
                            firstDayEnergy === c.key
                              ? "scale-[1.02] bg-white shadow-md ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-50"
                              : "border border-slate-200/90 bg-white/90 hover:border-slate-300 hover:shadow-md active:scale-[0.98]"
                          }`}
                        >
                          <div className="mb-2 flex justify-center">{c.icon}</div>
                          <span className="block text-sm font-semibold text-gray-900">{c.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {firstDayEnergy ? (
                    <div className="ob-first-day-bridge-in mt-10 w-full max-w-md space-y-1 text-center">
                      <p className="text-base font-medium text-gray-900">
                        Goed. Laten we je eerste taak instellen.
                      </p>
                      <p className="text-sm text-gray-400">Wat wil je vandaag als eerste doen?</p>
                    </div>
                  ) : null}

                  {firstDayTaskPhaseVisible ? (
                    <div
                      ref={firstDayTaskBlockRef}
                      className="ob-first-day-task-in mt-8 w-full max-w-md space-y-4"
                    >
                      <div className="relative">
                        <input
                          ref={firstTaskInputRef}
                          type="text"
                          value={firstTaskTitle}
                          onChange={(e) => setFirstTaskTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key !== "Enter") return;
                            if (firstDayReady) void goNext();
                            else if (
                              firstDayEnergy &&
                              firstTaskTitle.trim().length >= 2
                            ) {
                              firstTaskDurationInputRef.current?.focus();
                            }
                          }}
                          placeholder="Bijv. mail beantwoorden, even bellen met..."
                          autoComplete="off"
                          className="w-full rounded-2xl border-0 bg-white px-6 py-4 text-center text-lg text-gray-900 shadow-md outline-none ring-1 ring-slate-200/90 transition-all placeholder:text-gray-400 focus:shadow-lg focus:ring-2 focus:ring-blue-400/40"
                        />
                        {firstTaskTitle.trim().length > 0 ? (
                          <span
                            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-emerald-600/90 transition-opacity duration-300"
                            aria-hidden
                          >
                            {'\u2713'}
                          </span>
                        ) : null}
                      </div>

                      {firstDayDurationVisible ? (
                        <div
                          ref={firstDayDurationBlockRef}
                          className="ob-first-day-duration-in space-y-3 pt-2 text-center"
                        >
                          <p className="text-base font-medium text-gray-700">
                            Hoeveel minuten denk je ongeveer nodig te hebben?
                          </p>
                          <div className="relative">
                            <input
                              ref={firstTaskDurationInputRef}
                              type="number"
                              min={1}
                              max={480}
                              inputMode="numeric"
                              value={firstTaskEstimatedMinutes ?? ""}
                              onChange={(e) => {
                                const raw = e.target.value;
                                if (raw === "") {
                                  setFirstTaskEstimatedMinutes(null);
                                  return;
                                }
                                const n = parseInt(raw, 10);
                                if (!Number.isFinite(n)) return;
                                setFirstTaskEstimatedMinutes(n);
                              }}
                              onBlur={() => {
                                setFirstTaskEstimatedMinutes((m) => {
                                  if (m == null) return null;
                                  return Math.min(480, Math.max(1, m));
                                });
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && firstDayReady) void goNext();
                              }}
                              placeholder="Bijv. 15 of 45"
                              aria-label="Geschatte duur in minuten"
                              autoComplete="off"
                              className="w-full rounded-2xl border-0 bg-white px-6 py-4 text-center text-lg text-gray-900 shadow-md outline-none ring-1 ring-slate-200/90 transition-all placeholder:text-gray-400 focus:shadow-lg focus:ring-2 focus:ring-blue-400/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                            {firstDayMinutesOk ? (
                              <span
                                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-emerald-600/90 transition-opacity duration-300"
                                aria-hidden
                              >
                                {'\u2713'}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      {firstDayDurationVisible && firstDayMinutesOk ? (
                        <div className="animate-fade-in mt-8 w-full space-y-4 text-center">
                          <p className="text-base font-medium text-gray-800">
                            Wil je microstappen toevoegen?
                          </p>
                          <p className="text-sm text-gray-500">
                            Kleine substappen kunnen helpen om te starten.
                          </p>
                          <div className="flex justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setFirstDayUseMicroSteps(true);
                              }}
                              className={`min-w-[5.5rem] rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                                firstDayUseMicroSteps === true
                                  ? "border-blue-600 bg-blue-600 text-white"
                                  : "border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
                              }`}
                            >
                              Ja
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFirstDayUseMicroSteps(false);
                                setFirstDayMicroTitles([]);
                                setFirstDayMicroInput("");
                              }}
                              className={`min-w-[5.5rem] rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                                firstDayUseMicroSteps === false
                                  ? "border-blue-600 bg-blue-600 text-white"
                                  : "border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
                              }`}
                            >
                              Nee
                            </button>
                          </div>

                          {firstDayUseMicroSteps === true ? (
                            <div className="animate-fade-in mt-2 rounded-2xl border border-violet-200 bg-violet-50/50 p-4 text-left">
                              <p className="mb-3 text-center text-xs font-medium text-violet-900">
                                Je eerste microstappen
                              </p>
                              {firstDayMicroTitles.length > 0 ? (
                                <ul className="mb-3 space-y-2">
                                  {firstDayMicroTitles.map((line, idx) => (
                                    <li
                                      key={`${idx}-${line.slice(0, 24)}`}
                                      className="flex items-start gap-2 rounded-xl bg-white/90 px-3 py-2 text-sm text-gray-800 shadow-sm"
                                    >
                                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[11px] font-bold text-violet-700">
                                        {idx + 1}
                                      </span>
                                      <span className="min-w-0 flex-1 leading-snug">{line}</span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setFirstDayMicroTitles((prev) =>
                                            prev.filter((_, i) => i !== idx)
                                          )
                                        }
                                        className="shrink-0 rounded-lg px-1.5 py-0.5 text-xs text-gray-400 hover:bg-red-50 hover:text-red-600"
                                        aria-label="Stap verwijderen"
                                      >
                                        ×
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="mb-2 text-center text-xs text-gray-600">
                                  Voeg minstens één stap toe.
                                </p>
                              )}
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                                <input
                                  type="text"
                                  value={firstDayMicroInput}
                                  onChange={(e) => setFirstDayMicroInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key !== "Enter") return;
                                    e.preventDefault();
                                    const t = firstDayMicroInput.trim();
                                    if (!t) return;
                                    setFirstDayMicroTitles((prev) => [...prev, t]);
                                    setFirstDayMicroInput("");
                                  }}
                                  placeholder="Bijv. bestand openen…"
                                  className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const t = firstDayMicroInput.trim();
                                    if (!t) return;
                                    setFirstDayMicroTitles((prev) => [...prev, t]);
                                    setFirstDayMicroInput("");
                                  }}
                                  className="shrink-0 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
                                >
                                  Toevoegen
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {firstDayTaskPhaseVisible && firstDayReady ? (
                    <button
                      ref={firstDayBeginCtaRef}
                      type="button"
                      onClick={() => void goNext()}
                      className="ob-first-day-task-in mt-10 w-full max-w-md rounded-xl bg-blue-600 py-4 text-base font-semibold text-white shadow-md transition-all hover:bg-blue-700 active:scale-[0.99]"
                    >
                      Begin mijn dag →
                    </button>
                  ) : null}
                </div>
                </div>
              </div>
            </section>

            {/* ── 9 — Dagafsluiting (uitleg) ── */}
            <section
              data-ob-slide
              className="box-border h-full min-h-0 w-screen shrink-0 overflow-x-hidden overflow-y-auto no-scrollbar"
            >
              <div className="flex min-h-full w-full flex-col justify-center bg-gradient-to-b from-slate-50/80 via-white to-slate-50/60 px-4 py-8 md:px-6 md:py-10">
                <div className="mx-auto flex w-full max-w-[520px] min-h-0 flex-1 flex-col justify-center">
                  <div className="flex flex-col items-center space-y-6 text-center">
                    <div className="text-5xl leading-none" aria-hidden>
                      {"\u{1F319}"}
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                        Sluit je dag rustig af
                      </h2>
                      <p className="text-base text-gray-500">Elke dag eindigt met drie vragen.</p>
                    </div>

                    <div className="flex w-full flex-col gap-3 text-left">
                      {(
                        [
                          {
                            emoji: "\u2705",
                            title: "Wat is af vandaag?",
                            sub: "Erken wat je hebt gedaan",
                          },
                          {
                            emoji: "\u{1F4C5}",
                            title: "Wat wil je nog niet vergeten?",
                            sub: "Komt morgen als suggestie terug",
                          },
                          {
                            emoji: "\u2B50",
                            title: "Hoe voldaan ben je na vandaag?",
                            sub: "Geen oordeel, gewoon voelen",
                          },
                        ] as const
                      ).map((row) => (
                        <div
                          key={row.title}
                          className="flex items-center gap-4 rounded-2xl border border-slate-200/90 bg-white px-5 py-4 shadow-sm"
                        >
                          <span className="shrink-0 text-2xl leading-none" aria-hidden>
                            {row.emoji}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{row.title}</p>
                            <p className="mt-0.5 text-xs text-gray-500">{row.sub}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="w-full rounded-2xl bg-blue-50 px-5 py-4">
                      <p className="text-center text-sm text-blue-700">
                        Je vindt de dagafsluiting altijd via &quot;Afsluiten&quot; onderaan.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void goNext()}
                      className="w-full max-w-md rounded-xl bg-blue-600 py-3.5 text-base font-semibold text-white shadow-md transition-all hover:bg-blue-700 active:scale-[0.98]"
                    >
                      Volgende
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* ── 10 — Klaar (aankomst-moment, geen herhaling van uitleg) ── */}
            <section
              data-ob-slide
              className="box-border h-full min-h-0 w-screen shrink-0 overflow-x-hidden overflow-y-auto no-scrollbar"
            >
              <div className="flex min-h-full w-full flex-col justify-center bg-gradient-to-b from-slate-50/80 via-white to-slate-50/60 px-4 py-8 md:px-6 md:py-10">
                <div className="mx-auto flex w-full max-w-[520px] min-h-0 flex-1 flex-col justify-center">
                  <div className="flex flex-col items-center space-y-8 text-center">
                  <div
                    className={`text-6xl leading-none transition-all duration-500 ease-out motion-reduce:transition-none ${
                      readySlidePhase >= 1 ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                    }`}
                    aria-hidden
                  >
                    {"\u2728"}
                  </div>

                  <div
                    className={`space-y-3 transition-all duration-500 ease-out motion-reduce:transition-none ${
                      readySlidePhase >= 2 ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                    }`}
                  >
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Je bent klaar.</h2>
                    <p className="text-base leading-relaxed text-gray-500">
                      Structuro staat klaar. Elke dag begin je rustig, op jouw energie en jouw tempo.
                    </p>
                  </div>

                  <div className="flex w-full flex-col gap-3 text-left">
                    {(
                      [
                        {
                          emoji: "\u{1F305}",
                          title: "Dagstart",
                          sub: "Hoe zit je in je energie?",
                        },
                        {
                          emoji: "\u{1F3AF}",
                          title: "Focus modus",
                          sub: "Één stap tegelijk, geen afleiding",
                        },
                        {
                          emoji: "\u{1F319}",
                          title: "Dagafsluiting",
                          sub: "Morgen begint opnieuw",
                        },
                      ] as const
                    ).map((row, idx) => (
                      <div
                        key={row.title}
                        className={`flex items-center gap-4 rounded-2xl border border-slate-200/90 bg-white px-5 py-4 shadow-sm transition-all duration-500 ease-out motion-reduce:transition-none ${
                          readySlidePhase >= 3 + idx ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                        }`}
                      >
                        <span className="text-2xl leading-none shrink-0" aria-hidden>
                          {row.emoji}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{row.title}</p>
                          <p className="mt-0.5 text-xs text-gray-500">{row.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    className={`w-full rounded-2xl border border-green-200/80 bg-green-50 px-6 py-4 text-center transition-all duration-500 ease-out motion-reduce:transition-none sm:text-left ${
                      readySlidePhase >= 6 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                    }`}
                  >
                    <p className="text-sm font-medium leading-relaxed text-green-800">
                      Geen druk, geen vergelijking, geen race. Jij bepaalt je ritme.
                    </p>
                  </div>

                  <div
                    className={`flex w-full flex-col gap-3 transition-all duration-500 motion-reduce:transition-none ${
                      readySlidePhase >= 7 ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
                    }`}
                  >
                    <button
                      type="button"
                      disabled={finishing || readySlidePhase < 7}
                      onClick={() => void finish()}
                      className="w-full rounded-xl bg-green-600 py-4 text-base font-semibold text-white shadow-md transition-all duration-500 hover:bg-green-700 active:scale-[0.99] disabled:opacity-50 motion-reduce:transition-none"
                    >
                      {finishing ? "Bezig…" : "Let's do it the Structuro way →"}
                    </button>
                    <button
                      type="button"
                      disabled={finishing || readySlidePhase < 7}
                      onClick={() => {
                        if (finishing) return;
                        setStep(0);
                      }}
                      className="w-full rounded-xl border border-slate-200/90 bg-white py-3.5 text-base font-semibold text-gray-700 shadow-sm transition-all duration-500 hover:bg-slate-50 active:scale-[0.99] disabled:opacity-50 motion-reduce:transition-none"
                    >
                      Instructies herhalen
                    </button>
                  </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}