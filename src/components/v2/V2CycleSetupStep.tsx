"use client";

import { useMemo, useState } from "react";
import { MinusIcon, PlusIcon } from "@heroicons/react/24/outline";

import CycleDatePicker, { isoDateLocal } from "@/components/cycle/CycleDatePicker";
import {
  CYCLE_LENGTH_DEFAULT,
  CYCLE_LENGTH_MAX,
  CYCLE_LENGTH_MIN,
  CYCLE_SETUP_MAX_DAYS_BACK,
  MENSTRUATION_DURATION_DEFAULT,
  clampCycleLength,
  clampMenstruationDuration,
  maxMenstruationDurationForCycle,
} from "@/lib/cycle/types";
import { useI18n } from "@/lib/i18n";

type PeriodPreset = "today" | "yesterday" | "earlier";
type EditingField = null | "menstruation" | "length";

function todayIso(): string {
  return isoDateLocal(new Date());
}

function yesterdayIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return isoDateLocal(d);
}

function maxBackIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - CYCLE_SETUP_MAX_DAYS_BACK);
  return isoDateLocal(d);
}

/**
 * Onboarding cyclus-setup (Optie 3): slimme defaults, alleen bevestigen.
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
  const todayStr = useMemo(todayIso, []);
  const yesterdayStr = useMemo(yesterdayIso, []);
  const minBack = useMemo(maxBackIso, []);

  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("today");
  const [periodStart, setPeriodStart] = useState(todayStr);
  const [length, setLength] = useState(CYCLE_LENGTH_DEFAULT);
  const [menstruationDuration, setMenstruationDuration] = useState(
    MENSTRUATION_DURATION_DEFAULT,
  );
  const [editing, setEditing] = useState<EditingField>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const menstruationMax = maxMenstruationDurationForCycle(length);

  const selectToday = () => {
    setPeriodPreset("today");
    setPeriodStart(todayStr);
  };

  const selectYesterday = () => {
    setPeriodPreset("yesterday");
    setPeriodStart(yesterdayStr);
  };

  const selectEarlier = () => {
    setPeriodPreset("earlier");
  };

  const decreaseLength = () => {
    setLength((prev) => {
      const next = clampCycleLength(prev - 1);
      setMenstruationDuration((d) => clampMenstruationDuration(next, d));
      return next;
    });
  };

  const increaseLength = () => {
    setLength((prev) => clampCycleLength(prev + 1));
  };

  const decreaseMenstruation = () => {
    setMenstruationDuration((v) => clampMenstruationDuration(length, v - 1));
  };

  const increaseMenstruation = () => {
    setMenstruationDuration((v) => clampMenstruationDuration(length, v + 1));
  };

  const submit = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const safeLength = clampCycleLength(length);
      await onSubmit(
        periodStart,
        safeLength,
        clampMenstruationDuration(safeLength, menstruationDuration),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const daysLabel = (n: number) =>
    t("cycle.setupDefaultsDays", { n: String(n) });

  return (
    <div className="v2-cycle-setup">
      <p className="v2-eyebrow">{t("cycle.setupEyebrow")}</p>
      <h1 className="v2-cycle-setup__title">
        {t("cycle.setupSmartTitleBefore")}
        <em className="v2-it">{t("cycle.setupSmartTitleAccent")}</em>
        {t("cycle.setupSmartTitleAfter")}
      </h1>

      <p className="v2-cycle-setup__question">{t("cycle.setupPeriodLabel")}</p>

      <div
        className="v2-cycle-setup__pills"
        role="group"
        aria-label={t("cycle.setupPeriodLabel")}
      >
        <button
          type="button"
          className="v2-cycle-setup__pill"
          aria-pressed={periodPreset === "today"}
          disabled={busy}
          onClick={selectToday}
        >
          {t("cycle.setupPeriodToday")}
        </button>
        <button
          type="button"
          className="v2-cycle-setup__pill"
          aria-pressed={periodPreset === "yesterday"}
          disabled={busy}
          onClick={selectYesterday}
        >
          {t("cycle.setupPeriodYesterday")}
        </button>
        <button
          type="button"
          className="v2-cycle-setup__pill"
          aria-pressed={periodPreset === "earlier"}
          disabled={busy}
          onClick={selectEarlier}
        >
          {t("cycle.setupPeriodEarlier")}
        </button>
      </div>

      {periodPreset === "earlier" ? (
        <div className="v2-cycle-setup__datepicker">
          <CycleDatePicker
            id="v2-cycle-period-start"
            value={periodStart}
            min={minBack}
            max={todayStr}
            onChange={setPeriodStart}
            disabled={busy}
            defaultOpen={false}
          />
        </div>
      ) : null}

      <div className="v2-cycle-setup__card">
        <div
          className={[
            "v2-cycle-setup__row",
            editing === "menstruation" ? "is-editing" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <span className="v2-cycle-setup__row-label">
            {t("cycle.setupDefaultsMenstruation")}
          </span>
          {editing === "menstruation" ? (
            <div className="v2-cycle-setup__stepper">
              <button
                type="button"
                className="v2-cycle-setup__stepper-btn"
                onClick={decreaseMenstruation}
                disabled={menstruationDuration <= 1 || busy}
                aria-label={t("cycle.setupMenstruationDecreaseAria")}
              >
                <MinusIcon className="v2-cycle-setup__stepper-icon" aria-hidden />
              </button>
              <span className="v2-cycle-setup__row-value">
                {daysLabel(menstruationDuration)}
              </span>
              <button
                type="button"
                className="v2-cycle-setup__stepper-btn"
                onClick={increaseMenstruation}
                disabled={menstruationDuration >= menstruationMax || busy}
                aria-label={t("cycle.setupMenstruationIncreaseAria")}
              >
                <PlusIcon className="v2-cycle-setup__stepper-icon" aria-hidden />
              </button>
              <button
                type="button"
                className="v2-cycle-setup__row-action"
                disabled={busy}
                onClick={() => setEditing(null)}
              >
                {t("cycle.setupRowDone")}
              </button>
            </div>
          ) : (
            <>
              <span className="v2-cycle-setup__row-value">
                {daysLabel(menstruationDuration)}
              </span>
              <button
                type="button"
                className="v2-cycle-setup__row-action"
                disabled={busy}
                onClick={() => setEditing("menstruation")}
              >
                {t("cycle.setupChange")}
              </button>
            </>
          )}
        </div>

        <div
          className={[
            "v2-cycle-setup__row",
            editing === "length" ? "is-editing" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <span className="v2-cycle-setup__row-label">
            {t("cycle.setupDefaultsLength")}
          </span>
          {editing === "length" ? (
            <div className="v2-cycle-setup__stepper">
              <button
                type="button"
                className="v2-cycle-setup__stepper-btn"
                onClick={decreaseLength}
                disabled={length <= CYCLE_LENGTH_MIN || busy}
                aria-label={t("cycle.setupLengthDecreaseAria")}
              >
                <MinusIcon className="v2-cycle-setup__stepper-icon" aria-hidden />
              </button>
              <span className="v2-cycle-setup__row-value">
                {daysLabel(length)}
              </span>
              <button
                type="button"
                className="v2-cycle-setup__stepper-btn"
                onClick={increaseLength}
                disabled={length >= CYCLE_LENGTH_MAX || busy}
                aria-label={t("cycle.setupLengthIncreaseAria")}
              >
                <PlusIcon className="v2-cycle-setup__stepper-icon" aria-hidden />
              </button>
              <button
                type="button"
                className="v2-cycle-setup__row-action"
                disabled={busy}
                onClick={() => setEditing(null)}
              >
                {t("cycle.setupRowDone")}
              </button>
            </div>
          ) : (
            <>
              <span className="v2-cycle-setup__row-value">
                {daysLabel(length)}
              </span>
              <button
                type="button"
                className="v2-cycle-setup__row-action"
                disabled={busy}
                onClick={() => setEditing("length")}
              >
                {t("cycle.setupChange")}
              </button>
            </>
          )}
        </div>
      </div>

      <p className="v2-cycle-setup__footnote">{t("cycle.setupDefaultsFootnote")}</p>

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
