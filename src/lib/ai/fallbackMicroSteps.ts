import { validateMicroStepsCompletion } from "@/lib/ai/microStepsCompletion";

function taskCore(title: string): string {
  const trimmed = title.trim().replace(/[.!?]+$/g, "");
  if (trimmed.length <= 52) return trimmed;
  return trimmed.slice(0, 49).trim();
}

/**
 * Lokale 4-stappenladder als de AI-gateway uitvalt of rate-limitet.
 * Moet `validateMicroStepsCompletion` halen.
 */
export function fallbackMicroStepsFromTitle(
  title: string,
  locale: "nl" | "en" = "nl",
): string[] {
  const core = taskCore(title) || (locale === "en" ? "this task" : "deze taak");
  const steps =
    locale === "en"
      ? [
          `Get what you need and start ${core}`,
          `Do the bulk of ${core}`,
          "Finish whatever is still open",
          `Check that ${core} is fully done`,
        ]
      : [
          `Zet klaar wat je nodig hebt en start ${core}`,
          `Doe het grootste deel van ${core}`,
          "Werk af wat nog openstaat",
          `Controleer of ${core} volledig klaar is`,
        ];

  if (validateMicroStepsCompletion(steps) !== null) {
    return locale === "en"
      ? [
          "Open the task and take the first small action",
          "Do the main part of the work",
          "Finish the remaining pieces",
          "Check that the task is fully done",
        ]
      : [
          "Open de taak en zet de eerste kleine stap",
          "Doe het grootste deel van het werk",
          "Werk de rest af",
          "Controleer of de taak volledig klaar is",
        ];
  }

  return steps;
}

export function isAiGatewayRateLimited(error: unknown, depth = 0): boolean {
  if (!error || depth > 6) return false;
  if (typeof error !== "object") return false;
  const err = error as {
    statusCode?: number;
    type?: string;
    name?: string;
    message?: string;
    lastError?: unknown;
    cause?: unknown;
    errors?: unknown[];
  };
  if (err.statusCode === 429 || err.type === "rate_limit_exceeded") return true;
  if (typeof err.message === "string" && /rate[- ]limit/i.test(err.message)) {
    return true;
  }
  if (isAiGatewayRateLimited(err.lastError, depth + 1)) return true;
  if (isAiGatewayRateLimited(err.cause, depth + 1)) return true;
  if (Array.isArray(err.errors)) {
    return err.errors.some((item) => isAiGatewayRateLimited(item, depth + 1));
  }
  return false;
}
