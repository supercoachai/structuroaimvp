import { STRUCTURO_LOCALE_STORAGE_KEY, type Locale } from "./types";

export function readStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STRUCTURO_LOCALE_STORAGE_KEY);
    if (raw === "nl" || raw === "en") return raw;
  } catch {
    /* ignore */
  }
  return null;
}

/** Taal voor foutschermen buiten I18nProvider (ErrorBoundary, global-error). */
export function resolveClientLocale(): Locale {
  const stored = readStoredLocale();
  if (stored) return stored;
  if (typeof document !== "undefined") {
    const htmlLang = document.documentElement.lang.toLowerCase();
    if (htmlLang.startsWith("en")) return "en";
  }
  return "nl";
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
