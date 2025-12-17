// Zeer simpele parser voor NL zinnen: "morgen 15:00", "over 2 uur", "di 08:30"

const weekdays = ["zo", "ma", "di", "wo", "do", "vr", "za"];

export function parseWhen(input: string): Date | null {
  const s = input.trim().toLowerCase();
  
  // over X min/uur
  let m = s.match(/^over\s+(\d+)\s*(min|minute|minuten|uur|u)$/);
  if (m) {
    const n = parseInt(m[1], 10);
    const ms = m[2].startsWith("u") ? n * 60 : n;
    const d = new Date(Date.now() + ms * 60 * 1000);
    return d;
  }
  
  // morgen HH:MM
  m = s.match(/^morgen(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (m) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setSeconds(0, 0);
    d.setHours(m[1] ? +m[1] : 9, m[2] ? +m[2] : 0);
    return d;
  }
  
  // vandaag HH:MM
  m = s.match(/^vandaag\s+(\d{1,2}):(\d{2})$/);
  if (m) {
    const d = new Date();
    d.setSeconds(0, 0);
    d.setHours(+m[1], +m[2]);
    return d;
  }
  
  // di 08:30
  m = s.match(/^([a-z]{2})\s+(\d{1,2}):(\d{2})$/);
  if (m) {
    const idx = weekdays.indexOf(m[1]);
    if (idx !== -1) {
      const now = new Date();
      const d = new Date(now);
      const delta = (idx - now.getDay() + 7) % 7 || 7;
      d.setDate(now.getDate() + delta);
      d.setSeconds(0, 0);
      d.setHours(+m[2], +m[3]);
      return d;
    }
  }
  
  // dd-mm HH:MM
  m = s.match(/^(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})$/);
  if (m) {
    const d = new Date();
    d.setMonth(+m[2] - 1, +m[1]);
    d.setHours(+m[3], +m[4], 0, 0);
    return d;
  }
  
  return null; // geen match
}
