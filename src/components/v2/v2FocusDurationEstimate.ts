import type { V2DurationBucket } from "./v2Tasks";

export type FocusEstimateSource = "task" | "heuristic" | "fallback";

export type FocusDurationEstimate = {
  /** Non-null bucket key used for the timer. */
  durationBucket: Exclude<V2DurationBucket, null>;
  source: FocusEstimateSource;
};

type EnergyInput = "low" | "medium" | "high" | null;

const LONG_HINT =
  /\b(rapport|presentatie|scriptie|studeren|stud(y|ying)|schrijven|write|writing|project|administratie|admin|belasting|tax|vergadering|meeting|onderzoek|research)\b/i;

const MEDIUM_HINT =
  /\b(opruim|clean|cleaning|afwas|dishes|bed\s*verscho|boodschap|grocer|inbox|e-?mail|mail|wassen|laundry|koken|cook|sport|workout|wandel|walk)\b/i;

const SHORT_HINT =
  /\b(even|snel|quick|kort|short|tik|check|bellen|call|bericht|message|1\s*ding|one\s*thing)\b/i;

/**
 * Grove ADHD-vriendelijke duur-inschatting (bakken, geen exacte minuten).
 * Prefer taak-durationBucket; anders titel+energie; anders kort (starten zonder blokkade).
 */
export function estimateFocusDurationBucket(input: {
  title: string;
  energy?: EnergyInput;
  taskDurationBucket?: V2DurationBucket;
}): FocusDurationEstimate {
  const fromTask = input.taskDurationBucket;
  if (fromTask === "short" || fromTask === "medium" || fromTask === "long") {
    return { durationBucket: fromTask, source: "task" };
  }

  const title = input.title.trim();
  if (!title) {
    return { durationBucket: "short", source: "fallback" };
  }

  let guessed: Exclude<V2DurationBucket, null> | null = null;
  if (LONG_HINT.test(title)) guessed = "long";
  else if (MEDIUM_HINT.test(title)) guessed = "medium";
  else if (SHORT_HINT.test(title)) guessed = "short";

  const energy = input.energy ?? null;
  if (energy === "low") {
    if (guessed === "long") guessed = "medium";
    else if (!guessed) guessed = "short";
  } else if (energy === "high" && !guessed) {
    guessed = "medium";
  }

  if (guessed) {
    return { durationBucket: guessed, source: "heuristic" };
  }

  return { durationBucket: "short", source: "fallback" };
}
