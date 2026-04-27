"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { BUNDLES } from "./bundles";
import { resolveMessage } from "./resolve";
import {
  STRUCTURO_LOCALE_STORAGE_KEY,
  type Locale,
  SUPPORTED_LOCALES,
} from "./types";

function isLocale(v: string | null): v is Locale {
  return v === "nl" || v === "en";
}

function interpolate(
  template: string,
  vars?: Record<string, string>
): string {
  if (!vars) return template;
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(v);
  }
  return out;
}

type I18nContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: string, vars?: Record<string, string>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("nl");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STRUCTURO_LOCALE_STORAGE_KEY);
      if (isLocale(raw)) setLocaleState(raw);
    } catch {
      /* ignore */
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STRUCTURO_LOCALE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = next === "en" ? "en" : "nl";
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = locale === "en" ? "en" : "nl";
  }, [locale]);

  const t = useCallback(
    (key: string, vars?: Record<string, string>) => {
      const raw = resolveMessage(BUNDLES[locale], key);
      return interpolate(raw, vars);
    },
    [locale]
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  );

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used inside I18nProvider");
  }
  return ctx;
}

export function useOptionalI18n(): I18nContextValue | null {
  return useContext(I18nContext);
}

export { SUPPORTED_LOCALES };
