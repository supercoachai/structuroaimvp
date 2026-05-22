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
    energyContextHeadline: "Cyclus dag {day} · {phase}",
    energyContextTrackingActive: "Cyclus-tracking actief",
    energyContextPhase_menstrual: "Menstruatie",
    energyContextPhase_follicular: "Folliculair",
    energyContextPhase_ovulation: "Ovulatie",
    energyContextPhase_luteal_early: "Luteaal (vroeg)",
    energyContextPhase_luteal_late: "Luteaal (laat)",
    energyContextBody_menstrual:
      "Veel vrouwen met ADHD ervaren in deze fase lagere energie en concentratie.",
    energyContextBody_follicular:
      "Energie en focus nemen vaak geleidelijk toe in deze fase.",
    energyContextBody_ovulation:
      "Veel vrouwen met ADHD ervaren rond ovulatie hun hoogste cognitieve helderheid.",
    energyContextBody_luteal_early:
      "Energie kan in deze fase nog stabiel zijn, maar fluctuaties zijn normaal.",
    energyContextBody_luteal_late:
      "In deze fase rapporteren veel vrouwen met ADHD een tijdelijke dip in focus en stemming (luteale crash). Lage energie kiezen is hier vaak realistisch.",
    energyContextExpandAria: "Toon cyclus-uitleg",
    energyContextCollapseAria: "Verberg cyclus-uitleg",
    energyContextTip_active_only:
      "Vul je laatste menstruatie in bij instellingen om fase-info te zien die je kan helpen bij je energiekeuze.",
    energyContextTip_menstrual:
      "Voel je je vermoeid of wazig? Laag past vaak. Voel je je toch redelijk? Kies wat klopt voor jou vandaag.",
    energyContextTip_follicular:
      "Merkt je een opleving? Middel of hoog kan passen. Nog niet fris? Laag is ook oké.",
    energyContextTip_ovulation:
      "Voel je je helder en energiek? Hoog kan passen. Voel je je toch rustiger? Middel of laag is prima.",
    energyContextTip_luteal_early:
      "Energie kan nog wisselen. Kies wat je nu voelt: stabiel voelt vaak als middel, moe als laag.",
    energyContextTip_luteal_late:
      "Brain fog of prikkelbaarheid? Laag is vaak realistisch. Goede dag? Middel kan ook.",
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
    energyContextHeadline: "Cycle day {day} · {phase}",
    energyContextTrackingActive: "Cycle tracking active",
    energyContextPhase_menstrual: "Menstruation",
    energyContextPhase_follicular: "Follicular",
    energyContextPhase_ovulation: "Ovulation",
    energyContextPhase_luteal_early: "Luteal (early)",
    energyContextPhase_luteal_late: "Luteal (late)",
    energyContextBody_menstrual:
      "Many women with ADHD experience lower energy and concentration in this phase.",
    energyContextBody_follicular:
      "Energy and focus often build gradually during this phase.",
    energyContextBody_ovulation:
      "Many women with ADHD experience their highest cognitive clarity around ovulation.",
    energyContextBody_luteal_early:
      "Energy may still feel steady in this phase, but fluctuations are normal.",
    energyContextBody_luteal_late:
      "In this phase, many women with ADHD report a temporary dip in focus and mood (luteal crash). Choosing low energy is often realistic here.",
    energyContextExpandAria: "Show cycle explanation",
    energyContextCollapseAria: "Hide cycle explanation",
    energyContextTip_active_only:
      "Enter your last period start in settings to see phase info that can help with your energy choice.",
    energyContextTip_menstrual:
      "Feeling tired or foggy? Low often fits. Feeling okay anyway? Choose what feels right for you today.",
    energyContextTip_follicular:
      "Noticing an uptick? Medium or high may fit. Not feeling fresh yet? Low is fine too.",
    energyContextTip_ovulation:
      "Feeling clear and energetic? High may fit. Feeling calmer? Medium or low works too.",
    energyContextTip_luteal_early:
      "Energy can still fluctuate. Pick what you feel now: steady often means medium, tired means low.",
    energyContextTip_luteal_late:
      "Brain fog or irritability? Low is often realistic. Having a good day? Medium can work too.",
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
