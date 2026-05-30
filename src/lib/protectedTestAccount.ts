/**
 * Beschermd testaccount – data mag nooit gewist worden tijdens development.
 * Zet NEXT_PUBLIC_PROTECTED_TEST_ACCOUNT_EMAIL in .env.local met het email van je testaccount.
 */
export function isProtectedTestAccount(email: string | null | undefined): boolean {
  const protectedEmail = process.env.NEXT_PUBLIC_PROTECTED_TEST_ACCOUNT_EMAIL?.trim();
  if (!email?.trim() || !protectedEmail) return false;
  return email.trim().toLowerCase() === protectedEmail.toLowerCase();
}
