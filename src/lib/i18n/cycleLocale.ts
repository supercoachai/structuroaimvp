import type { Locale } from "./types";

/** Cyclus-tracking copy. Wordt gemerged onder t('cycle.*') via localeAddons. */
export const cycleLocale: Record<Locale, Record<string, string>> = {
  nl: {
    optInTitle: "Wil je je cyclus meenemen?",
    optInBody:
      "Energie en focus schommelen vaak met je menstruatiecyclus. Zet dit aan om later patronen te zien tussen cyclus en je dagstart.",
    optInYes: "Ja, zet aan",
    optInNo: "Nee, sla over",
    optInLearnMore: "Vertel me eerst meer",
    optInBullet1: "Alleen periodestart en cycluslengte",
    optInBullet2: "Wij berekenen je fase en koppelen die aan je dagstart",
    optInBullet3: "Geen symptoomtracking. Altijd uit te zetten",
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
    setupEyebrow: "EVEN INSTELLEN",
    setupSmartTitleBefore: "Eén vraag, de rest doen ",
    setupSmartTitleAccent: "wij",
    setupSmartTitleAfter: ".",
    setupPeriodLabel: "Wanneer begon je laatste menstruatie?",
    setupPeriodHint: "Vandaag, of tot 60 dagen terug.",
    setupPeriodToday: "Vandaag",
    setupPeriodYesterday: "Gisteren",
    setupPeriodEarlier: "Eerder...",
    setupPeriodPrevMonthAria: "Vorige maand",
    setupPeriodNextMonthAria: "Volgende maand",
    setupDefaultsMenstruation: "Duur menstruatie",
    setupDefaultsLength: "Cycluslengte",
    setupDefaultsDays: "{n} dagen",
    setupDefaultsFootnote:
      "Standaardwaarden. Structuro leert mee en stelt ze bij.",
    setupChange: "Wijzig",
    setupRowDone: "Klaar",
    setupConfirm: "Dit is goed",
    setupLaterNote: "Aanpassen kan altijd later.",
    setupMenstruationLabel: "Hoe lang duurt je menstruatie gemiddeld?",
    setupMenstruationHint: "Meestal 3 tot 7 dagen. Dit bepaalt je fase-bereiken.",
    setupMenstruationDecreaseAria: "Menstruatie korter",
    setupMenstruationIncreaseAria: "Menstruatie langer",
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
    settingsMenstruationLabel: "Menstruatieduur",
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
      "In deze fase rapporteren veel vrouwen met ADHD een tijdelijke dip in focus en stemming (luteale crash).",
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
      "Veel vrouwen met ADHD ervaren tijdens hun menstruatie minder energie en focus.",
    hintFollicular:
      "Je zit waarschijnlijk in je folliculaire fase. Veel vrouwen met ADHD ervaren in deze week meer focus en energie.",
    hintOvulation:
      "Veel vrouwen met ADHD ervaren rond hun ovulatie hun hoogste cognitieve helderheid.",
    hintLuteal:
      "Veel vrouwen met ADHD ervaren in hun luteale fase minder focus en meer brain fog.",
    hintDismissAria: "Verberg deze suggestie voor vandaag",
    contextEyebrow: "Cyclus",
    contextDayCounter: "Dag {day}/{length}",
    contextRange: "Dag {start}–{end}",
    contextRangeSingle: "Dag {day}",
    contextPhase_menstrual: "Menstruatie",
    contextPhase_follicular: "Folliculair",
    contextPhase_ovulation: "Ovulatie",
    contextPhase_luteal: "Luteaal",
    contextBio_menstrual: "Veel mensen rapporteren lagere energie in deze fase.",
    contextBio_follicular: "Veel mensen merken herstellende focus.",
    contextBio_ovulation: "Veel mensen ervaren meer helderheid.",
    contextBio_luteal: "Veel mensen merken wisselende focus.",
    contextAdvice_menstrual: "Energie varieert per persoon",
    contextAdvice_follicular: "Focus bouwt vaak op",
    contextAdvice_ovulation: "Helderheid kan pieken",
    contextAdvice_luteal: "Wisselend is normaal",
    contextTip_menstrual:
      "Voel je je vermoeid of wazig? Laag komt hier vaak voor. Voel je je toch redelijk? Kies wat klopt voor jou vandaag.",
    contextTip_follicular:
      "Merkt je een opleving? Middel of hoog kan passen. Nog niet fris? Laag is ook oké.",
    contextTip_ovulation:
      "Voel je je helder en energiek? Hoog kan passen. Voel je je toch rustiger? Middel of laag is prima.",
    contextTip_luteal:
      "Energie kan wisselen. Brain fog of prikkelbaarheid komt voor. Kies wat je nu voelt.",
    contextOnboardingLegendNote:
      "De andere cyclus-fases zie je later in je dagstart.",
    energyMatchTag_match: "Past bij je fase",
    energyMatchTag_softHigher: "Hoger dan je fase aangeeft",
    energyMatchTag_softLower: "Lager dan je fase aangeeft",
    energyMatchTag_strong: "Afwijkend van fasepatroon",
    contextChip_menstrual: "Laag komt vaak voor",
    contextChip_follicular: "Middel komt vaak voor",
    contextChip_ovulation: "Hoog kan passen",
    contextChip_luteal: "Varieert per dag",
    contextLegendExpand: "Bekijk alle fases",
    contextLegendCollapse: "Verberg cyclusfases",
    contextLegendNote:
      "Cycli verschillen per persoon. In Structuro stuur jij zelf: geen algoritme.",
    dagstartCyclusHint: "Bekijk je cyclusfase",
    dagstartCyclusButtonAria: "Cyclus, dag {day}",
    proposeDayPhase: "DAG {day} · {phase}",
    infoSheetEyebrow: "JE CYCLUS · DAG {day} VAN {length}",
    infoSheetPhaseTitle_menstrual: "Menstruatiefase",
    infoSheetPhaseTitle_follicular: "Folliculaire fase",
    infoSheetPhaseTitle_ovulation: "Ovulatie",
    infoSheetPhaseTitle_luteal: "Luteale fase",
    infoSheetPhasesAria: "Cyclusfases",
    infoSheetMeaningTitle: "Wat dit betekent",
    infoSheetMeaning_menstrual:
      "Energie en focus zijn vaak lager. Dat is fysiek, geen gebrek aan wilskracht.",
    infoSheetMeaning_follicular:
      "Energie en focus nemen vaak geleidelijk toe in deze fase.",
    infoSheetMeaning_ovulation:
      "Veel mensen ervaren meer helderheid rond ovulatie.",
    infoSheetMeaning_luteal:
      "Focus en stemming kunnen wisselen. Dat hoort bij deze fase.",
    infoSheetPlanTitle: "Hoe Structuro plant",
    infoSheetPlanBody:
      "Kleinere stappen vandaag. Zwaardere taken later in je cyclus.",
    infoSheetPrivateTitle: "Privé",
    infoSheetPrivateBody: "Blijft op dit apparaat. Wordt nooit gedeeld.",
    infoSheetGotIt: "Begrepen",
    infoSheetOpenAria: "Meer over je cyclusfase",
    infoSheetCloseAria: "Sluit cyclusuitleg",
  },
  en: {
    optInTitle: "Want to include your cycle?",
    optInBody:
      "Energy and focus often shift with your menstrual cycle. Turn this on to see patterns between your cycle and your daily check-in later.",
    optInYes: "Yes, turn on",
    optInNo: "No, skip",
    optInLearnMore: "Tell me more first",
    optInBullet1: "Only period start and cycle length",
    optInBullet2: "We calculate your phase and link it to your check-in",
    optInBullet3: "No symptom tracking. Turn off anytime",
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
    setupEyebrow: "QUICK SETUP",
    setupSmartTitleBefore: "One question, ",
    setupSmartTitleAccent: "we",
    setupSmartTitleAfter: " handle the rest.",
    setupPeriodLabel: "When did your last period start?",
    setupPeriodHint: "Today or up to 60 days back.",
    setupPeriodToday: "Today",
    setupPeriodYesterday: "Yesterday",
    setupPeriodEarlier: "Earlier...",
    setupPeriodPrevMonthAria: "Previous month",
    setupPeriodNextMonthAria: "Next month",
    setupDefaultsMenstruation: "Period length",
    setupDefaultsLength: "Cycle length",
    setupDefaultsDays: "{n} days",
    setupDefaultsFootnote:
      "Default values. Structuro learns with you and adjusts them.",
    setupChange: "Edit",
    setupRowDone: "Done",
    setupConfirm: "Looks good",
    setupLaterNote: "You can always adjust later.",
    setupMenstruationLabel: "How long does your period usually last?",
    setupMenstruationHint: "Usually 3 to 7 days. This sets your phase ranges.",
    setupMenstruationDecreaseAria: "Shorter period",
    setupMenstruationIncreaseAria: "Longer period",
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
    settingsMenstruationLabel: "Period length",
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
      "In this phase, many women with ADHD report a temporary dip in focus and mood (luteal crash).",
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
      "Many women with ADHD experience lower energy and focus during their period.",
    hintFollicular:
      "You are likely in your follicular phase. Many women with ADHD feel more focus and energy this week.",
    hintOvulation:
      "Many women with ADHD experience their sharpest cognitive clarity around ovulation.",
    hintLuteal:
      "Many women with ADHD have less focus and more brain fog in the luteal phase.",
    hintDismissAria: "Hide this suggestion for today",
    contextEyebrow: "Cycle",
    contextDayCounter: "Day {day}/{length}",
    contextRange: "Day {start}–{end}",
    contextRangeSingle: "Day {day}",
    contextPhase_menstrual: "Menstruation",
    contextPhase_follicular: "Follicular",
    contextPhase_ovulation: "Ovulation",
    contextPhase_luteal: "Luteal",
    contextBio_menstrual: "Many people report lower energy in this phase.",
    contextBio_follicular: "Many people notice returning focus.",
    contextBio_ovulation: "Many people experience more clarity.",
    contextBio_luteal: "Many people notice shifting focus.",
    contextAdvice_menstrual: "Energy varies per person",
    contextAdvice_follicular: "Focus often builds",
    contextAdvice_ovulation: "Clarity may peak",
    contextAdvice_luteal: "Variation is normal",
    contextTip_menstrual:
      "Feeling tired or foggy? Low is common here. Feeling okay anyway? Choose what fits you today.",
    contextTip_follicular:
      "Noticing an uptick? Medium or high may fit. Not feeling fresh yet? Low is fine too.",
    contextTip_ovulation:
      "Feeling clear and energetic? High may fit. Feeling calmer? Medium or low works too.",
    contextTip_luteal:
      "Energy can shift. Brain fog or irritability happens. Choose what you feel now.",
    contextOnboardingLegendNote:
      "You will see the other cycle phases later in your day start.",
    energyMatchTag_match: "Fits your phase",
    energyMatchTag_softHigher: "Higher than your phase suggests",
    energyMatchTag_softLower: "Lower than your phase suggests",
    energyMatchTag_strong: "Differs from phase pattern",
    contextChip_menstrual: "Low is common here",
    contextChip_follicular: "Medium is common here",
    contextChip_ovulation: "High may fit",
    contextChip_luteal: "Varies by day",
    contextLegendExpand: "View all phases",
    contextLegendCollapse: "Hide cycle phases",
    contextLegendNote:
      "Cycles differ per person. In Structuro you stay in control: no algorithm.",
    dagstartCyclusHint: "View your cycle phase",
    dagstartCyclusButtonAria: "Cycle, day {day}",
    proposeDayPhase: "DAY {day} · {phase}",
    infoSheetEyebrow: "YOUR CYCLE · DAY {day} OF {length}",
    infoSheetPhaseTitle_menstrual: "Menstrual phase",
    infoSheetPhaseTitle_follicular: "Follicular phase",
    infoSheetPhaseTitle_ovulation: "Ovulation",
    infoSheetPhaseTitle_luteal: "Luteal phase",
    infoSheetPhasesAria: "Cycle phases",
    infoSheetMeaningTitle: "What this means",
    infoSheetMeaning_menstrual:
      "Energy and focus are often lower. That is physical, not a lack of willpower.",
    infoSheetMeaning_follicular:
      "Energy and focus often build gradually in this phase.",
    infoSheetMeaning_ovulation:
      "Many people experience more clarity around ovulation.",
    infoSheetMeaning_luteal:
      "Focus and mood can shift. That belongs to this phase.",
    infoSheetPlanTitle: "How Structuro plans",
    infoSheetPlanBody:
      "Smaller steps today. Heavier tasks later in your cycle.",
    infoSheetPrivateTitle: "Private",
    infoSheetPrivateBody: "Stays on this device. Never shared.",
    infoSheetGotIt: "Got it",
    infoSheetOpenAria: "More about your cycle phase",
    infoSheetCloseAria: "Close cycle explanation",
  },
};
