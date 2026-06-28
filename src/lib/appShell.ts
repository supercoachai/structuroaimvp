/** Routes zonder sidebar/header/dagstart-shell (login, onboarding, marketing). */
export function isBarePagePath(pathname: string | null): boolean {
  if (!pathname) return true;
  const barePrefixes = [
    '/login',
    '/registreren',
    '/tiktok',
    '/start',
    '/jasper',
    '/auth',
    '/onboarding',
    '/consent',
    '/welkom',
    '/abonnement',
    '/adhd-cafe',
    '/checkout-success',
    '/dev-reset',
    '/test',
    '/wachtlijst',
    '/inschrijven',
    '/privacy',
    '/terms',
    '/activiteit',
  ];
  return barePrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function shouldUseAppShell(pathname: string | null): boolean {
  return !isBarePagePath(pathname);
}
