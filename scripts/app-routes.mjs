/**
 * Canonieke routelijst voor smoke/verify (publiek, app-shell, API).
 * Uitbreiden bij nieuwe pagina's — verify faalt dan bewust tot je de route toevoegt.
 */

/** @typedef {'public' | 'app' | 'dev' | 'api'} RouteKind */

/**
 * @typedef {Object} AppRoute
 * @property {string} path
 * @property {RouteKind} kind
 * @property {number[]} [status] toegestane HTTP-statuscodes
 * @property {string[]} [needles] substring in HTML (case-insensitive), minstens één match
 * @property {boolean} [verifyChunks] fetch alle script/link chunks uit HTML (vangt 404 JS)
 * @property {string} [method] default GET
 */

/** @type {AppRoute[]} */
export const APP_ROUTES = [
  // —— Marketing & auth (publiek) ——
  { path: "/login", kind: "public", status: [200], needles: ["structuro"] },
  { path: "/registreren", kind: "public", status: [200], needles: ["registr"] },
  { path: "/registreren/plan", kind: "public", status: [200] },
  { path: "/tiktok", kind: "public", status: [200], needles: ["structuro"] },
  { path: "/start", kind: "public", status: [200], needles: ["structuro"] },
  { path: "/jasper", kind: "public", status: [200], needles: ["structuro", "jasper"] },
  { path: "/abonnement", kind: "public", status: [200, 307, 308] },
  { path: "/adhd-cafe", kind: "public", status: [200], needles: ["structuro"] },
  { path: "/welkom", kind: "public", status: [200] },
  { path: "/welkom/install", kind: "public", status: [200] },
  { path: "/onboarding", kind: "public", status: [200, 307, 308] },
  { path: "/consent", kind: "public", status: [200, 307, 308] },
  { path: "/checkout-success", kind: "public", status: [200] },
  { path: "/privacy", kind: "public", status: [200], needles: ["privacy"] },
  { path: "/terms", kind: "public", status: [200], needles: ["voorwaarden", "terms"] },
  { path: "/wachtlijst", kind: "public", status: [200, 307, 308] },
  { path: "/activiteit/admin", kind: "public", status: [200], needles: ["privé-dashboard", "inloggen"] },
  { path: "/activiteit/funnel", kind: "public", status: [200, 307, 308], needles: ["privé-dashboard", "inloggen", "structuro"] },
  { path: "/inschrijven", kind: "public", status: [200, 307, 308] },
  { path: "/uitleg", kind: "public", status: [200] },
  { path: "/auth/auth-code-error", kind: "public", status: [200] },
  { path: "/auth/wachtwoord-instellen", kind: "public", status: [200] },

  // —— App-shell (kernflows) ——
  { path: "/", kind: "app", status: [200, 307, 308], verifyChunks: true },
  { path: "/todo", kind: "app", status: [200, 307, 308], verifyChunks: true },
  { path: "/settings", kind: "app", status: [200, 307, 308], verifyChunks: true },
  { path: "/focus", kind: "app", status: [200, 307, 308], verifyChunks: true },
  { path: "/shutdown", kind: "app", status: [200, 307, 308], verifyChunks: true },
  { path: "/dagstart", kind: "app", status: [200, 307, 308], verifyChunks: true },
  { path: "/notificaties", kind: "app", status: [200, 307, 308], verifyChunks: true },

  // —— Dev-only (ok in dev-build, mag redirect in prod) ——
  { path: "/dev-reset", kind: "dev", status: [200, 307, 308] },
  { path: "/test-data", kind: "dev", status: [200, 307, 308] },
  { path: "/test", kind: "dev", status: [200, 307, 308] },

  // —— API (geen 500; 401/404/405 is ok) ——
  { path: "/api/trial/config", kind: "api", status: [200, 401, 404, 405] },
  { path: "/api/stripe/config", kind: "api", status: [200, 401, 404, 405, 503] },
  { path: "/api/posthog-error-test", kind: "api", status: [404] },
  { path: "/api/dev/signup", kind: "api", method: "POST", status: [404, 405] },
  { path: "/api/cron/expire-trials", kind: "api", status: [200, 401, 405] },
  {
    path: "/api/auth/request-password-reset",
    kind: "api",
    method: "POST",
    status: [200, 400, 429, 502, 503, 405],
  },
  {
    path: "/api/auth/complete-password-setup",
    kind: "api",
    method: "POST",
    status: [200, 401, 500, 405],
  },
];

/** Teksten die wijzen op een kapotte pagina in HTML. */
export const FORBIDDEN_HTML_MARKERS = [
  "internal server error",
  "application error: a client-side exception",
  "application error: a server-side exception",
  "unhandled runtime error",
  "__webpack_modules__",
  "cannot find module",
];
