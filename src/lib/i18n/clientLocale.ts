import {
  STRUCTURO_LANG_LEGACY_STORAGE_KEY,
  STRUCTURO_LOCALE_STORAGE_KEY,
  type Locale,
} from "./types";

export function isLocale(v: string | null | undefined): v is Locale {
  return v === "nl" || v === "en";
}

function readStorageLocale(key: string): Locale | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (isLocale(raw)) return raw;
  } catch {
    /* ignore */
  }
  return null;
}

function urlLocaleFromParams(params: URLSearchParams): Locale | null {
  const fromUrl = params.get("lang") || params.get("locale");
  return isLocale(fromUrl) ? fromUrl : null;
}

/** Organic EU-bridge: /start, /registreren of /tiktok met structuro_eu-attributie. */
export function isOrganicEuAcquisitionUrl(
  pathname: string,
  params: URLSearchParams
): boolean {
  if (!/^\/(start|registreren|tiktok)(\/|$)/.test(pathname)) return false;
  const utm = params.get("utm_source") || "";
  const legacy = params.get("source") || "";
  if (utm === "tiktok" || legacy === "tiktok") return false;
  if (utm === "structuro_eu" || legacy === "structuro_eu") return true;
  // Kale /registreren = organische acquisitie (zelfde NL-default als structuro.eu-funnel).
  return pathname === "/registreren" || pathname.startsWith("/registreren/");
}

/** Eerste paint + I18nProvider: structuro.eu-funnel default NL, niet stale app-locale. */
export function resolveInitialLocale(
  pathname?: string,
  search?: string
): Locale {
  if (typeof window === "undefined") return "nl";

  const path = pathname ?? window.location.pathname;
  const params = new URLSearchParams(search ?? window.location.search);

  const fromUrl = urlLocaleFromParams(params);
  if (fromUrl) return fromUrl;

  if (isOrganicEuAcquisitionUrl(path, params)) {
    return readStorageLocale(STRUCTURO_LANG_LEGACY_STORAGE_KEY) ?? "nl";
  }

  return (
    readStorageLocale(STRUCTURO_LOCALE_STORAGE_KEY) ??
    readStorageLocale(STRUCTURO_LANG_LEGACY_STORAGE_KEY) ??
    "nl"
  );
}

export function readStoredLocale(): Locale | null {
  return readStorageLocale(STRUCTURO_LOCALE_STORAGE_KEY);
}

export function syncLocaleStorage(locale: Locale): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STRUCTURO_LOCALE_STORAGE_KEY, locale);
    localStorage.setItem(STRUCTURO_LANG_LEGACY_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}

/** Taal voor foutschermen buiten I18nProvider (ErrorBoundary, global-error). */
export function resolveClientLocale(): Locale {
  return resolveInitialLocale();
}

export function isEnglishClientLocale(): boolean {
  return resolveClientLocale() === "en";
}

export type ErrorUiCopy = {
  title: string;
  body: string;
  translatorNote: string;
  detailsLabel: string;
  refreshLabel: string;
  retryLabel: string;
};

const ERROR_UI: Record<Locale, ErrorUiCopy> = {
  nl: {
    title: "Er ging iets mis",
    body: "De app liep tegen een onverwachte fout aan. Vernieuw de pagina (F5, Cmd+R of het vernieuw-icoon in de browser).",
    translatorNote:
      "Zet automatische vertaling voor structuro.ai uit in je browser. Vertalers kunnen interactieve pagina's breken.",
    detailsLabel: "Technische details",
    refreshLabel: "Pagina vernieuwen",
    retryLabel: "Opnieuw proberen",
  },
  en: {
    title: "Something went wrong",
    body: "The app hit an unexpected error. Refresh the page (F5, Cmd+R, or your browser refresh button).",
    translatorNote:
      "If you use automatic translation for this site, turn it off for structuro.ai. Translators can break interactive pages.",
    detailsLabel: "Technical details",
    refreshLabel: "Refresh page",
    retryLabel: "Try again",
  },
};

export function getErrorUiCopy(): ErrorUiCopy {
  return ERROR_UI[resolveClientLocale()];
}

export function getRouteErrorUiCopy(): Pick<
  ErrorUiCopy,
  "title" | "body" | "refreshLabel" | "retryLabel"
> {
  const locale = resolveClientLocale();
  if (locale === "en") {
    return {
      title: ERROR_UI.en.title,
      body: "This page hit an unexpected error. Try again or refresh the page.",
      refreshLabel: ERROR_UI.en.refreshLabel,
      retryLabel: ERROR_UI.en.retryLabel,
    };
  }
  return {
    title: ERROR_UI.nl.title,
    body: "Deze pagina liep tegen een onverwachte fout aan. Probeer opnieuw of vernieuw de pagina.",
    refreshLabel: ERROR_UI.nl.refreshLabel,
    retryLabel: ERROR_UI.nl.retryLabel,
  };
}

/** Inline vóór React: zelfde regels als resolveInitialLocale + sync op organic EU. */
export function getLocaleBootstrapScript(): string {
  const localeKey = JSON.stringify(STRUCTURO_LOCALE_STORAGE_KEY);
  const legacyKey = JSON.stringify(STRUCTURO_LANG_LEGACY_STORAGE_KEY);
  return `(function(){try{var p=window.location.pathname;var q=new URLSearchParams(window.location.search||"");var lang=q.get("lang")||q.get("locale");var utm=q.get("utm_source")||"";var src=q.get("source")||"";var isAcq=/^\\/(start|registreren|tiktok)(\\/|$)/.test(p);var isReg=/^\\/registreren(\\/|$)/.test(p);var isEu=(isAcq&&(utm==="structuro_eu"||src==="structuro_eu")&&utm!=="tiktok"&&src!=="tiktok")||isReg;var locale="nl";if(lang==="en"||lang==="nl"){locale=lang;}else if(isEu){var landing=localStorage.getItem(${legacyKey});locale=landing==="en"||landing==="nl"?landing:"nl";}else{var stored=localStorage.getItem(${localeKey});if(stored==="en"||stored==="nl")locale=stored;else{var leg=localStorage.getItem(${legacyKey});if(leg==="en"||leg==="nl")locale=leg;}}document.documentElement.lang=locale;if(isEu||lang==="en"||lang==="nl"){localStorage.setItem(${localeKey},locale);localStorage.setItem(${legacyKey},locale);}}catch(e){}})();`;
}
