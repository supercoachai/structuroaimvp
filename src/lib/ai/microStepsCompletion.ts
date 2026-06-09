/**
 * Gedeelde regels: 4 microstappen = het hele klusje van start tot echt klaar.
 */

export const MICRO_STEPS_COMPLETION_LADDER_NL = [
  "Stap 1 (start): eerste concrete actie die het klusje écht op gang brengt",
  "Stap 2 (voortgang): het grootste deel van het werk uitvoeren",
  "Stap 3 (bijna klaar): alles wat nog openstaat afmaken",
  "Stap 4 (klaar): laatste handeling en controleren dat de taak volledig af is",
] as const;

export const MICRO_STEPS_COMPLETION_LADDER_EN = [
  "Step 1 (start): first concrete action that truly begins the job",
  "Step 2 (progress): do the bulk of the work",
  "Step 3 (almost done): finish everything still open",
  "Step 4 (done): final action and verify the task is fully complete",
] as const;

/** Detecteert willekeurige deel-aantallen die het doel niet afronden. */
export function hasArbitraryPartialCount(steps: string[]): boolean {
  const partialPattern =
    /\b(\d+|een paar|enkele|sommige)\s+(mails?|e-?mails?|berichten|items?|dingen|taken|documenten|bestanden)\b/i;
  return steps.some((step) => partialPattern.test(step));
}

export function hasWeakFinishStep(steps: string[]): boolean {
  const last = steps[steps.length - 1]?.toLowerCase() ?? "";
  const finishSignals =
    /(klaar|af|volledig|controleer|check|nul|leeg|opgeruimd|verif|done|complete|empty|zero|finish)/i;
  return !finishSignals.test(last);
}

export function validateMicroStepsCompletion(steps: string[]): string | null {
  if (steps.length !== 4) return "expected_four_steps";
  if (hasArbitraryPartialCount(steps)) return "arbitrary_partial_count";
  if (hasWeakFinishStep(steps)) return "weak_finish_step";
  return null;
}
