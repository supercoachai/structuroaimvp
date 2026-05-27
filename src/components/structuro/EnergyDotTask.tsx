"use client";

import { ST_ENERGY_DOT, type StEnergyId } from '@/lib/structuro/energyTokens';

type EnergyDotTaskProps = {
  energy?: StEnergyId | string | null;
  size?: number;
};

export default function EnergyDotTask({ energy, size = 10 }: EnergyDotTaskProps) {
  const key = (energy && energy in ST_ENERGY_DOT ? energy : 'none') as StEnergyId;
  const k = ST_ENERGY_DOT[key];
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: k.color,
        boxShadow: `0 0 0 3px ${k.bg}`,
        flexShrink: 0,
        display: 'inline-block',
      }}
      aria-hidden
    />
  );
}
