import type { SatisfactionLevel } from "@/components/dagafsluiting/DagafsluitingSatisfactionCards";

export type ShutdownMoodMeta = {
  id: SatisfactionLevel;
  labelKey: "satLowLabel" | "satGoodLabel" | "satGreatLabel";
  adjectiveKey: "moodAdjHeavy" | "moodAdjOkay" | "moodAdjProud";
  color: string;
  haze: string;
};

export const SHUTDOWN_MOODS: ShutdownMoodMeta[] = [
  {
    id: "low",
    labelKey: "satLowLabel",
    adjectiveKey: "moodAdjHeavy",
    color: "#EC4899",
    haze: "rgba(236,72,153,0.10)",
  },
  {
    id: "good",
    labelKey: "satGoodLabel",
    adjectiveKey: "moodAdjOkay",
    color: "#6B7280",
    haze: "rgba(107,114,128,0.10)",
  },
  {
    id: "great",
    labelKey: "satGreatLabel",
    adjectiveKey: "moodAdjProud",
    color: "#3B6BF7",
    haze: "rgba(59,107,247,0.10)",
  },
];

export function getShutdownMoodMeta(
  level: SatisfactionLevel | null | undefined
): ShutdownMoodMeta | undefined {
  if (!level) return undefined;
  return SHUTDOWN_MOODS.find((m) => m.id === level);
}
