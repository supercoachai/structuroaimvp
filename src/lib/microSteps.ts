export type MicroStepDifficulty = 'low' | 'medium' | 'high';

export type MicroStep = {
  id: string;
  title: string;
  minutes?: number | null;
  difficulty?: MicroStepDifficulty | null;
  done?: boolean;
};

export function microStepId(): string {
  return `ms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeMicroSteps(input: any): MicroStep[] {
  if (!Array.isArray(input)) return [];

  // Backwards compatibility: older storage used string[]
  return input
    .map((raw, idx) => {
      if (typeof raw === 'string') {
        const t = raw.trim();
        if (!t) return null;
        return { id: `ms_legacy_${idx}_${t.slice(0, 12)}`, title: t, minutes: null, difficulty: null, done: false } as MicroStep;
      }
      if (raw && typeof raw === 'object') {
        const title = String(raw.title ?? raw.text ?? '').trim();
        if (!title) return null;
        const id = String(raw.id ?? `ms_legacy_${idx}_${title.slice(0, 12)}`);
        const minutesRaw = raw.minutes ?? raw.duration ?? raw.estimatedDuration ?? null;
        const minutes =
          typeof minutesRaw === 'number' && Number.isFinite(minutesRaw) ? minutesRaw :
          typeof minutesRaw === 'string' && minutesRaw.trim() !== '' && Number.isFinite(parseInt(minutesRaw, 10)) ? parseInt(minutesRaw, 10) :
          null;
        const diff = raw.difficulty ?? raw.energyLevel ?? null;
        const difficulty: MicroStepDifficulty | null =
          diff === 'low' || diff === 'medium' || diff === 'high' ? diff : null;
        const done = Boolean(raw.done);
        return { id, title, minutes, difficulty, done } as MicroStep;
      }
      return null;
    })
    .filter(Boolean) as MicroStep[];
}

export function nextUndoneIndex(steps: MicroStep[]): number {
  return steps.findIndex(s => !s.done);
}


