"use client";

export type V2LearnHintFeature = "dump" | "snooze" | "focus";

const STORAGE_KEY = "v2_learn_hints_seen";

function readSeen(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeSeen(seen: Record<string, boolean>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seen));
  } catch {
    // negeren
  }
}

export function hasSeenV2LearnHint(feature: V2LearnHintFeature): boolean {
  return readSeen()[feature] === true;
}

export function markV2LearnHintSeen(feature: V2LearnHintFeature): void {
  const seen = readSeen();
  if (seen[feature]) return;
  writeSeen({ ...seen, [feature]: true });
}

export const V2_LEARN_HINT_COPY: Record<
  V2LearnHintFeature,
  { label: string; body: string }
> = {
  dump: {
    label: "Waarom extern geheugen?",
    body: "Je hoofd hoeft niet alles te onthouden. Dump losse gedachten hier; later kies je rustig wat vandaag telt.",
  },
  snooze: {
    label: "Waarom snoozen?",
    body: "Snoozen is geen opgeven. Je zet iets even op pauze zodat je lijst niet schreeuwt terwijl je ergens anders bent.",
  },
  focus: {
    label: "Waarom tijdblind?",
    body: "Geen minutenklok die tikt. Kies een grove bak (kort, middel, lang) zodat je kunt focussen zonder de tijd te jagen.",
  },
};
