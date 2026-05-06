/** Kalenderdag YYYY-MM-DD in Europe/Amsterdam (consistent met dagstart/shutdown). */
export function getAmsterdamDateString(date: Date = new Date()): string {
  try {
    return date.toLocaleDateString("en-CA", { timeZone: "Europe/Amsterdam" });
  } catch {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
}
