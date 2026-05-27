import { getCalendarDateAmsterdam } from "@/lib/dagstartCookie";

export const DAGSTART_STEP1_QUOTES_NL = [
  "Kleine helderheid is ook helderheid.",
  "Één stap is al beweging.",
  "Je hoeft niet alles te doen. Alleen dit.",
  "Begin klein. Dat is groot genoeg.",
  "Vandaag opnieuw. Dat is het plan.",
] as const;

export const DAGSTART_STEP1_QUOTES_EN = [
  "Small clarity is still clarity.",
  "One step is already movement.",
  "You do not have to do everything. Just this.",
  "Start small. That is enough.",
  "Today again. That is the plan.",
] as const;

function dateSeed(now: Date): number {
  const key = getCalendarDateAmsterdam(now);
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function getDagstartStep1Quote(locale: string, now: Date = new Date()): string {
  const quotes = locale === "en" ? DAGSTART_STEP1_QUOTES_EN : DAGSTART_STEP1_QUOTES_NL;
  return quotes[dateSeed(now) % quotes.length] ?? quotes[0];
}
