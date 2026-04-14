import { STRUCTURO_DAGSTART_COOKIE } from './dagstartCookie';

/** Alle bekende Structuro localStorage-keys (voor volledige data-wipe) */
export const STRUCTURO_STORAGE_KEYS = [
  'structuro_tasks',
  'structuro_daily_checkins',
  'structuro_user_name',
  'structuro_analytics_consent',
  'structuro_gamification_meta',
  'structuro_theme',
  'focus_duration',
  'focus_streak_5',
  'focus_streak_15',
  'focus_streak_25',
] as const;

// Utility functie om localStorage te resetten (voor debugging/testing)
export function clearAllStorage() {
  if (typeof window === 'undefined') return false;

  try {
    STRUCTURO_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    console.log('✅ Structuro localStorage cleared');
    return true;
  } catch (error) {
    console.error('Error clearing storage:', error);
    return false;
  }
}

/** Alle app-data wissen (instellingen: autonomie gebruiker). Herlaadt de pagina. */
export function wipeAllUserData(): boolean {
  if (typeof window === 'undefined') return false;
  const ok = clearAllStorage();
  try {
    document.cookie = `${STRUCTURO_DAGSTART_COOKIE}=; path=/; max-age=0`;
  } catch {
    /* ignore */
  }
  if (ok) window.location.href = '/';
  return ok;
}

// Verwijder ALLEEN taken (geen mock data, geen check-ins)
export function clearAllTasksOnly() {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem('structuro_tasks');
    console.log('✅ Alle taken verwijderd - schone start');
    // Refresh pagina om state te resetten
    window.location.reload();
    return true;
  } catch (error) {
    console.error('Error clearing tasks:', error);
    return false;
  }
}

// Reset en laad mock data opnieuw
export function resetAndLoadMockData() {
  if (typeof window === 'undefined') return;
  
  clearAllStorage();
  
  // Laad mock data opnieuw
  const { mockTasks } = require('./mockData');
  const { saveTasksToStorage } = require('./localStorageTasks');
  
  // Geef elke taak een uniek ID als die er niet is
  const tasksWithIds = mockTasks.map((task: any, index: number) => ({
    ...task,
    id: task.id || `task_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
    created_at: task.created_at || new Date().toISOString(),
    updated_at: task.updated_at || new Date().toISOString()
  }));
  
  saveTasksToStorage(tasksWithIds);
  console.log('✅ Mock data loaded');
  
  // Refresh pagina
  window.location.reload();
}
