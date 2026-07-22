"use client";

import { useI18n, type Locale } from "@/lib/i18n";

/**
 * Minimale NL/EN-schakelaar voor first-run (intro/dagstart).
 * Bewust klein: correctie op browser-detect, geen settings-paneel.
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
    <div
      className="v2-lang"
      role="group"
      aria-label={t("v2.languageAria")}
      style={{
        position: "absolute",
        top: "max(4px, env(safe-area-inset-top, 0px))",
        right: 0,
        zIndex: 3,
        display: "flex",
        gap: 2,
        padding: 3,
        borderRadius: 10,
        border: "1px solid var(--border)",
        background: "color-mix(in srgb, var(--surface) 88%, white)",
        backdropFilter: "blur(8px)",
      }}
    >
      {(["nl", "en"] as const).map((code) => {
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            className={`v2-lang__opt${active ? " is-active" : ""}`}
            aria-pressed={active}
            onClick={() => pick(code)}
            style={{
              minWidth: 36,
              border: "none",
              borderRadius: 7,
              padding: "6px 8px",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.04em",
              cursor: "pointer",
              touchAction: "manipulation",
              color: active ? "var(--text-on-ink)" : "var(--text-muted)",
              background: active ? "var(--ink)" : "transparent",
            }}
          >
            {code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
