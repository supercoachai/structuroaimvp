import type { DagstartTaskCard } from "@/components/dagstart/design/types";

import { analyzeDagstartKeep } from "./dagstartPickLimits";

/**
 * Resultaat van een dagstart-swipebeslissing.
 * - "applied": de actie is direct verwerkt (taak gekozen of overgeslagen).
 * - "blocked": de actie kan niet (alle focusplekken vol), de kaart blijft staan.
 * - "pending": de actie wacht op bevestiging (deadline boven de limiet).
 */
export type DagstartSwipeDecision = "applied" | "blocked" | "pending";

/**
 * Pure beslissingslogica voor een swipe in de dagstart. Geen side effects:
 * de UI past op basis van de uitkomst de selectie/queue aan en toont feedback.
 *
 * - skip -> altijd "applied"
 * - onbekende taak -> "blocked"
 * - taak al gekozen -> "applied"
 * - past binnen de limiet (allow) -> "applied"
 * - geen plek meer, geen deadline (reject) -> "blocked"
 * - deadline boven de limiet (overflow) -> "pending"
 */
export function resolveSwipeDecision(input: {
  action: "keep" | "skip";
  task: DagstartTaskCard | undefined;
  keptIds: readonly string[];
  maxSlots: number;
  extraDeadlineSlots: number;
}): DagstartSwipeDecision {
  if (input.action === "skip") return "applied";
  if (!input.task) return "blocked";
  if (input.keptIds.includes(input.task.id)) return "applied";

  const analysis = analyzeDagstartKeep(
    input.task,
    input.keptIds,
    input.maxSlots,
    input.extraDeadlineSlots
  );

  if (analysis.kind === "allow") return "applied";
  if (analysis.kind === "reject") return "blocked";
  return "pending";
}
