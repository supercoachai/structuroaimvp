/** Profiel-/auth-snippers voor consequente weergavenaam in de UI. */

import type { User } from "@supabase/supabase-js";
import type { Locale } from "@/lib/i18n/types";

export type DisplayNameParts = {
  display_name?: string | null;
  preferred_name?: string | null;
  full_name?: string | null;
  email?: string | null;
};

function neutralGuest(locale: Locale): string {
  return locale === "en" ? "there" : "daar";
}

function firstToken(name: string): string {
  const t = name.trim();
  if (!t) return t;
  return t.split(/\s+/)[0] || t;
}

/**
 * Fallback-keten: voorkeursvelden uit profiel, e-mail lokaal deel, dan neutrale aanspraak (geen vaste "Gebruiker").
 */
export function getUserDisplayName(
  profile: DisplayNameParts | null | undefined,
  locale: Locale = "nl"
): string {
  if (!profile) return neutralGuest(locale);
  const fromProfile =
    (typeof profile.display_name === "string" && profile.display_name.trim()) ||
    (typeof profile.preferred_name === "string" && profile.preferred_name.trim()) ||
    (typeof profile.full_name === "string" && profile.full_name.trim()) ||
    "";
  if (fromProfile) return firstToken(fromProfile);
  const mail = typeof profile.email === "string" ? profile.email.trim() : "";
  if (mail.includes("@")) {
    const local = mail.split("@")[0]?.trim();
    if (local) return local;
  }
  return neutralGuest(locale);
}

/** Naam bij afronden onboarding: formulier eerst; anders metadata, e-mailprefix, dan neutraal. */
export function resolveOnboardingDisplayName(
  user: User,
  inputOrEmpty: string,
  locale: Locale
): string {
  const trimmed = inputOrEmpty.trim();
  if (trimmed) return trimmed.slice(0, 200);

  const m = user.user_metadata as Record<string, unknown> | undefined;
  const metaRaw = m?.full_name ?? m?.fullName ?? m?.name;
  const meta =
    typeof metaRaw === "string" && metaRaw.trim() ? metaRaw.trim().slice(0, 200) : "";
  if (meta) return meta;

  const mail = typeof user.email === "string" ? user.email.trim() : "";
  if (mail.includes("@")) {
    const local = mail.split("@")[0]?.trim();
    if (local) return local.slice(0, 200);
  }

  return neutralGuest(locale);
}
