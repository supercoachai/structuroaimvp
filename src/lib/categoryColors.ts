/**
 * Structuro Kleuren-Standaard: 4 vaste categorieën
 * Categorie = achtergrondkleur. Urgentie = modifier (icoon + rand).
 */
export type TaskCategory = 'work' | 'personal' | 'appointment' | 'health';

export const CATEGORIES: { value: TaskCategory; label: string; icon: string; color: string }[] = [
  { value: 'work', label: 'Werk', icon: '🔵', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'personal', label: 'Privé', icon: '🟢', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'appointment', label: 'Afspraak', icon: '🟣', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'health', label: 'Gezondheid', icon: '🩷', color: 'bg-pink-100 text-pink-800 border-pink-200' },
];

export function getCategoryColor(category: TaskCategory | string | null | undefined): string {
  const c = CATEGORIES.find((x) => x.value === category);
  return c?.color ?? 'bg-slate-100 text-slate-800 border-slate-200';
}
