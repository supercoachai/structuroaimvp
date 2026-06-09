export type MicroStepTemplateMatch = {
  steps: string[];
  source: "template";
};

const NL_TEMPLATES: Array<{ pattern: RegExp; steps: string[] }> = [
  {
    pattern: /bed\s*verscho/i,
    steps: [
      "Lakens en hoezen van het bed halen",
      "Matras luchten en nieuw beddengoed klaarleggen",
      "Schone lakens en hoezen erop doen",
      "Kamer even opruimen rond het bed",
    ],
  },
  {
    pattern: /vaat\s*wassen|afwas/i,
    steps: [
      "Afwassen of vaatwasser inruimen",
      "Spoelen en in de machine zetten",
      "Programma starten of handafwas doen",
      "Afdrogen en wegleggen",
    ],
  },
  {
    pattern: /boodschap/i,
    steps: [
      "Lijstje checken en tas pakken",
      "Naar de winkel gaan",
      "Boodschappen afrekenen",
      "Uitpakken en opbergen",
    ],
  },
  {
    pattern: /inbox.*(nul|leeg|0)|e-?mail.*(nul|leeg|op\s*rui)/i,
    steps: [
      "Inbox openen, sorteer op oudste eerst",
      "Verwijder spam, nieuwsbrieven en oude meldingen",
      "Beantwoord, archiveer of verwijder elke resterende mail",
      "Controleer: inbox staat op nul",
    ],
  },
  {
    pattern: /e-?mail|inbox/i,
    steps: [
      "Inbox openen, sorteer op oudste eerst",
      "Verwijder spam en nieuwsbrieven die weg kunnen",
      "Beantwoord, archiveer of verwijder elke resterende mail",
      "Controleer: inbox staat op nul",
    ],
  },
];

const EN_TEMPLATES: Array<{ pattern: RegExp; steps: string[] }> = [
  {
    pattern: /change.*bed|bed\s*sheet/i,
    steps: [
      "Strip bedding and pillowcases",
      "Air the mattress and lay out clean linen",
      "Put on clean sheets and covers",
      "Tidy the area around the bed",
    ],
  },
  {
    pattern: /dishes|wash.*dishes/i,
    steps: [
      "Gather dishes and clear the sink",
      "Wash or load the dishwasher",
      "Start the cycle or finish hand washing",
      "Dry and put everything away",
    ],
  },
  {
    pattern: /grocer|shopping/i,
    steps: [
      "Check your list and grab a bag",
      "Go to the shop",
      "Pay and head home",
      "Unpack and put items away",
    ],
  },
  {
    pattern: /inbox.*(zero|empty|clear)|e-?mail.*(zero|empty|clear)/i,
    steps: [
      "Open inbox, sort oldest first",
      "Delete spam, newsletters and old notifications",
      "Reply, archive or delete each remaining email",
      "Verify inbox is at zero",
    ],
  },
  {
    pattern: /e-?mail|inbox/i,
    steps: [
      "Open inbox, sort oldest first",
      "Delete spam and newsletters that can go",
      "Reply, archive or delete each remaining email",
      "Verify inbox is at zero",
    ],
  },
];

export function matchMicroStepTemplate(
  title: string,
  locale: "nl" | "en" = "nl"
): MicroStepTemplateMatch | null {
  const normalized = title.trim();
  if (!normalized) return null;

  const templates = locale === "en" ? EN_TEMPLATES : NL_TEMPLATES;
  for (const tpl of templates) {
    if (tpl.pattern.test(normalized)) {
      return { steps: [...tpl.steps], source: "template" };
    }
  }
  return null;
}
