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
    pattern: /e-?mail|inbox/i,
    steps: [
      "Inbox openen en snel scannen",
      "Belangrijke mails beantwoorden",
      "Overige mails archiveren of verwijderen",
      "Inbox leegmaken of bijna leeg",
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
    pattern: /e-?mail|inbox/i,
    steps: [
      "Open inbox and scan quickly",
      "Reply to important messages",
      "Archive or delete the rest",
      "Leave inbox nearly empty",
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
