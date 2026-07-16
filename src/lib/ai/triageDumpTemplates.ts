export type TriageDumpItemInput = {
  id: string;
  content: string;
  ageHint?: boolean;
};

const DEFAULT_QUESTION = "Wil je dit plannen, afmaken of laten gaan?";

const AGED_QUESTION =
  "Dit ligt al een tijdje. Wil je het plannen, afmaken of laten gaan?";

/** Zachte vraag zonder prioriteit of schaamte-taal. */
export function templateTriageQuestion(item: TriageDumpItemInput): string {
  if (item.ageHint) return AGED_QUESTION;
  const text = item.content.trim().toLowerCase();
  if (text.length === 0) return DEFAULT_QUESTION;

  if (/(mail|e-mail|bericht|antwoord)/.test(text)) {
    return "Wil je hier op reageren, plannen of het laten gaan?";
  }
  if (/(bellen|bellen|afspraak|verzetten)/.test(text)) {
    return "Wil je dit regelen, plannen of laten gaan?";
  }
  if (/(kopen|halen|boodschap)/.test(text)) {
    return "Wil je dit meenemen vandaag, plannen of laten gaan?";
  }

  return DEFAULT_QUESTION;
}

export function templateTriageDump(items: TriageDumpItemInput[]): { id: string; question: string }[] {
  return items.map((item) => ({
    id: item.id,
    question: templateTriageQuestion(item),
  }));
}
