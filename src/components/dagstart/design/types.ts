export type DagstartEnergyId = "laag" | "normaal" | "hoog";

export type DagstartEnergyMeta = {
  id: DagstartEnergyId;
  appEnergy: "low" | "medium" | "high";
  label: string;
  sub: string;
  level: 1 | 2 | 3;
  color: string;
};

export const DAGSTART_ENERGIES: DagstartEnergyMeta[] = [
  { id: "laag", appEnergy: "low", label: "Laag", sub: "Rustig aan", level: 1, color: "#10B981" },
  { id: "normaal", appEnergy: "medium", label: "Normaal", sub: "Gewone dag", level: 2, color: "#3B6BF7" },
  { id: "hoog", appEnergy: "high", label: "Hoog", sub: "Lekker bezig", level: 3, color: "#8B5CF6" },
];

export function appEnergyToDagstartId(
  energy: string | null | undefined
): DagstartEnergyId {
  const e = String(energy ?? "medium").toLowerCase();
  if (e === "low") return "laag";
  if (e === "high") return "hoog";
  return "normaal";
}

export function dagstartIdToAppEnergy(
  id: DagstartEnergyId
): "low" | "medium" | "high" {
  if (id === "laag") return "low";
  if (id === "hoog") return "high";
  return "medium";
}

/** Welke task-energieniveaus passen bij gekozen dag-energie (design-regel). */
export function dagstartTaskEnergyAllow(
  energy: DagstartEnergyId
): DagstartEnergyId[] {
  if (energy === "hoog") return ["laag", "normaal", "hoog"];
  if (energy === "normaal") return ["laag", "normaal"];
  return ["laag"];
}

/**
 * Aantal focuspunten dat bij het dag-energieniveau hoort.
 * Lijnt met `maxSlotsForDayEnergy` uit dagstart/deadlineToday.
 */
export function dagstartMaxSlotsForEnergy(energy: DagstartEnergyId): number {
  if (energy === "hoog") return 3;
  if (energy === "normaal") return 2;
  return 1;
}

export type DagstartTaskCard = {
  id: string;
  title: string;
  appEnergy: "low" | "medium" | "high";
  energy: DagstartEnergyId;
  minutes: number;
  dueAt: string | null;
  deadline: string | null;
  overdue: boolean;
};
