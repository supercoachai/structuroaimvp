import type { Locale } from "@/lib/i18n";

export function refundMailtoHref(locale: Locale): string {
  const subject = locale === "en" ? "Refund" : "Geld terug";
  return `mailto:info@structuro.eu?subject=${encodeURIComponent(subject)}`;
}
