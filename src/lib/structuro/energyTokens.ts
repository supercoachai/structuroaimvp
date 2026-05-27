export type StEnergyId = 'laag' | 'gem' | 'hoog' | 'none';

export const ST_ENERGY_DOT: Record<
  StEnergyId,
  { color: string; label: string; bg: string }
> = {
  laag: { color: '#10B981', label: 'Laag', bg: '#CCFBF1' },
  gem: { color: '#3B6BF7', label: 'Normaal', bg: '#DBEAFE' },
  hoog: { color: '#8B5CF6', label: 'Hoog', bg: '#EDE9FE' },
  none: { color: '#B6BECF', label: 'Geen', bg: '#EEF1F5' },
};

export const ST_ENERGIES = [
  { id: 'laag' as const, label: 'Laag', icon: 'low' as const, color: '#10B981' },
  { id: 'gem' as const, label: 'Normaal', icon: 'medium' as const, color: '#3B6BF7' },
  { id: 'hoog' as const, label: 'Hoog', icon: 'high' as const, color: '#8B5CF6' },
];

export function appEnergyToSt(energy?: string | null): StEnergyId {
  if (energy === 'low' || energy === 'laag') return 'laag';
  if (energy === 'high' || energy === 'hoog') return 'hoog';
  if (energy === 'medium' || energy === 'gem' || energy === 'gemidd' || energy === 'normaal')
    return 'gem';
  return 'none';
}

export function stEnergyToApp(energy: StEnergyId): 'low' | 'medium' | 'high' {
  if (energy === 'laag') return 'low';
  if (energy === 'hoog') return 'high';
  return 'medium';
}
