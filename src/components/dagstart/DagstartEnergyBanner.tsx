"use client";

import { energyBannerStyle, type DagstartEnergyValue } from './DagstartEnergyCards';

type DagstartEnergyBannerProps = {
  energy: DagstartEnergyValue;
  children: string;
};

export default function DagstartEnergyBanner({ energy, children }: DagstartEnergyBannerProps) {
  const tone = energyBannerStyle(energy);

  return (
    <div
      className="mt-4 rounded-2xl px-4 py-3.5 text-center"
      style={{
        background: tone.background,
        color: tone.color,
        fontSize: 14,
        fontWeight: 500,
        lineHeight: 1.45,
      }}
    >
      {children}
    </div>
  );
}
