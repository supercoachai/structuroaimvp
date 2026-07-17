/**
 * Interne teamaccounts: altijd app-toegang, nooit paywall.
 * Founder/team e-mailadressen die geen consument-trial volgen.
 */

const INTERNAL_TEAM_EMAILS = new Set(["info@structuro.eu"]);

function normalizeEmailList(raw: string | undefined): Set<string> {
  const out = new Set<string>();
  if (!raw?.trim()) return out;
  for (const part of raw.split(",")) {
    const e = part.trim().toLowerCase();
    if (e) out.add(e);
  }
  return out;
}

const EXTRA_INTERNAL_EMAILS = normalizeEmailList(
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_INTERNAL_ACCOUNT_EMAILS
    : undefined
);

export function isInternalTeamAccount(
  email: string | null | undefined
): boolean {
  if (!email?.trim()) return false;
  const lower = email.trim().toLowerCase();
  return INTERNAL_TEAM_EMAILS.has(lower) || EXTRA_INTERNAL_EMAILS.has(lower);
}
