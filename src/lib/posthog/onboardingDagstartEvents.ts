import { appEnergyToDagstartId } from "@/components/dagstart/design/types";
import {
  trackDagstartCompleted,
  trackDagstartEnergyChosen,
  trackDagstartStarted,
} from "@/lib/posthog/activationFunnelAnalyticsClient";

type AppEnergy = "low" | "medium" | "high";

/**
 * Onboarding vraagt energie + eerste taak af en zet de dagstart-cookie,
 * zonder de DagstartFlow-overlay. Dezelfde PostHog-events houden de funnel compleet.
 *
 * `dbPersisted` reflecteert of `profiles.last_dagstart_date` daadwerkelijk geschreven is
 * (alleen waar voor ingelogde users met firstDayReady + firstDayEnergy). Hiermee kunnen we
 * in PostHog monitoren of de event-vuren in lijn lopen met de DB-write, zodat de cookie-vs-DB
 * mismatch (Carlijn-bug) zichtbaar blijft als hij ooit terugkeert.
 */
export function captureDagstartEventsFromOnboardingFinish(
  energy: AppEnergy,
  taskCount = 1,
  options: { dbPersisted?: boolean } = {}
) {
  const dbPersisted = options.dbPersisted === true;
  trackDagstartStarted("onboarding");
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
    db_persisted: dbPersisted,
  });
}
