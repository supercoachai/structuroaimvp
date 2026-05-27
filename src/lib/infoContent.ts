import type { Locale } from "@/lib/i18n";

export type InfoContentItem = {
  title: string;
  explanation: string;
  source?: string;
};

export type InfoContentId =
  | "energie"
  | "max3taken"
  | "timer"
  | "microstappen"
  | "dagafsluiting"
  | "legedag"
  | "cyclus";

const NL: Record<InfoContentId, InfoContentItem> = {
  energie: {
    title: "Waarom begint Structuro met energie?",
    explanation:
      "Dopamineproductie bij ADHD fluctueert sterker per dagdeel dan bij neurotypisch brein. Je energieniveau bepaalt hoeveel executieve functie beschikbaar is, niet je wil of discipline.",
    source: "Barkley, R.A. (2012). Executive Functions.",
  },
  max3taken: {
    title: "Waarom maximaal 3 taken?",
    explanation:
      "Het ADHD-werkgeheugen heeft gemiddeld 30% minder capaciteit. Meer dan 3 actieve taken verhoogt cognitieve overbelasting exponentieel en triggert uitstelgedrag, ook als de intentie er wel is.",
    source: "Sweller, J. (1988). Cognitive Load Theory.",
  },
  timer: {
    title: "Waarom een timer?",
    explanation:
      "Tijdblindheid is een kernsymptoom van ADHD. Een extern tijdskader compenseert het deficiënte interne tijdsgevoel. Afgebakende werksessies verhogen ook dopamineafgifte via het voltooiingsgevoel aan het einde.",
    source: "Barkley, R.A. (2011). Time blindness in ADHD.",
  },
  microstappen: {
    title: "Waarom microstappen?",
    explanation:
      "Voelt de taak groot? Hak 'm op in mini-acties. Kleinere stappen verlagen de drempel om te starten en maken voortgang zichtbaar, wat helpt om door te zetten.",
    source: "Barkley, R.A. (2012). Executive Functions.",
  },
  dagafsluiting: {
    title: "Waarom de dag bewust afsluiten?",
    explanation:
      "Onafgemaakte taken blijven circuleren in het werkgeheugen en verhogen cortisol, het Zeigarnik-effect. Een bewuste afsluiting sluit die mentale loop en geeft echte rust, in plaats van schijnrust.",
    source: "Zeigarnik, B. (1927). Über das Behalten.",
  },
  legedag: {
    title: "Waarom begint elke dag opnieuw?",
    explanation:
      "Cumulatieve takenlijsten activeren het dreigingssysteem bij ADHD, wat vermijding versterkt. Het fresh start effect toont dat nieuwe cycli motivatie en zelfeffectiviteit significant verhogen.",
    source: "Dai et al. (2014). The Fresh Start Effect.",
  },
  cyclus: {
    title: "Waarom houdt Structuro je cyclus bij?",
    explanation:
      "Oestrogeen werkt als dopamine-agonist: hogere oestrogeenspiegels betekenen betere dopaminewerking en minder ADHD-symptomen. Dat wisselt per fase, en dat verklaart waarom sommige dagen veel zwaarder voelen dan andere.",
    source: "Rucklidge & Tannock (2001). Psychiatric aspects of ADHD in women.",
  },
};

const EN: Record<InfoContentId, InfoContentItem> = {
  energie: {
    title: "Why does Structuro start with energy?",
    explanation:
      "In ADHD, dopamine production fluctuates more across the day than in neurotypical brains. Your energy level shapes how much executive function you have available, not your willpower or discipline.",
    source: "Barkley, R.A. (2012). Executive Functions.",
  },
  max3taken: {
    title: "Why a maximum of 3 tasks?",
    explanation:
      "Working memory in ADHD is often about 30% smaller. More than 3 active tasks increases cognitive overload exponentially and triggers procrastination, even when the intention is there.",
    source: "Sweller, J. (1988). Cognitive Load Theory.",
  },
  timer: {
    title: "Why a timer?",
    explanation:
      "Time blindness is a core ADHD symptom. An external time frame compensates for a weaker internal sense of time. Bounded work sessions also boost dopamine through the completion feeling at the end.",
    source: "Barkley, R.A. (2011). Time blindness in ADHD.",
  },
  microstappen: {
    title: "Why micro steps?",
    explanation:
      "Does the task feel big? Split it into mini actions. Smaller steps lower the barrier to start and make progress visible, which helps you keep going.",
    source: "Barkley, R.A. (2012). Executive Functions.",
  },
  dagafsluiting: {
    title: "Why close the day consciously?",
    explanation:
      "Unfinished tasks keep looping in working memory and raise cortisol, the Zeigarnik effect. A deliberate shutdown closes that mental loop and gives real rest instead of pretend rest.",
    source: "Zeigarnik, B. (1927). Über das Behalten.",
  },
  legedag: {
    title: "Why does each day start fresh?",
    explanation:
      "Ever-growing task lists activate the threat system in ADHD, which strengthens avoidance. The fresh start effect shows that new cycles significantly increase motivation and self-efficacy.",
    source: "Dai et al. (2014). The Fresh Start Effect.",
  },
  cyclus: {
    title: "Why does Structuro track your cycle?",
    explanation:
      "Estrogen acts as a dopamine agonist: higher estrogen often means better dopamine function and fewer ADHD symptoms. That shifts by phase, which helps explain why some days feel much heavier than others.",
    source: "Rucklidge & Tannock (2001). Psychiatric aspects of ADHD in women.",
  },
};

export function getInfoContent(id: InfoContentId, locale: Locale): InfoContentItem {
  const bundle = locale === "en" ? EN : NL;
  return bundle[id];
}
