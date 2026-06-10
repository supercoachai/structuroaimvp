import { appEnergyToDagstartId } from "@/components/dagstart/design/types";
import { captureProductEvent } from "./track";

type AppEnergy = "low" | "medium" | "high";

/**
 * Onboarding vraagt energie + eerste taak af en zet de dagstart-cookie,
 * zonder de DagstartFlow-overlay. Dezelfde PostHog-events houden de funnel compleet.
 *
 * Naming-conventie (zelfde sleutels als DagstartFlow):
 *  - energy_level: AppEnergy ("low" | "medium" | "high")
 *  - tasks_selected_count: aantal taken in top-3
 *  - has_cycle_phase: of er een cyclusfase is meegestuurd
 *  - source: identificeert de funnel-tak
 * Oude sleutels (energy, task_count, level) blijven meegestuurd voor historische dashboards.
 */
export function captureDagstartEventsFromOnboardingFinish(
  energy: AppEnergy,
  taskCount = 1
) {
  captureProductEvent("dagstart_energy_chosen", {
    energy_level: energy,
    level: appEnergyToDagstartId(energy),
    source: "onboarding",
  });
  captureProductEvent("dagstart_completed", {
    energy_level: energy,
    tasks_selected_count: taskCount,
    has_cycle_phase: false,
    source: "onboarding",
    energy,
    task_count: taskCount,
  });
}
