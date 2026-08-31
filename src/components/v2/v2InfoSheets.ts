import type { V2InfoSheetRow } from "./V2InfoSheet";

export type V2InfoSheetKey =
  | "dump"
  | "todo"
  | "snooze"
  | "focus"
  | "cycleOptIn"
  | "shutdown";

export type V2InfoSheetCopy = {
  eyebrow: string;
  title: string;
  openAria: string;
  closeAria: string;
  gotIt: string;
  rows: V2InfoSheetRow[];
};

/** Canonieke copy voor alle (i) bottom-sheets buiten de fase-specifieke cyclus-sheet. */
export const V2_INFO_SHEETS: Record<V2InfoSheetKey, V2InfoSheetCopy> = {
  dump: {
    eyebrow: "Extern geheugen",
    title: "Dump",
    openAria: "Uitleg over extern geheugen",
    closeAria: "Uitleg sluiten",
    gotIt: "Begrepen",
    rows: [
      {
        key: "meaning",
        icon: "brain",
        title: "Wat dit is",
        body: "Je hoofd hoeft niet alles te onthouden. Dump losse gedachten hier, zonder meteen te ordenen.",
      },
      {
        key: "why",
        icon: "why",
        title: "Waarom dit uitmaakt",
        body: "Losse gedachten in je hoofd kosten energie, ook als je ze negeert. Kwijtraken geeft ruimte.",
      },
      {
        key: "plan",
        icon: "plan",
        title: "Hoe het werkt",
        body: "Typ of spreek in zoveel je wilt (max. 15). Later maak je er een taak van, of je verwijdert het.",
      },
      {
        key: "private",
        icon: "private",
        title: "Privé",
        body: "Dit blijft op dit apparaat, tenzij jij later iets exporteert.",
      },
    ],
  },
  todo: {
    eyebrow: "Je lijst",
    title: "Taken",
    openAria: "Uitleg over je takenlijst",
    closeAria: "Uitleg sluiten",
    gotIt: "Begrepen",
    rows: [
      {
        key: "meaning",
        icon: "plan",
        title: "Wat dit is",
        body: "Eén lijst voor wat je wilt doen. Geen mappen, geen chaos. Alles staat hier, zodat je hoofd het niet hoeft vast te houden.",
      },
      {
        key: "why",
        icon: "why",
        title: "Waarom dit uitmaakt",
        body: "Wat buiten je hoofd staat, schreeuwt minder. Dan kun je zien wat er is en kiezen wat nu past, in plaats van alles tegelijk te herinneren.",
      },
      {
        key: "plan",
        icon: "meaning",
        title: "Wat je kunt doen",
        body: "Voeg toe, vink af, of zet iets tijdelijk op pauze. Rustende taken maak je weer actief in de lijst eronder. Open een taak om hem in kleine stappen te splitsen, zelf of met een voorstel.",
      },
      {
        key: "private",
        icon: "private",
        title: "Geen druk",
        body: "Open laten staan mag. Er is geen score, streak of oordeel. Alleen jouw lijst, in jouw tempo.",
      },
    ],
  },
  snooze: {
    eyebrow: "Pauzeren",
    title: "Snoozen",
    openAria: "Uitleg over snoozen",
    closeAria: "Uitleg sluiten",
    gotIt: "Begrepen",
    rows: [
      {
        key: "meaning",
        icon: "pause",
        title: "Wat dit betekent",
        body: "Snoozen is geen opgeven. Je zet iets tijdelijk op pauze zodat je lijst niet schreeuwt.",
      },
      {
        key: "why",
        icon: "why",
        title: "Waarom dit uitmaakt",
        body: "Niet alles hoeft nu. Pauzeren houdt je lijst eerlijk: wat wacht, mag wachten. Zo blijft er ruimte voor wat wél kan.",
      },
      {
        key: "plan",
        icon: "plan",
        title: "Wanneer gebruiken",
        body: "Als je ergens anders bent, of nu geen ruimte hebt. Onder je lijst staan rustende taken. Tik Weer actief als je verder wilt.",
      },
      {
        key: "private",
        icon: "private",
        title: "Geen score",
        body: "Er is geen straf of streak. Alleen een rustigere lijst tot je weer verder gaat.",
      },
    ],
  },
  focus: {
    eyebrow: "Focus",
    title: "Tijd kiezen",
    openAria: "Uitleg over focusduur",
    closeAria: "Uitleg sluiten",
    gotIt: "Begrepen",
    rows: [
      {
        key: "meaning",
        icon: "clock",
        title: "Zachte start, geen deadline",
        body: "De inschatting (ongeveer 5, 15 of 25 min) is een zachte start. Via Zelf kiezen kun je ook een eigen aantal minuten zetten. Geen deadline en geen straf als je eerder stopt of langer doorgaat.",
      },
      {
        key: "why",
        icon: "why",
        title: "Waarom dit uitmaakt",
        body: "Een zachte tijdrand helpt je hoofd om te starten zonder perfecte minuten te raden. Je weet ongeveer hoe lang, en mag altijd bijsturen.",
      },
      {
        key: "plan",
        icon: "plan",
        title: "Hoe Structuro helpt",
        body: "Eén ding tegelijk. Start met de inschatting, of kies zelf. Tijd bijplussen met ‘Iets langer’ mag tijdens focus.",
      },
      {
        key: "private",
        icon: "private",
        title: "Zacht afronden",
        body: "Stoppen mag altijd. Wat je deed telt, ook als de timer niet ‘af’ is.",
      },
    ],
  },
  cycleOptIn: {
    eyebrow: "Cyclus",
    title: "Optionele tracking",
    openAria: "Uitleg over cyclus-tracking",
    closeAria: "Uitleg sluiten",
    gotIt: "Begrepen",
    rows: [
      {
        key: "meaning",
        icon: "meaning",
        title: "Wat dit doet",
        body: "Structuro toont je fase als inzicht naast je energie. Alleen als jij het aanzet. Geen sturing van voorstellen.",
      },
      {
        key: "why",
        icon: "why",
        title: "Waarom dit uitmaakt",
        body: "Dezelfde taak kan in je lage dagen zwaarder voelen. Ken je je fase, dan begrijp je sneller waarom. Structuro toont die context; jij blijft kiezen.",
      },
      {
        key: "plan",
        icon: "plan",
        title: "Altijd aanpasbaar",
        body: "Je kunt lengte, startdatum en opt-in later in Instellingen wijzigen of uitzetten.",
      },
      {
        key: "private",
        icon: "private",
        title: "Privé",
        body: "Cyclusgegevens blijven lokaal op dit apparaat, tenzij jij ze deelt.",
      },
    ],
  },
  shutdown: {
    eyebrow: "Dagafsluiting",
    title: "De dag dicht",
    openAria: "Uitleg over dagafsluiting",
    closeAria: "Uitleg sluiten",
    gotIt: "Begrepen",
    rows: [
      {
        key: "meaning",
        icon: "meaning",
        title: "Wat dit is",
        body: "Een kort ritueel om te zien wat af is, zonder score of oordeel. Ook een rustige dag telt.",
      },
      {
        key: "why",
        icon: "why",
        title: "Waarom dit uitmaakt",
        body: "Open dagen blijven in je hoofd hangen. Dichtzetten helpt de lus te sluiten, zodat je hoofd leger kan rusten en morgen frisser begint. Geen score, alleen afronden.",
      },
      {
        key: "plan",
        icon: "plan",
        title: "Hoe het werkt",
        body: "Eerst wat je deed, dan kijken hoe je erbij zit, en optioneel iets loslaten in je dump.",
      },
      {
        key: "private",
        icon: "private",
        title: "Geen druk",
        body: "Overslaan mag. Niets is mislukt als je stopt of weinig afvinkte.",
      },
    ],
  },
};
