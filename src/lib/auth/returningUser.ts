const RETURNING_USER_KEY = "structuro_returning_user";
const LAST_AUTH_METHOD_KEY = "structuro_last_auth_method";

/** Laatst gebruikte inlogmethode (geen PII): bepaalt het primaire pad bij terugkeer. */
export type LastAuthMethod =
  | "google"
  | "azure"
  | "apple"
  | "magic"
  | "password"
  | "passkey";

const VALID_METHODS: ReadonlySet<string> = new Set<LastAuthMethod>([
  "google",
  "azure",
  "apple",
  "magic",
  "password",
  "passkey",
]);

/** Na succesvolle login/signup: passkey tonen bij volgende bezoek. */
export function markReturningUser(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RETURNING_USER_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function isReturningUser(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(RETURNING_USER_KEY) === "1";
  } catch {
    return false;
  }
}

/** Onthoud welke methode het laatst werkte zodat we die bovenaan kunnen tonen. */
export function setLastAuthMethod(method: LastAuthMethod): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LAST_AUTH_METHOD_KEY, method);
  } catch {
    /* ignore */
  }
}

export function getLastAuthMethod(): LastAuthMethod | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAST_AUTH_METHOD_KEY);
    if (raw && VALID_METHODS.has(raw)) {
      return raw as LastAuthMethod;
    }
    return null;
  } catch {
    return null;
  }
}
