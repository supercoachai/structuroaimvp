const HOME_TZ = "Europe/Amsterdam";

/** Datum-eyebrow zoals home-richting B: "Maandag 1 september". */
export function formatV2HomeDateLabel(date: Date, locale: string): string {
  const tag = locale === "en" ? "en-GB" : "nl-NL";
  const raw = date.toLocaleDateString(tag, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: HOME_TZ,
  });
  if (!raw) return "";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** Klok voor "Dag afgesloten om 21:40". */
export function formatV2HomeClock(
  iso: string | null | undefined,
  locale: string,
): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString(locale === "en" ? "en-GB" : "nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: HOME_TZ,
  });
}
