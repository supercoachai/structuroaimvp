export type GamificationMeta = {
  bonusXp: number;
  awardedTrophyIds: string[];
  awardedPrestiges: number[]; // 1..15
};

const STORAGE_KEY = 'structuro_gamification_meta';

export function loadGamificationMeta(): GamificationMeta {
  if (typeof window === 'undefined') {
    return { bonusXp: 0, awardedTrophyIds: [], awardedPrestiges: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { bonusXp: 0, awardedTrophyIds: [], awardedPrestiges: [] };
    const parsed = JSON.parse(raw);
    return {
      bonusXp: typeof parsed?.bonusXp === 'number' ? parsed.bonusXp : 0,
      awardedTrophyIds: Array.isArray(parsed?.awardedTrophyIds) ? parsed.awardedTrophyIds : [],
      awardedPrestiges: Array.isArray(parsed?.awardedPrestiges) ? parsed.awardedPrestiges : [],
    };
  } catch {
    return { bonusXp: 0, awardedTrophyIds: [], awardedPrestiges: [] };
  }
}

export function saveGamificationMeta(meta: GamificationMeta): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
}

export function awardBonusXp(meta: GamificationMeta, amount: number): GamificationMeta {
  const gain = Math.max(0, Math.floor(amount || 0));
  if (!gain) return meta;
  return { ...meta, bonusXp: (meta.bonusXp || 0) + gain };
}


