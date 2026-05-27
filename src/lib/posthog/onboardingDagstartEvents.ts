import { appEnergyToDagstartId } from "@/components/dagstart/design/types";
import { captureProductEvent } from "./track";

type AppEnergy = "low" | "medium" | "high";

/**
 * Onboarding vraagt energie + eerste taak af en zet de dagstart-cookie,
 * zonder de DagstartFlow-overlay. Dezelfde PostHog-events houden de funnel compleet.
 */
export function captureDagstartEventsFromOnboardingFinish(
  energy: AppEnergy,
  taskCount = 1
) {
  captureProductEvent("dagstart_started", { source: "onboarding" });
  captureProductEvent("dagstart_energy_chosen", {
    level: appEnergyToDagstartId(energy),
    source: "onboarding",
  });
  captureProductEvent("dagstart_completed", {
    energy,
    task_count: taskCount,
    tasks_selected_count: taskCount,
    source: "onboarding",
  });
}
