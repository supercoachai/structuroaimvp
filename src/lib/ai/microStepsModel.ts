/** Standaard: goedkoopste betrouwbare model op Vercel AI Gateway (~$0.07/$0.30 per 1M tokens). */
export const DEFAULT_MICRO_STEPS_MODEL = "google/gemini-2.5-flash-lite";

export function resolveMicroStepsModel(): string {
  const fromEnv = process.env.MICRO_STEPS_AI_MODEL?.trim();
  return fromEnv || DEFAULT_MICRO_STEPS_MODEL;
}

export const MICRO_STEPS_DAILY_LIMIT = 30;
