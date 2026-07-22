"use client";

import { useI18n } from "@/lib/i18n";

import V2LanguageToggle from "./V2LanguageToggle";
import { patchV2Settings } from "./v2Settings";

/**
 * Welkom/intro-stap: full-bleed cream, geen witte kaart, geen progress.
 * Tekst-wordmark bovenaan, display-kop, korte lead + soft next-steps, navy CTA.
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
        <p className="v2-intro__lead">{t("v2.introLead")}</p>
        <ol className="v2-intro__steps" aria-label={t("v2.introStepsAria")}>
          <li>
            <span className="v2-intro__step-n" aria-hidden>
              1
            </span>
            <span>{t("v2.introStep1")}</span>
          </li>
          <li>
            <span className="v2-intro__step-n" aria-hidden>
              2
            </span>
            <span>{t("v2.introStep2")}</span>
          </li>
          <li>
            <span className="v2-intro__step-n" aria-hidden>
              3
            </span>
            <span>{t("v2.introStep3")}</span>
          </li>
        </ol>
      </div>

      <div className="v2-intro__footer">
        <button type="button" className="btn-primary w-full" onClick={onBegin}>
          {t("v2.introBegin")}
        </button>
        <p className="v2-intro__reassurance">{t("v2.introNoAccount")}</p>
      </div>
    </div>
  );
}
