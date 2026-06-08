import type { EnergyIconKind } from "@/components/structuro/EnergyIcon";

export type NewTaskEnergyLevel = "low" | "medium" | "high";

export type NewTaskDeadlineChoice =
  | null
  | "today"
  | "tomorrow"
  | string;

export type NewTaskRepeatChoice = "none" | "daily" | "weekdays" | "weekly";

export type NewTaskFlowPayload = {
  title: string;
  energy: NewTaskEnergyLevel;
  durationMin: number;
  /** Kalenderdag (YMD) waarop de taak gepland staat. */
  scheduleDate?: string;
  /** Optioneel tijdstip op de geplande dag. */
  scheduleTime?: { hour: number; minute: number } | null;
  deadline: NewTaskDeadlineChoice;
  microsteps: string[];
  repeat?: NewTaskRepeatChoice;
};

export type NewTaskEnergyOption = {
  id: NewTaskEnergyLevel;
  color: string;
  haze: string;
  iconKind: EnergyIconKind;
  labelKey: "energyEasy" | "energyNormal" | "energyHard";
  subKey: "energySubEasy" | "energySubNormal" | "energySubHard";
};

export const NEW_TASK_ENERGIES: NewTaskEnergyOption[] = [
  {
    id: "low",
    color: "#10B981",
    haze: "rgba(16,185,129,0.10)",
    iconKind: "low",
    labelKey: "energyEasy",
    subKey: "energySubEasy",
  },
  {
    id: "medium",
    color: "#3B6BF7",
    haze: "rgba(59,107,247,0.10)",
    iconKind: "medium",
    labelKey: "energyNormal",
    subKey: "energySubNormal",
  },
  {
    id: "high",
    color: "#8B5CF6",
    haze: "rgba(139,92,246,0.10)",
    iconKind: "high",
    labelKey: "energyHard",
    subKey: "energySubHard",
  },
];

export const NEW_TASK_DURATION_PRESETS = [
  { labelKey: "dur15", value: 15 },
  { labelKey: "dur30", value: 30 },
  { labelKey: "dur60", value: 60 },
  { labelKey: "dur90", value: 90 },
] as const;

export type DurationValue = number | "custom";

export type DeadlinePickId = "none" | "today" | "tomorrow" | "custom";

export type ScheduleDatePickId = "none" | "today" | "tomorrow" | "custom";
