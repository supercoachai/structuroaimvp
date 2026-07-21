"use client";

import { useState } from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

import { useI18n } from "@/lib/i18n";

import V2CycleSetupStep from "./V2CycleSetupStep";
import V2InfoHint from "./V2InfoHint";

export type V2CycleOptInStage = "intro" | "setup";

/**
 * Optionele cyclus in onboarding: intro (Ja/Nee) → bij Ja: slimme-defaults setup.
 * Altijd skipbaar. Setup deelt progress-stap met intro.
 */
export default function V2CycleOptInStep({
  stage,
  onEnable,
  onSkip,
  onSetupSubmit,
}: {
  stage: V2CycleOptInStage;
  onEnable: () => void;
  onSkip: () => void;
  onSetupSubmit: (
    lastPeriodStart: string,
    averageLength: number,
    menstruationDuration: number,
  ) => Promise<void>;
}) {
  const { t } = useI18n();
  const [infoOpen, setInfoOpen] = useState(false);

  if (stage === "setup") {
    return <V2CycleSetupStep onSubmit={onSetupSubmit} onSkip={onSkip} />;
  }

  return (
    <div className="v2-cycle-optin">
      <div className="v2-cycle-optin__icon" aria-hidden>
        <ArrowPathIcon strokeWidth={1.75} />
      </div>

      <div className="v2-cycle-optin__head">
        <h1 className="v2-cycle-optin__title">{t("cycle.optInTitle")}</h1>
        <V2InfoHint
          infoId="v2_onboarding_cyclus"
          expanded={infoOpen}
          onToggle={() => setInfoOpen((v) => !v)}
          expandLabel={t("cycle.energyContextExpandAria")}
          collapseLabel={t("cycle.energyContextCollapseAria")}
          controlsId="v2-cycle-optin-info"
        />
      </div>

      <p className="v2-cycle-optin__body">{t("cycle.optInBody")}</p>

      {infoOpen ? (
        <ul id="v2-cycle-optin-info" className="v2-cycle-optin__panel">
          <li>{t("cycle.optInBullet1")}</li>
          <li>{t("cycle.optInBullet2")}</li>
          <li>{t("cycle.optInBullet3")}</li>
        </ul>
      ) : null}

      <div className="v2-cycle-optin__actions">
        <button type="button" className="btn-primary w-full" onClick={onEnable}>
          {t("cycle.optInYes")}
        </button>
        <button type="button" className="v2-link" onClick={onSkip}>
          {t("cycle.optInNo")}
        </button>
      </div>
    </div>
  );
}
