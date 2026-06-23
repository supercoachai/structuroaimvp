import { appEnergyToDagstartId } from "@/components/dagstart/design/types";
import {
  trackDagstartCompleted,
  trackDagstartEnergyChosen,
} from "@/lib/posthog/activationFunnelAnalyticsClient";

type AppEnergy = "low" | "medium" | "high";

/**
 * Onboarding vraagt energie + eerste taak af en zet de dagstart-cookie,
 * zonder de DagstartFlow-overlay. Dezelfde PostHog-events houden de funnel compleet.
 */
export function captureDagstartEventsFromOnboardingFinish(
  energy: AppEnergy,
  taskCount = 1
) {
  trackDagstartEnergyChosen({
    energy_level: energy,
    level: appEnergyToDagstartId(energy),
    source: "onboarding",
  });
  trackDagstartCompleted({
    energy_level: energy,
    tasks_selected_count: taskCount,
    has_cycle_phase: false,
    source: "onboarding",
    energy,
    task_count: taskCount,
  });
}
