import type { V2Energy } from "./V2Context";

export type V2EnergyMeta = {
  value: V2Energy;
  label: string;
  level: 1 | 2 | 3;
  /** Vriendelijke orb/pill-kleur per energieniveau. */
  color: string;
};

/**
 * Eén bron voor energie-kleuren (propose + energy step).
 * high = helder groen; enough = kalm teal; low = zachte sage.
 */
export const V2_ENERGY_META: V2EnergyMeta[] = [
  { value: "low", label: "Laag", level: 1, color: "#7BA89A" },
  { value: "enough", label: "Genoeg", level: 2, color: "#2D7A6E" },
  { value: "high", label: "Hoog", level: 3, color: "#3CB371" },
];

/** Default orb wanneer nog geen energie gekozen (genoeg/teal). */
export const V2_ENERGY_DEFAULT_ORB =
  V2_ENERGY_META.find((m) => m.value === "enough")?.color ?? "#2D7A6E";

export function v2EnergyOrbColor(energy: V2Energy | null | undefined): string {
  if (!energy) return V2_ENERGY_DEFAULT_ORB;
  return V2_ENERGY_META.find((m) => m.value === energy)?.color ?? V2_ENERGY_DEFAULT_ORB;
}
