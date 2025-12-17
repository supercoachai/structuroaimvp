// Cleanup functie om duplicaten te verwijderen uit localStorage
import { getTasksFromStorage, saveTasksToStorage, LocalTask } from './localStorageTasks';

export function cleanupDuplicateTasks(): { removed: number; kept: number } {
  if (typeof window === 'undefined') return { removed: 0, kept: 0 };
  
  try {
    const tasks = getTasksFromStorage();
    const uniqueTasksMap = new Map<string, LocalTask>();
    let duplicatesRemoved = 0;
    
    tasks.forEach((task: LocalTask) => {
      if (!task.id) {
        // Taken zonder ID: gebruik titel + source als fallback
        const fallbackKey = `${task.title}-${task.source || 'regular'}-${task.created_at || ''}`;
        if (!uniqueTasksMap.has(fallbackKey)) {
          uniqueTasksMap.set(fallbackKey, task);
        } else {
          duplicatesRemoved++;
        }
      } else {
        // Taken met ID: behoud meest recente versie
        const existing = uniqueTasksMap.get(task.id);
        if (!existing) {
          uniqueTasksMap.set(task.id, task);
        } else {
          // Vergelijk updated_at en behoud meest recente
          const existingDate = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
          const newDate = task.updated_at ? new Date(task.updated_at).getTime() : 0;
          
          if (newDate > existingDate) {
            uniqueTasksMap.set(task.id, task);
            duplicatesRemoved++;
          } else {
            duplicatesRemoved++;
          }
        }
      }
    });
    
    const uniqueTasks = Array.from(uniqueTasksMap.values());
    
    if (duplicatesRemoved > 0) {
      saveTasksToStorage(uniqueTasks);
    }
    
    return { removed: duplicatesRemoved, kept: uniqueTasks.length };
  } catch (error) {
    console.error('Error cleaning up duplicates:', error);
    return { removed: 0, kept: 0 };
  }
}
