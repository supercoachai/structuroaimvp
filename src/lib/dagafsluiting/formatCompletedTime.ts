/** HH:MM in Europe/Amsterdam voor afgeronde taken in dagafsluiting. */
export function formatCompletedTimeAmsterdam(
  completedAt: string | null | undefined
): string {
  if (!completedAt) return "";
  try {
    const d = new Date(completedAt);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("nl-NL", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Amsterdam",
    });
  } catch {
    return "";
  }
}
