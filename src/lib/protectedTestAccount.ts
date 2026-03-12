/**
 * Beschermd testaccount – data mag nooit gewist worden tijdens development.
 * Zet NEXT_PUBLIC_PROTECTED_TEST_ACCOUNT_EMAIL in .env.local met het email van je testaccount.
 */
export const PROTECTED_TEST_ACCOUNT_EMAIL =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_PROTECTED_TEST_ACCOUNT_EMAIL) ||
  '';

export function isProtectedTestAccount(email: string | null | undefined): boolean {
  if (!email?.trim() || !PROTECTED_TEST_ACCOUNT_EMAIL) return false;
  return email.trim().toLowerCase() === PROTECTED_TEST_ACCOUNT_EMAIL.trim().toLowerCase();
}
