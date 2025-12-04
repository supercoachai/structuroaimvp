// Minimalistische herinneringen-engine (in-memory).
// Plant reminders voor de komende 24 uur; herroept en herplant bij datawijziging.

interface Task {
  id: string;
  title: string;
  dueAt?: string | null;
  done?: boolean;
  reminders?: number[];
  onNavigate?: (task: Task) => void;
}

interface ReminderEvent {
  at: number;
  type: "reminder" | "due";
  task: Task;
  minutes?: number;
}

const listeners = new Set<(payload: any) => void>();
let timers: NodeJS.Timeout[] = [];
let activeTaskId: string | null = null;
let activeTaskStartTime: number | null = null;
let comebackReminderTimer: NodeJS.Timeout | null = null;

export function onReminder(cb: (payload: any) => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notify(payload: any) {
  listeners.forEach((cb) => cb(payload));
  
  // Web Notifications (als beschikbaar en toegestaan)
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      const n = new Notification(payload.title || "Structuro", {
        body: payload.body || "Herinnering",
        tag: payload.id || undefined,
        silent: false,
        icon: "/favicon.ico" // Voeg een icoon toe
      });
      n.onclick = () => payload.onClick?.();
      
      // Auto-close na 10 seconden
      setTimeout(() => n.close(), 10000);
    } catch (error) {
      console.warn('Failed to show notification:', error);
      // Fallback: toon in console
      console.log('🔔 REMINDER:', payload.title, payload.body);
    }
  } else {
    // Fallback: toon in console en browser tab
    console.log('🔔 REMINDER:', payload.title, payload.body);
    
    // Update browser tab title als fallback
    const originalTitle = document.title;
    document.title = `🔔 ${payload.title}`;
    setTimeout(() => {
      document.title = originalTitle;
    }, 5000);
  }
}

function inQuietHours(d: Date) {
  const h = d.getHours();
  return h >= 22 || h < 7;
}

// Start een taak (voor transition reminders)
export function startTask(task: Task) {
  // Als er al een actieve taak is, stuur transition reminder
  if (activeTaskId && activeTaskId !== task.id) {
    notify({
      id: 'transition:' + activeTaskId,
      title: '🔄 Taakwissel',
      body: `Je wisselt naar: ${task.title}. Neem even een moment om te focussen.`,
      onClick: () => task.onNavigate?.(task),
    });
  }

  activeTaskId = task.id;
  activeTaskStartTime = Date.now();

  // Plan "kom terug" reminder na 5 minuten inactiviteit
  scheduleComebackReminder(task);
}

// Stop een taak
export function stopTask() {
  activeTaskId = null;
  activeTaskStartTime = null;
  if (comebackReminderTimer) {
    clearTimeout(comebackReminderTimer);
    comebackReminderTimer = null;
  }
}

// Plan "kom terug naar je taak" reminder
function scheduleComebackReminder(task: Task) {
  if (comebackReminderTimer) {
    clearTimeout(comebackReminderTimer);
  }

  // Na 5 minuten zonder activiteit
  comebackReminderTimer = setTimeout(() => {
    if (activeTaskId === task.id) {
      notify({
        id: 'comeback:' + task.id,
        title: '👋 Kom terug naar je taak',
        body: `${task.title} wacht op je. Je kunt dit!`,
        onClick: () => task.onNavigate?.(task),
      });
    }
  }, 5 * 60 * 1000); // 5 minuten
}

// Reset comeback timer bij activiteit
export function resetComebackTimer() {
  if (activeTaskId && comebackReminderTimer) {
    clearTimeout(comebackReminderTimer);
    const task = { id: activeTaskId, title: 'Huidige taak' } as Task;
    scheduleComebackReminder(task);
  }
}

export function scheduleReminders(tasks: Task[]) {
  // Clear oude timers (behalve comeback reminder)
  timers.forEach(clearTimeout);
  timers = [];

  const now = Date.now();
  const until = now + 24 * 60 * 60 * 1000;

  const events: ReminderEvent[] = [];
  tasks.forEach((t) => {
    if (!t.dueAt || t.done) return;
    const due = new Date(t.dueAt).getTime();
    (t.reminders || []).forEach((m) => {
      const at = due - m * 60 * 1000;
      if (at > now && at < until) events.push({ at, type: "reminder", task: t, minutes: m });
    });
    // "start"-ping exact op dueAt
    if (due > now && due < until) events.push({ at: due, type: "due", task: t });
  });

  // Debug logging
  console.log('🔔 Scheduling reminders:', events.length, 'events');
  events.forEach(e => {
    const when = new Date(e.at);
    console.log(`  - ${e.type}: ${e.task.title} at ${when.toLocaleString()}`);
  });

  // Dedup per 5 min window
  events.sort((a, b) => a.at - b.at);
  let lastAt = -Infinity;
  const deduped = events.filter((e) => {
    const ok = e.at - lastAt > 5 * 60 * 1000;
    if (ok) lastAt = e.at;
    return ok;
  });

  deduped.forEach((e) => {
    let when = new Date(e.at);
    if (inQuietHours(when)) when.setHours(7, 0, 0, 0);
    const delay = Math.max(0, when.getTime() - Date.now());
    
    console.log(`⏰ Setting timer for ${e.task.title}: ${delay}ms delay`);
    
    const id = setTimeout(() => {
      console.log(`🔔 Triggering reminder for: ${e.task.title}`);
      notify({
        id: e.task.id + ":" + e.type,
        title: e.type === "due" ? "Tijd voor: " + e.task.title : "Zo meteen: " + e.task.title,
        body:
          e.type === "due"
            ? "Begint nu."
            : `Over ${e.minutes} min • ${formatWhen(new Date(e.task.dueAt!))}`,
        onClick: () => e.task.onNavigate?.(e.task),
      });
    }, delay);
    timers.push(id);
  });
}

export function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

export function formatWhen(d: Date): string {
  const today = new Date();
  const t = new Date(d);
  const sameDay = t.toDateString() === today.toDateString();
  const opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
  const time = t.toLocaleTimeString([], opts);
  if (sameDay) return `vandaag ${time}`;
  const tomorrow = new Date(today); 
  tomorrow.setDate(today.getDate() + 1);
  if (t.toDateString() === tomorrow.toDateString()) return `morgen ${time}`;
  return t.toLocaleDateString() + " " + time;
}

// Transition reminder voor taakwissels (wordt aangeroepen bij taak start)
export function scheduleTransitionReminder(fromTask: Task, toTask: Task) {
  notify({
    id: 'transition:' + fromTask.id + '->' + toTask.id,
    title: '🔄 Tijd voor een nieuwe taak',
    body: `Je start nu met: ${toTask.title}. Focus!`,
    onClick: () => toTask.onNavigate?.(toTask),
  });
}

export function testReminder() {
  console.log('🧪 Testing reminder system...');
  
  // Test notificatie
  notify({
    id: 'test',
    title: 'Test Herinnering',
    body: 'Dit is een test om te controleren of herinneringen werken!',
    onClick: () => console.log('Test reminder clicked!')
  });
  
  // Test timer (5 seconden)
  const testTask = {
    id: 'test-task',
    title: 'Test Taak',
    dueAt: new Date(Date.now() + 5000).toISOString(),
    reminders: [1] // 1 minuut van tevoren
  };
  
  scheduleReminders([testTask]);
  console.log('⏰ Test reminder scheduled for 5 seconds from now');
}
