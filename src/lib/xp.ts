export type Difficulty = 'low' | 'medium' | 'high';

export function xpForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'low':
      return 50;
    case 'medium':
      return 100;
    case 'high':
      return 200;
    default:
      return 100;
  }
}

export function getTaskDifficulty(task: any): Difficulty {
  const v = (task?.energyLevel || 'medium') as string;
  if (v === 'low' || v === 'medium' || v === 'high') return v;
  return 'medium';
}

export function xpForTask(task: any): number {
  return xpForDifficulty(getTaskDifficulty(task));
}

export const XP_PER_LEVEL = 500;
export const LEVELS_PER_PRESTIGE = 30;
export const MAX_PRESTIGES = 15;
export const XP_PER_PRESTIGE = XP_PER_LEVEL * LEVELS_PER_PRESTIGE;

export function levelForTotalXp(totalXp: number): number {
  const safe = Math.max(0, Math.floor(totalXp || 0));
  return Math.floor(safe / XP_PER_LEVEL) + 1;
}

export function progressWithinLevel(totalXp: number): { level: number; xpIntoLevel: number; xpForNextLevel: number } {
  const level = levelForTotalXp(totalXp);
  const base = (level - 1) * XP_PER_LEVEL;
  const xpIntoLevel = Math.max(0, totalXp - base);
  return { level, xpIntoLevel, xpForNextLevel: XP_PER_LEVEL };
}

export function prestigeForTotalXp(totalXp: number): number {
  const safe = Math.max(0, Math.floor(totalXp || 0));
  return Math.min(MAX_PRESTIGES, Math.floor(safe / XP_PER_PRESTIGE) + 1);
}

export function levelInPrestigeForTotalXp(totalXp: number): number {
  const safe = Math.max(0, Math.floor(totalXp || 0));
  const xpIntoPrestige = safe % XP_PER_PRESTIGE;
  return Math.floor(xpIntoPrestige / XP_PER_LEVEL) + 1; // 1..30
}

export type Trophy = {
  id: string;
  name: string;
  description: string;
  icon: string;
  requiredTotalXp: number;
  xpReward: number; // bonus/booster XP (awarded once)
};

export const TROPHIES: Trophy[] = [
  { id: 'trophy_first_50', name: 'Eerste XP', description: 'Je eerste 50 XP verdiend.', icon: '🌱', requiredTotalXp: 50, xpReward: 25 },
  { id: 'trophy_500', name: 'Level 2!', description: '500 XP bereikt.', icon: '🥈', requiredTotalXp: 500, xpReward: 100 },
  { id: 'trophy_1500', name: 'Goed bezig', description: '1500 XP bereikt.', icon: '🏅', requiredTotalXp: 1500, xpReward: 250 },
  { id: 'trophy_3000', name: 'Focus Machine', description: '3000 XP bereikt.', icon: '🏆', requiredTotalXp: 3000, xpReward: 500 },
  { id: 'trophy_5000', name: 'Planner Pro', description: '5000 XP bereikt.', icon: '👑', requiredTotalXp: 5000, xpReward: 1000 },
];

export function unlockedTrophies(totalXp: number): Trophy[] {
  return TROPHIES.filter(t => totalXp >= t.requiredTotalXp);
}

export type PrestigeBadge = {
  prestige: number; // 1..15
  name: string;
  icon: string;
  xpReward: number; // bonus XP (awarded once when prestige is reached)
};

export const PRESTIGE_BADGES: PrestigeBadge[] = Array.from({ length: MAX_PRESTIGES }, (_, i) => {
  const p = i + 1;
  // scaling: later prestiges give bigger boosts
  const xpReward = 250 + (p - 1) * 100; // 250..1650
  const names = [
    'Starter', 'Planner', 'Organizer', 'Momentum', 'Focus', 'Flow',
    'Strategist', 'Architect', 'Captain', 'Mastermind', 'Zen',
    'Legend', 'Icon', 'Mythic', 'Ultimate'
  ];
  const icons = ['🥉','🥈','🥇','⭐','🔥','⚡','🎯','🏗️','🧭','🧠','🧘','🏆','👑','💎','🌌'];
  return { prestige: p, name: `${p}e Prestige · ${names[i]}`, icon: icons[i] || '⭐', xpReward };
});

export function getPrestigeBadge(prestige: number): PrestigeBadge | undefined {
  return PRESTIGE_BADGES.find(b => b.prestige === prestige);
}


