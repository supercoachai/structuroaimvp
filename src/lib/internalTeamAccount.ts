/**
 * Interne teamaccounts: altijd app-toegang, nooit paywall.
 * Founder/team e-mailadressen die geen consument-trial volgen.
 */

const INTERNAL_TEAM_EMAILS = new Set([
  "info@structuro.eu",
  // Permanent gratis (gift): nooit paywall / card-trial checkout.
  "info@ellezorg.com",
  "elle.zorg@gmail.com",
]);

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

function pathnameOnly(path: string): string {
  const cut = path.split("?")[0] ?? path;
  return cut.split("#")[0] ?? cut;
}

/** Intern team hoort nooit op de paywall, ook niet via `next=/abonnement`. */
export function resolvePathForInternalTeam(
  email: string | null | undefined,
  nextPath: string
): string {
  if (!isInternalTeamAccount(email)) return nextPath;
  const path = pathnameOnly(nextPath);
  if (
    !path ||
    path === "/" ||
    path === "/abonnement" ||
    path.startsWith("/abonnement/")
  ) {
    return "/";
  }
  return nextPath;
}
