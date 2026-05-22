import { getClockHourAmsterdam } from "@/lib/dagstartCookie";
import { getDayStartQuoteForLocale } from "@/lib/dayStartQuotes";

export type DayStartTimeOfDay = "morning" | "afternoon" | "evening";

export function getDayStartTimeOfDay(now: Date = new Date()): DayStartTimeOfDay {
  const h = getClockHourAmsterdam(now);
  if (h >= 6 && h < 12) return "morning";
  if (h >= 12 && h < 18) return "afternoon";
  return "evening";
}

export function firstNameFromDisplayName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

export function firstNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const part = (local.split(/[._+-]/)[0] ?? local).trim();
  if (!part) return "";
  return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
}

/** preferred_name → display_name → eerste deel e-mail */
export function resolveDayStartFirstName(opts: {
  preferredName?: string | null;
  displayName?: string | null;
  email?: string | null;
}): string {
  const preferred = opts.preferredName?.trim();
  if (preferred) return firstNameFromDisplayName(preferred);

  const display = opts.displayName?.trim();
  if (display) return firstNameFromDisplayName(display);

  const email = opts.email?.trim();
  if (email) {
    const fromEmail = firstNameFromEmail(email);
    if (fromEmail) return fromEmail;
  }

  return "";
}

export function getDayStartQuote(locale: string, now: Date = new Date()): string {
  return getDayStartQuoteForLocale(locale, now);
}
