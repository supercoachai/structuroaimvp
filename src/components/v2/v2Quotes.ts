"use client";

import { isV2MutedToday, patchV2Settings, readV2Settings } from "./v2Settings";
import { todayYmd } from "./v2Tasks";

/** Rustige, warme zinnen. Geen hustle, geen em-dashes, geen klinische labels. */
export const V2_QUOTES: readonly string[] = [
  "Je hoeft vandaag niet alles te zijn. Eén ding is genoeg.",
  "Rust is ook voortgang. Neem de ruimte die je nodig hebt.",
  "Kleine stappen tellen mee. Je bent al verder dan je denkt.",
  "Het is oké om langzaam te gaan. Jouw tempo is het juiste tempo.",
  "Vandaag hoef je niets te bewijzen. Alleen te zijn.",
  "Je brein werkt anders, en dat is geen fout.",
  "Eén ding tegelijk. De rest wacht geduldig.",
  "Je mag beginnen zonder het perfecte plan.",
  "Pauze is geen opgeven. Het is onderhoud.",
  "Wat je vandaag doet, hoeft niet morgen te zijn.",
  "Je bent niet achter. Je bent op jouw pad.",
  "Soms is het beste wat je kunt doen: even niets.",
  "Je hebt al zoveel gedragen vandaag. Dat telt.",
  "Het hoeft niet mooi. Het hoeft alleen maar te gebeuren.",
  "Je mag iets laten vallen. De wereld draait door.",
  "Vandaag is een nieuwe pagina. Geen schuld van gisteren.",
  "Je best is genoeg. Ook als het er anders uitziet dan gisteren.",
  "Eén ademteug, één stap. Dat is al winst.",
];

function quoteIndexForDay(ymd: string): number {
  const hash = ymd.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return hash % V2_QUOTES.length;
}

export function getV2QuoteForToday(now = new Date()): string {
  const ymd = todayYmd(now);
  return V2_QUOTES[quoteIndexForDay(ymd)] ?? V2_QUOTES[0];
}

export function isV2QuoteEnabled(): boolean {
  return readV2Settings().quoteEnabled;
}

export function shouldShowV2QuoteOnHome(now = new Date()): boolean {
  if (typeof window === "undefined") return false;
  if (!isV2QuoteEnabled()) return false;
  if (isV2MutedToday()) return false;
  const today = todayYmd(now);
  const { quoteDismissedOn, quoteShownOn } = readV2Settings();
  if (quoteDismissedOn === today || quoteShownOn === today) return false;
  return true;
}

export function markV2QuoteShown(now = new Date()): void {
  patchV2Settings({ quoteShownOn: todayYmd(now) });
}

export function dismissV2QuoteToday(now = new Date()): void {
  patchV2Settings({ quoteDismissedOn: todayYmd(now) });
}

/** Voor ochtendnotificatie: quote vervangt body als opt-in aan staat. */
export function getV2MorningNotificationBody(now = new Date()): string {
  if (isV2QuoteEnabled()) return getV2QuoteForToday(now);
  return "Als je wilt: je dagstart staat klaar. Geen haast.";
}
