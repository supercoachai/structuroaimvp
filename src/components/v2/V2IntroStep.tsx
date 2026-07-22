"use client";

import { useI18n } from "@/lib/i18n";

import V2LanguageToggle from "./V2LanguageToggle";
import { patchV2Settings } from "./v2Settings";

/**
 * Welkom/intro-stap: full-bleed cream, geen witte kaart, geen progress.
 * Minimale NL/EN-toggle + browser-detect via I18n/bootstrap.
 */
export default function V2IntroStep({ onBegin }: { onBegin: () => void }) {
  const { t } = useI18n();

  return (
    <div className="v2-intro v2-fade">
      <V2LanguageToggle
        onChange={(next) => {
          patchV2Settings({ locale: next });
        }}
      />
      <p className="v2-intro__brand">Structuro</p>
      <div className="v2-intro__main">
        <p className="v2-eyebrow">{t("v2.introEyebrow")}</p>
        <h1 className="v2-intro__title">
          {t("v2.introTitleBefore")}
          <em className="v2-it">{t("v2.introTitleEm")}</em>
          {t("v2.introTitleAfter")}
        </h1>
      </div>

      <div className="v2-intro__footer">
        <button type="button" className="btn-primary w-full" onClick={onBegin}>
          {t("v2.introBegin")}
        </button>
        <p className="v2-intro__reassurance">{t("v2.flowAlwaysStop")}</p>
      </div>
    </div>
  );
}
