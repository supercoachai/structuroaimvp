/** Routes zonder sidebar/header/dagstart-shell (login, onboarding, marketing, live v2-shell). */
export function isBarePagePath(pathname: string | null): boolean {
  if (!pathname) return true;
  const barePrefixes = [
    '/login',
    '/registreren',
    '/tiktok',
    '/instagram',
    '/social',
    '/start',
    '/jasper',
    '/auth',
    '/onboarding',
    '/onboardingpro',
    '/v2',
    '/dump',
    '/stop-abonnement',
    '/dagstart',
    '/todo',
    '/focus',
    '/shutdown',
    '/settings',
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
  // Live home is ook bare (v2-shell), niet v1 AppLayout.
  if (pathname === '/') return true;
  return barePrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function shouldUseAppShell(pathname: string | null): boolean {
  return !isBarePagePath(pathname);
}
