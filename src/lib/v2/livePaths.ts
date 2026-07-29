/**
 * Canonieke app-paden na v2→root cutover.
 * `/v2/*` blijft alleen als legacy-redirect + lab (`/v2`, `/v2/jasper`).
 * Statische assets (`/v2/logo-mark.png`) en `/api/v2/*` blijven onder /v2.
 */

export const livePaths = {
  home: "/",
  dagstart: "/dagstart",
  onboarding: "/onboarding",
  login: "/login",
  register: "/registreren",
  abonnement: "/abonnement",
  stopAbonnement: "/stop-abonnement",
  settings: "/settings",
  todo: "/todo",
  focus: "/focus",
  shutdown: "/shutdown",
  dump: "/dump",
  install: "/welkom/install",
  privacy: "/privacy",
  terms: "/terms",
  jasper: "/jasper",
} as const;

export type LivePathKey = keyof typeof livePaths;

/** Shell-routes die V2Provider + bare layout krijgen (geen v1 AppLayout). */
export const V2_LIVE_SHELL_PATHS = [
  livePaths.home,
  livePaths.dagstart,
  livePaths.onboarding,
  livePaths.login,
  livePaths.register,
  livePaths.abonnement,
  livePaths.stopAbonnement,
  livePaths.settings,
  livePaths.todo,
  livePaths.focus,
  livePaths.shutdown,
  livePaths.dump,
  livePaths.install,
  livePaths.privacy,
  livePaths.terms,
] as const;

export function isV2LiveShellPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  // Exact home
  if (pathname === "/") return true;
  for (const p of V2_LIVE_SHELL_PATHS) {
    if (p === "/") continue;
    if (pathname === p || pathname.startsWith(`${p}/`)) return true;
  }
  // Legacy /v2 app routes (vóór redirect) ook als shell behandelen
  if (pathname === "/v2" || pathname.startsWith("/v2/")) {
    if (pathname === "/v2" || pathname === "/v2/" || pathname.startsWith("/v2/jasper")) {
      return true; // lab ook v2-root layout
    }
    return true;
  }
  return false;
}

/**
 * Legacy `/v2/...` → canoniek pad. Lab-index en jasper blijven onder /v2.
 * Onbekende /v2-subpaden → home.
 */
export function mapLegacyV2PathToLive(pathname: string): string {
  if (pathname === "/v2" || pathname === "/v2/") return "/v2";
  if (pathname === "/v2/jasper" || pathname.startsWith("/v2/jasper/")) {
    return pathname; // lab blijft
  }

  const table: Array<[string, string]> = [
    ["/v2/stop-abonnement", livePaths.stopAbonnement],
    ["/v2/onboarding", livePaths.onboarding],
    ["/v2/abonnement", livePaths.abonnement],
    ["/v2/settings", livePaths.settings],
    ["/v2/shutdown", livePaths.shutdown],
    ["/v2/dagstart", livePaths.dagstart],
    ["/v2/install", livePaths.install],
    ["/v2/privacy", livePaths.privacy],
    ["/v2/register", livePaths.register],
    ["/v2/focus", livePaths.focus],
    ["/v2/login", livePaths.login],
    ["/v2/terms", livePaths.terms],
    ["/v2/home", livePaths.home],
    ["/v2/todo", livePaths.todo],
    ["/v2/dump", livePaths.dump],
  ];

  for (const [from, to] of table) {
    if (pathname === from || pathname.startsWith(`${from}/`)) {
      const rest = pathname.slice(from.length);
      if (to === "/") return rest ? `/${rest.replace(/^\//, "")}` : "/";
      return `${to}${rest}`;
    }
  }

  if (pathname.startsWith("/v2/")) return livePaths.home;
  return pathname;
}
