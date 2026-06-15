/** Basisformaat voor signup (magic link). Striktere deliverability-check doet Supabase server-side. */
const SIGNUP_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeSignupEmail(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || trimmed.length > 254) return null;
  if (!SIGNUP_EMAIL_REGEX.test(trimmed)) return null;
  return trimmed;
}

export function isSignupEmailFormatValid(raw: string): boolean {
  return normalizeSignupEmail(raw) !== null;
}
