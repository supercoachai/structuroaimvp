// Utility functie om localStorage te resetten (voor debugging/testing)
export function clearAllStorage() {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem('structuro_tasks');
    localStorage.removeItem('structuro_daily_checkins');
    console.log('✅ localStorage cleared');
    return true;
  } catch (error) {
    console.error('Error clearing storage:', error);
    return false;
  }
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
