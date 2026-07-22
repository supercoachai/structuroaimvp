import type { V2InfoSheetRow } from "./V2InfoSheet";

export type V2InfoSheetKey = "dump" | "snooze" | "focus" | "cycleOptIn" | "shutdown";

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
        key: "plan",
        icon: "plan",
        title: "Hoe het werkt",
        body: "Typ of spreek in. Later kies je rustig wat vandaag telt, en wat mag wachten.",
      },
      {
        key: "private",
        icon: "private",
        title: "Privé",
        body: "Dit blijft op dit apparaat, tenzij jij iets koppelt of exporteert.",
      },
    ],
  },
  snooze: {
    eyebrow: "Je lijst",
    title: "Snoozen",
    openAria: "Uitleg over snoozen",
    closeAria: "Uitleg sluiten",
    gotIt: "Begrepen",
    rows: [
      {
        key: "meaning",
        icon: "pause",
        title: "Wat dit betekent",
        body: "Snoozen is geen opgeven. Je zet iets even op pauze zodat je lijst niet schreeuwt.",
      },
      {
        key: "plan",
        icon: "plan",
        title: "Wanneer gebruiken",
        body: "Als je ergens anders bent, of even geen ruimte hebt. Het komt terug wanneer jij wilt.",
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
        title: "Geen minutenklok",
        body: "Kies een grove bak: kort, middel of lang. Zo kun je focussen zonder de tijd te jagen.",
      },
      {
        key: "plan",
        icon: "plan",
        title: "Hoe Structuro helpt",
        body: "Eén ding tegelijk. Klaar of nog even? Jij bepaalt. Geen perfecte keuze nodig.",
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
        body: "Structuro kleurt je dagstart zacht mee met je fase. Alleen als jij het aanzet.",
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
        key: "plan",
        icon: "plan",
        title: "Hoe het werkt",
        body: "Eerst wat je deed, dan even checken hoe je erbij zit, en optioneel iets loslaten in je dump.",
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
