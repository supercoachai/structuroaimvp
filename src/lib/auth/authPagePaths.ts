type SearchParamsLike =
  | { get(name: string): string | null; toString(): string }
  | null
  | undefined;

function buildAuthHref(
  path: "/login" | "/registreren",
  searchParams: SearchParamsLike,
  omit: string[]
): string {
  const params = new URLSearchParams(searchParams?.toString() ?? "");
  for (const key of omit) {
    params.delete(key);
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Behoud utm/source voor dezelfde story-presentatie op /login. */
export function buildLoginHref(searchParams: SearchParamsLike): string {
  return buildAuthHref("/login", searchParams, [
    "signup",
    "signin",
    "herstel",
    "wachtwoord",
    "checkout",
  ]);
}

/** Behoud utm/source bij terug naar registreren vanaf login of signin-modus. */
export function buildRegistrerenHref(searchParams: SearchParamsLike): string {
  return buildAuthHref("/registreren", searchParams, [
    "signup",
    "signin",
    "next",
    "herstel",
    "checkout",
    "wachtwoord",
  ]);
}

/** Inloggen in dezelfde story-shell als signup (geen oude /login-stijl). */
export function buildRegistrerenSignInHref(searchParams: SearchParamsLike): string {
  const params = new URLSearchParams(searchParams?.toString() ?? "");
  params.set("signin", "1");
  params.delete("signup");
  params.delete("herstel");
  params.delete("wachtwoord");
  params.delete("checkout");
  const qs = params.toString();
  return qs ? `/registreren?${qs}` : "/registreren?signin=1";
}
