import type { Locale } from "@/lib/i18n/types";
import type { LpCampaign, LpResolvedVariant } from "@/lib/tiktok/lpConfig";

const EN_CAMPAIGN_COPY: Partial<
  Record<
    LpCampaign["id"],
    Pick<
      LpCampaign,
      "headline" | "subline" | "cta" | "ctaLabel" | "trust" | "explainer" | "learnMore"
    >
  >
> = {
  welkom: {
    headline: "You saw something that clicked. That's why you're here.",
    subline:
      "Not random, and not laziness. Your brain starts differently. Structuro helps you begin calmly, one step at a time.",
    cta: "Try it for free",
    trust: "No commitment. You set the pace.",
  },
  herkende: {
    headline: "You recognized yourself. That's why you're here.",
    subline:
      "Not random, and not laziness. Your brain starts differently. Structuro helps you begin calmly.",
    cta: "Try it for free",
    ctaLabel: "Try it for free",
    trust: "No commitment. You set the pace.",
    explainer: {
      title: "What is Structuro?",
      points: [
        "A calm morning start for ADHD brains.",
        "Pick your energy. Structuro sets 1 to 3 tasks.",
        "No overwhelming lists. Just a small place to begin.",
      ],
    },
    learnMore: {
      label: "Learn more about Structuro",
      href: "https://www.structuro.eu",
    },
  },
  staren: {
    headline: "9:47. You've been staring at your tasks for 40 minutes. Nothing done.",
    subline: "Not laziness. Your brain starts differently.",
    cta: "Try it for free",
    trust: "No commitment. You set the pace.",
  },
  nietlui: {
    headline: "You're not lazy. Your brain starts differently.",
    subline: "Structuro is built for how an ADHD brain actually begins.",
    cta: "Try it for free",
    trust: "No commitment. You set the pace.",
  },
  cyclus: {
    headline: "Week 3 of your cycle? Everything feels 10× heavier.",
    subline: "Your cycle shapes your focus. Structuro adapts your day.",
    cta: "Try it for free",
    trust: "No commitment. You set the pace.",
  },
  geenlijsten: {
    headline: "Another to-do list you never open? You don't need one.",
    subline: "An energy check. Then up to 3 tasks. No guilt.",
    cta: "Try it for free",
    trust: "No commitment. You set the pace.",
  },
  weten: {
    headline: "You know exactly what to do. And still don't start.",
    subline: "That's your brain. Not you. Structuro bridges that gap.",
    cta: "Try it for free",
    trust: "No commitment. You set the pace.",
  },
};

export function localizeLpCampaign(campaign: LpCampaign, locale: Locale): LpCampaign {
  if (locale !== "en") return campaign;
  const en = EN_CAMPAIGN_COPY[campaign.id];
  if (!en) return campaign;
  return { ...campaign, ...en };
}

export function localizeLpVariant(
  variant: LpResolvedVariant,
  locale: Locale
): LpResolvedVariant {
  if (locale !== "en") return variant;
  return {
    ...variant,
    campaign: localizeLpCampaign(variant.campaign, locale),
  };
}

export const LP_RITUAL_STEPS_EN = [
  { title: "Pick your energy", desc: "One tap: low, medium, or high." },
  { title: "Get 1 to 3 tasks", desc: "Matched to your day. Never more." },
  { title: "Do them. Done.", desc: "No lists. No guilt." },
] as const;

export type LpHeroUiCopy = {
  eyebrow: string;
  eyebrowStory: string;
  demoHint: string;
  demoEnergyLabel: string;
  energyLow: string;
  energyMedium: string;
  energyHigh: string;
  layoutCSubline: string;
  layoutCBullet: string;
  layoutDEyebrow: string;
  layoutEStuck: string;
  todayTasks: (count: number) => string;
  taskLabel: string;
  tasksLabel: string;
  demoTasks: Record<"low" | "medium" | "high", string[]>;
};

const LP_HERO_UI: Record<Locale, LpHeroUiCopy> = {
  nl: {
    eyebrow: "Voor ADHD-breinen",
    eyebrowStory: "Voor ADHD-breinen die niet beginnen",
    demoHint: "Tik hieronder je energie. Zo ziet Structuro morgenochtend eruit.",
    demoEnergyLabel: "Hoeveel energie heb je?",
    energyLow: "Laag",
    energyMedium: "Midden",
    energyHigh: "Hoog",
    layoutCSubline: "Voor breinen die vastlopen op starten",
    layoutCBullet:
      "Eén keer 's ochtends je energie kiezen. Structuro zet 1, 2 of 3 taken klaar. Meer niet.",
    layoutDEyebrow: "Voor het ADHD-brein",
    layoutEStuck: "Voor ADHD-breinen die vastlopen",
    todayTasks: (count) => `Vandaag → ${count} ${count === 1 ? "taak" : "taken"}`,
    taskLabel: "taak",
    tasksLabel: "taken",
    demoTasks: {
      low: ["Drink een glas water"],
      medium: ["Mail terugsturen naar Sanne", "10 min opruimen"],
      high: ["Offerte afmaken", "Sportschool", "Bel de tandarts"],
    },
  },
  en: {
    eyebrow: "For ADHD brains",
    eyebrowStory: "For ADHD brains that can't start",
    demoHint: "Tap your energy below. This is what tomorrow morning looks like.",
    demoEnergyLabel: "How much energy do you have?",
    energyLow: "Low",
    energyMedium: "Medium",
    energyHigh: "High",
    layoutCSubline: "For brains stuck at the start",
    layoutCBullet:
      "Pick your energy once each morning. Structuro sets 1, 2, or 3 tasks. Nothing more.",
    layoutDEyebrow: "For the ADHD brain",
    layoutEStuck: "For ADHD brains that get stuck",
    todayTasks: (count) => `Today → ${count} ${count === 1 ? "task" : "tasks"}`,
    taskLabel: "task",
    tasksLabel: "tasks",
    demoTasks: {
      low: ["Drink a glass of water"],
      medium: ["Reply to Sam's email", "10 min tidy up"],
      high: ["Finish the quote", "Gym", "Call the dentist"],
    },
  },
};

export function getLpHeroUiCopy(locale: Locale): LpHeroUiCopy {
  return LP_HERO_UI[locale] ?? LP_HERO_UI.nl;
}
