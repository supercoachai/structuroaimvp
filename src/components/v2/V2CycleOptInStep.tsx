"use client";

import { useState } from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

import { useI18n } from "@/lib/i18n";

import V2CycleSetupStep from "./V2CycleSetupStep";
import V2InfoHint from "./V2InfoHint";
import V2InfoSheet from "./V2InfoSheet";
import { V2_INFO_SHEETS } from "./v2InfoSheets";

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
  const sheet = V2_INFO_SHEETS.cycleOptIn;

  if (stage === "setup") {
    return <V2CycleSetupStep onSubmit={onSetupSubmit} onSkip={onSkip} />;
  }

  const rows = [
    {
      key: "b1",
      icon: "meaning" as const,
      title: t("cycle.infoSheetMeaningTitle"),
      body: t("cycle.optInBullet1"),
    },
    {
      key: "b2",
      icon: "plan" as const,
      title: t("cycle.infoSheetPlanTitle"),
      body: t("cycle.optInBullet2"),
    },
    {
      key: "b3",
      icon: "private" as const,
      title: t("cycle.infoSheetPrivateTitle"),
      body: t("cycle.optInBullet3"),
    },
  ];

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
          controlsId="v2-cycle-optin-info-sheet"
        />
      </div>

      <p className="v2-cycle-optin__body">{t("cycle.optInBody")}</p>

      <div className="v2-cycle-optin__actions">
        <button type="button" className="btn-primary w-full" onClick={onEnable}>
          {t("cycle.optInYes")}
        </button>
        <button type="button" className="v2-link" onClick={onSkip}>
          {t("cycle.optInNo")}
        </button>
      </div>

      <V2InfoSheet
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        eyebrow={sheet.eyebrow}
        title={t("cycle.optInTitle")}
        rows={rows}
        gotItLabel={t("cycle.infoSheetGotIt")}
        closeAria={t("cycle.infoSheetCloseAria")}
        panelId="v2-cycle-optin-info-sheet"
        tone="warm"
      />
    </div>
  );
}
