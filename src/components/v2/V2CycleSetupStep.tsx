"use client";

import { useState } from "react";

import { useI18n } from "@/lib/i18n";

import V2CycleSetupFields, {
  readV2CycleSetupDefaults,
  type V2CycleSetupValues,
} from "./V2CycleSetupFields";

/**
 * Onboarding cyclus-setup: slimme defaults, alleen bevestigen.
 * Alleen gebruikt vanuit V2CycleOptInStep; v1 CycleSetupForm blijft amber.
 */
export default function V2CycleSetupStep({
  onSubmit,
  onSkip,
}: {
  onSubmit: (
    lastPeriodStart: string,
    averageLength: number,
    menstruationDuration: number,
  ) => Promise<void>;
  onSkip: () => void;
}) {
  const { t } = useI18n();
  const [values, setValues] = useState<V2CycleSetupValues>(readV2CycleSetupDefaults);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await onSubmit(
        values.lastPeriodStart,
        values.cycleLength,
        values.menstruationDuration,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="v2-cycle-setup">
      <p className="v2-eyebrow">{t("cycle.setupEyebrow")}</p>
      <h1 className="v2-cycle-setup__title">
        {t("cycle.setupSmartTitleBefore")}
        <em className="v2-it">{t("cycle.setupSmartTitleAccent")}</em>
        {t("cycle.setupSmartTitleAfter")}
      </h1>

      <V2CycleSetupFields onChange={setValues} />

      {error ? (
        <div className="v2-cycle-setup__error" role="alert">
          {t("cycle.setupSaveError", { detail: error })}
        </div>
      ) : null}

      <div className="v2-cycle-setup__actions">
        <button
          type="button"
          className="btn-primary w-full"
          disabled={busy}
          onClick={() => void submit()}
        >
          {busy ? t("cycle.setupSaving") : t("cycle.setupConfirm")}
        </button>
        <button
          type="button"
          className="v2-link"
          disabled={busy}
          onClick={onSkip}
        >
          {t("cycle.optInNo")}
        </button>
        <p className="v2-cycle-setup__later">{t("cycle.setupLaterNote")}</p>
      </div>
    </div>
  );
}
