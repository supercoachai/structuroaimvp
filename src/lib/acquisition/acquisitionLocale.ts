import type { Locale } from "@/lib/i18n/types";

function isLocale(v: string | null | undefined): v is Locale {
  return v === "nl" || v === "en";
}

/** True when the first preferred language in Accept-Language is English. */
export function prefersEnglishFromAcceptLanguage(
  header: string | null | undefined
): boolean {
  if (!header) return false;
  const first = header.split(",")[0]?.trim().toLowerCase() ?? "";
  return first.startsWith("en");
}

export function resolveAcquisitionLocale(params: {
  langParam?: string | null;
  acceptLanguage?: string | null;
}): Locale {
  const lang = params.langParam?.trim();
  if (isLocale(lang)) {
    return lang;
  }
  if (prefersEnglishFromAcceptLanguage(params.acceptLanguage)) {
    return "en";
  }
  return "nl";
}
