"use client";

import { useState } from 'react';
import EnergyIcon, { type EnergyIconKind } from '@/components/structuro/EnergyIcon';
import { ST_ENERGY_DOT, stEnergyToApp, type StEnergyId } from '@/lib/structuro/energyTokens';

type DagstartEnergyStripProps = {
  value: 'low' | 'medium' | 'high' | null;
  onChange: (value: 'low' | 'medium' | 'high') => void;
  labels: {
    low: string;
    medium: string;
    high: string;
  };
  subs?: {
    low: string;
    medium: string;
    high: string;
  };
};

const OPTS: {
  id: StEnergyId;
  app: 'low' | 'medium' | 'high';
  icon: EnergyIconKind;
  labelKey: 'low' | 'medium' | 'high';
}[] = [
  { id: 'laag', app: 'low', icon: 'low', labelKey: 'low' },
  { id: 'gem', app: 'medium', icon: 'medium', labelKey: 'medium' },
  { id: 'hoog', app: 'high', icon: 'high', labelKey: 'high' },
];

export default function DagstartEnergyStrip({
  value,
  onChange,
  labels,
  subs,
}: DagstartEnergyStripProps) {
  const activeSt = value === 'low' ? 'laag' : value === 'high' ? 'hoog' : value === 'medium' ? 'gem' : null;
  const [hovered, setHovered] = useState<StEnergyId | null>(null);

  return (
    <div
      className="grid grid-cols-3 gap-1.5 rounded-[14px] border p-1.5"
      style={{
        background: 'var(--st-surface-2)',
        borderColor: 'var(--st-line)',
        boxShadow: '0 1px 2px rgba(14,23,48,0.03) inset',
      }}
    >
      {OPTS.map((opt) => {
        const active = activeSt === opt.id;
        const highlighted = active || hovered === opt.id;
        const tone = ST_ENERGY_DOT[opt.id];
        const sub = subs?.[opt.labelKey];

        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.app)}
            onMouseEnter={() => setHovered(opt.id)}
            onMouseLeave={() => setHovered(null)}
            className="flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-[10px] border-0 bg-transparent px-2 py-2.5 text-center transition-all duration-150"
            style={{
              background: active ? 'white' : highlighted ? 'rgba(255,255,255,0.72)' : 'transparent',
              boxShadow: active
                ? '0 0 0 0.5px rgba(14,23,48,0.08), 0 1px 0 rgba(255,255,255,0.6) inset, 0 2px 6px rgba(14,23,48,0.06), 0 8px 18px -6px rgba(14,23,48,0.10)'
                : highlighted
                  ? '0 0 0 0.5px rgba(14,23,48,0.06), 0 2px 8px -4px rgba(14,23,48,0.08)'
                  : 'none',
              transform: highlighted ? 'translateY(-1px)' : 'none',
            }}
          >
            <span className="flex items-center justify-center gap-2">
              <EnergyIcon
                kind={opt.icon}
                size={13}
                color={highlighted ? tone.color : 'var(--st-muted)'}
              />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: active ? 600 : highlighted ? 600 : 500,
                  color: highlighted ? 'var(--st-ink)' : 'var(--st-muted)',
                }}
              >
                {labels[opt.labelKey]}
              </span>
            </span>
            {sub ? (
              <span
                style={{
                  fontSize: 11,
                  color: highlighted ? 'var(--st-muted)' : 'var(--st-muted-2)',
                  lineHeight: 1.2,
                }}
              >
                {sub}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export { stEnergyToApp };
