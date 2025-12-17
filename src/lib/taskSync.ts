// Centrale synchronisatie voor taken tussen alle componenten
// Gebruikt localStorage events om alle componenten automatisch te updaten

type TaskUpdateListener = () => void;

const listeners = new Set<TaskUpdateListener>();

// Luister naar localStorage changes (van andere tabs/windows)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'structuro_tasks' && e.newValue) {
      // Notify alle listeners dat taken zijn veranderd
      listeners.forEach(listener => listener());
    }
  });
}

// Custom event voor same-tab updates
const TASK_UPDATE_EVENT = 'structuro_tasks_updated';

export function subscribeToTaskUpdates(listener: TaskUpdateListener): () => void {
  listeners.add(listener);
  
  // Luister ook naar custom events (voor same-tab updates)
  const handleCustomEvent = () => listener();
  window.addEventListener(TASK_UPDATE_EVENT, handleCustomEvent);
  
  // Return unsubscribe functie
  return () => {
    listeners.delete(listener);
    window.removeEventListener(TASK_UPDATE_EVENT, handleCustomEvent);
  };
}

export function notifyTaskUpdate(): void {
  // Dispatch custom event voor same-tab updates
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TASK_UPDATE_EVENT));
  }
}
