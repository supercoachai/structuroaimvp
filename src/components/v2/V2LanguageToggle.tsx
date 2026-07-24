"use client";

import type { ReactElement } from "react";

import { useI18n, type Locale } from "@/lib/i18n";

/** NL-vlag (zelfde SVG als structuro-eu-landing/v2). */
function FlagNl() {
  return (
    <svg
      width="22"
      height="16"
      viewBox="0 0 22 16"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="22" height="16" fill="#AE1C28" />
      <rect y="5.33" width="22" height="5.34" fill="#FFFFFF" />
      <rect y="10.67" width="22" height="5.33" fill="#21468B" />
    </svg>
  );
}

/** EN-vlag (UK Union Jack, zelfde SVG als landing). */
function FlagEn() {
  return (
    <svg
      width="22"
      height="16"
      viewBox="0 0 60 40"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="60" height="40" fill="#012169" />
      <path d="M0,0 L60,40 M60,0 L0,40" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 L60,40 M60,0 L0,40" stroke="#C8102E" strokeWidth="4" />
      <path d="M30,0 V40 M0,20 H60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 V40 M0,20 H60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}

const LANG_OPTS: {
  code: Locale;
  label: string;
  Flag: () => ReactElement;
}[] = [
  { code: "nl", label: "Nederlands", Flag: FlagNl },
  { code: "en", label: "English", Flag: FlagEn },
];

/**
 * NL/EN-schakelaar voor first-run (onboarding energy). Vlaggen zoals op de EU-landing;
 * aria-label + title houden de taalnaam toegankelijk. Accounts: ook in settings.
 */
export default function V2LanguageToggle({
  onChange,
}: {
  /** Extra side-effect (bijv. v2_settings sync). */
  onChange?: (next: Locale) => void;
}) {
  const { locale, setLocale, t } = useI18n();

  const pick = (next: Locale) => {
    if (next === locale) return;
    setLocale(next);
    onChange?.(next);
  };

  return (
    <div className="v2-lang" role="group" aria-label={t("v2.languageAria")}>
      {LANG_OPTS.map(({ code, label, Flag }) => {
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            className={`v2-lang__opt${active ? " is-active" : ""}`}
            aria-label={label}
            aria-pressed={active}
            title={label}
            onClick={() => pick(code)}
          >
            <Flag />
            <span className="v2-lang__code">{code.toUpperCase()}</span>
          </button>
        );
      })}
    </div>
  );
}
