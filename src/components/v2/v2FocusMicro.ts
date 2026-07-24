import type { V2Energy } from "./V2Context";
import type { V2MicroStep } from "./v2Tasks";

/** Map journey-energie naar microstep AI-energie. */
export function v2EnergyToMicro(
  energy: V2Energy | null,
): "low" | "medium" | "high" | null {
  if (energy === "low") return "low";
  if (energy === "high") return "high";
  if (energy === "enough") return "medium";
  return null;
}

/** Index van de eerstvolgende open microstap (of length als alles klaar is). */
export function v2ActiveMicroStepIndex(steps: V2MicroStep[]): number {
  const idx = steps.findIndex((step) => !step.done);
  return idx === -1 ? steps.length : idx;
}
