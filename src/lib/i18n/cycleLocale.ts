import type { Locale } from "./types";

/** Cyclus-tracking copy. Wordt gemerged onder t('cycle.*') via localeAddons. */
export const cycleLocale: Record<Locale, Record<string, string>> = {
  nl: {
    optInTitle: "Wil je je cyclus meenemen?",
    optInBody:
      "Veel mensen met ADHD ervaren dat hun energie en focus sterk schommelen met hun menstruatiecyclus. Als je dit aanzet, kun je later patronen zien tussen je cyclus en je dagelijkse energie.",
    optInYes: "Ja, zet aan",
    optInNo: "Nee, sla over",
    optInLearnMore: "Vertel me eerst meer",
    aboutTitle: "Hoe Structuro met je cyclus omgaat",
    aboutLine1:
      "Je deelt alleen wat nodig is: de start van je laatste menstruatie en je gemiddelde cycluslengte.",
    aboutLine2:
      "Structuro berekent zelf de fase van vandaag (folliculair, ovulatie, luteaal, menstruatie) en slaat alleen die fase op bij je dagstart.",
    aboutLine3:
      "Geen pijn-, bloed- of symptoomtracking. Geen externe diensten. Je kunt alles op elk moment uitzetten en wissen.",
    aboutPrivacyLink: "Lees ons privacybeleid",
    setupTitle: "Even instellen",
    setupSub: "Twee dingen, dan zijn we klaar.",
    setupPeriodLabel: "Wanneer begon je laatste menstruatie?",
    setupPeriodHint: "Vandaag, of tot 60 dagen terug.",
    setupLengthLabel: "Hoeveel dagen duurt je cyclus gemiddeld?",
    setupLengthHint: "Tussen 21 en 35 dagen. Standaard is 28.",
    setupLengthDays: "dagen",
    setupLengthDecreaseAria: "Cyclus korter",
    setupLengthIncreaseAria: "Cyclus langer",
    setupSubmit: "Klaar",
    setupSaving: "Opslaan…",
    setupSaveError: "Kon niet opslaan: {detail}",
    settingsTitle: "Cyclus-tracking",
    settingsHint:
      "Optioneel. Structuro berekent je fase en slaat die op bij je dagstart. Niets meer.",
    settingsToggleOn: "Aan",
    settingsToggleOff: "Uit",
    settingsEnable: "Inschakelen",
    settingsDisable: "Uitschakelen",
    settingsPeriodLabel: "Laatste menstruatie",
    settingsAdjustPeriod: "Pas mijn cyclus aan",
    settingsLengthLabel: "Gemiddelde cycluslengte",
    settingsRemoveAll: "Verwijder al mijn cyclus-data",
    settingsRemoveConfirmTitle: "Weet je het zeker?",
    settingsRemoveConfirmBody:
      "Dit verwijdert je cyclus-instellingen en alle opgeslagen fases. Dit kan niet ongedaan worden gemaakt.",
    settingsRemoveConfirmYes: "Verwijder alles",
    settingsRemoveConfirmCancel: "Annuleren",
    settingsRemoveBusy: "Bezig…",
    settingsRemoveError: "Kon niet verwijderen: {detail}",
    settingsAdjustModalTitle: "Pas mijn cyclus aan",
    settingsToastEnabled: "Cyclus-tracking staat aan.",
    settingsToastUpdated: "Cyclus bijgewerkt.",
    settingsToastDisabled: "Cyclus-tracking staat uit.",
    hintMenstrual:
      "Veel vrouwen met ADHD ervaren tijdens hun menstruatie minder energie. Wil je vandaag starten op laag?",
    hintFollicular:
      "Je zit waarschijnlijk in je folliculaire fase. Veel vrouwen met ADHD ervaren in deze week meer focus en energie.",
    hintOvulation:
      "Veel vrouwen met ADHD ervaren rond hun ovulatie hun hoogste cognitieve helderheid. Wil je vandaag starten op hoog?",
    hintLuteal:
      "Veel vrouwen met ADHD ervaren in hun luteale fase minder focus en meer brain fog. Wil je vandaag starten op laag?",
    hintDismissAria: "Verberg deze suggestie voor vandaag",
  },
  en: {
    optInTitle: "Want to include your cycle?",
    optInBody:
      "Many people with ADHD notice their energy and focus shift with their menstrual cycle. If you turn this on, you can later see patterns between your cycle and your daily energy.",
    optInYes: "Yes, turn on",
    optInNo: "No, skip",
    optInLearnMore: "Tell me more first",
    aboutTitle: "How Structuro handles your cycle",
    aboutLine1:
      "You only share what is needed: the start of your last period and your average cycle length.",
    aboutLine2:
      "Structuro calculates today's phase (follicular, ovulation, luteal, menstrual) on your device and only stores that phase with your day start.",
    aboutLine3:
      "No pain, bleeding or symptom tracking. No external services. You can turn it off and erase the data at any time.",
    aboutPrivacyLink: "Read our privacy policy",
    setupTitle: "Quick setup",
    setupSub: "Two things, then we are done.",
    setupPeriodLabel: "When did your last period start?",
    setupPeriodHint: "Today or up to 60 days back.",
    setupLengthLabel: "How long is your cycle on average?",
    setupLengthHint: "Between 21 and 35 days. Default is 28.",
    setupLengthDays: "days",
    setupLengthDecreaseAria: "Shorter cycle",
    setupLengthIncreaseAria: "Longer cycle",
    setupSubmit: "Done",
    setupSaving: "Saving…",
    setupSaveError: "Could not save: {detail}",
    settingsTitle: "Cycle tracking",
    settingsHint:
      "Optional. Structuro calculates your phase and stores it with your day start. Nothing else.",
    settingsToggleOn: "On",
    settingsToggleOff: "Off",
    settingsEnable: "Turn on",
    settingsDisable: "Turn off",
    settingsPeriodLabel: "Last period",
    settingsAdjustPeriod: "Adjust my cycle",
    settingsLengthLabel: "Average cycle length",
    settingsRemoveAll: "Erase all my cycle data",
    settingsRemoveConfirmTitle: "Are you sure?",
    settingsRemoveConfirmBody:
      "This erases your cycle settings and every saved phase. This cannot be undone.",
    settingsRemoveConfirmYes: "Erase everything",
    settingsRemoveConfirmCancel: "Cancel",
    settingsRemoveBusy: "Working…",
    settingsRemoveError: "Could not erase: {detail}",
    settingsAdjustModalTitle: "Adjust my cycle",
    settingsToastEnabled: "Cycle tracking is on.",
    settingsToastUpdated: "Cycle updated.",
    settingsToastDisabled: "Cycle tracking is off.",
    hintMenstrual:
      "Many women with ADHD have lower energy during their period. Want to start today on low?",
    hintFollicular:
      "You are likely in your follicular phase. Many women with ADHD feel more focus and energy this week.",
    hintOvulation:
      "Many women with ADHD experience their sharpest cognitive clarity around ovulation. Want to start today on high?",
    hintLuteal:
      "Many women with ADHD have less focus and more brain fog in the luteal phase. Want to start today on low?",
    hintDismissAria: "Hide this suggestion for today",
  },
};
