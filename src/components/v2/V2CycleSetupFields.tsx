"use client";

import { useEffect, useMemo, useState } from "react";
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

import { readV2Settings } from "./v2Settings";

type PeriodPreset = "today" | "yesterday" | "earlier";
type EditingField = null | "menstruation" | "length";

export type V2CycleSetupValues = {
  lastPeriodStart: string;
  cycleLength: number;
  menstruationDuration: number;
};

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

export function readV2CycleSetupDefaults(): V2CycleSetupValues {
  const settings = readV2Settings();
  const cycleLength = clampCycleLength(settings.cycleLength || CYCLE_LENGTH_DEFAULT);
  return {
    lastPeriodStart: settings.lastPeriodStart ?? todayIso(),
    cycleLength,
    menstruationDuration: clampMenstruationDuration(
      cycleLength,
      settings.menstruationDuration || MENSTRUATION_DURATION_DEFAULT,
    ),
  };
}

function presetForStart(
  start: string,
  today: string,
  yesterday: string,
): PeriodPreset {
  if (start === today) return "today";
  if (start === yesterday) return "yesterday";
  return "earlier";
}

/**
 * Gedeelde cyclus-velden: laatste start + menstruatie + cycluslengte.
 * Gebruikt in full-page setup én in de discover-sheet.
 */
export default function V2CycleSetupFields({
  compact = false,
  onChange,
}: {
  compact?: boolean;
  onChange?: (values: V2CycleSetupValues) => void;
}) {
  const { t } = useI18n();
  const todayStr = useMemo(todayIso, []);
  const yesterdayStr = useMemo(yesterdayIso, []);
  const minBack = useMemo(maxBackIso, []);

  const [seed] = useState(readV2CycleSetupDefaults);
  const [values, setValues] = useState<V2CycleSetupValues>(seed);
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>(() =>
    presetForStart(seed.lastPeriodStart, todayIso(), yesterdayIso()),
  );
  const [editing, setEditing] = useState<EditingField>(null);

  useEffect(() => {
    onChange?.(seed);
    // Alleen initial sync naar parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = (next: V2CycleSetupValues) => {
    setValues(next);
    onChange?.(next);
  };

  const menstruationMax = maxMenstruationDurationForCycle(values.cycleLength);

  const selectToday = () => {
    setPeriodPreset("today");
    emit({ ...values, lastPeriodStart: todayStr });
  };

  const selectYesterday = () => {
    setPeriodPreset("yesterday");
    emit({ ...values, lastPeriodStart: yesterdayStr });
  };

  const selectEarlier = () => {
    setPeriodPreset("earlier");
  };

  const daysLabel = (n: number) =>
    t("cycle.setupDefaultsDays", { n: String(n) });

  return (
    <div
      className={
        compact
          ? "v2-cycle-setup__fields v2-cycle-setup__fields--compact"
          : "v2-cycle-setup__fields"
      }
    >
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
          onClick={selectToday}
        >
          {t("cycle.setupPeriodToday")}
        </button>
        <button
          type="button"
          className="v2-cycle-setup__pill"
          aria-pressed={periodPreset === "yesterday"}
          onClick={selectYesterday}
        >
          {t("cycle.setupPeriodYesterday")}
        </button>
        <button
          type="button"
          className="v2-cycle-setup__pill"
          aria-pressed={periodPreset === "earlier"}
          onClick={selectEarlier}
        >
          {t("cycle.setupPeriodEarlier")}
        </button>
      </div>

      {periodPreset === "earlier" ? (
        <div className="v2-cycle-setup__datepicker">
          <CycleDatePicker
            id="v2-cycle-period-start-fields"
            value={values.lastPeriodStart}
            min={minBack}
            max={todayStr}
            onChange={(v) => emit({ ...values, lastPeriodStart: v })}
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
                onClick={() =>
                  emit({
                    ...values,
                    menstruationDuration: clampMenstruationDuration(
                      values.cycleLength,
                      values.menstruationDuration - 1,
                    ),
                  })
                }
                disabled={values.menstruationDuration <= 1}
                aria-label={t("cycle.setupMenstruationDecreaseAria")}
              >
                <MinusIcon className="v2-cycle-setup__stepper-icon" aria-hidden />
              </button>
              <span className="v2-cycle-setup__row-value">
                {daysLabel(values.menstruationDuration)}
              </span>
              <button
                type="button"
                className="v2-cycle-setup__stepper-btn"
                onClick={() =>
                  emit({
                    ...values,
                    menstruationDuration: clampMenstruationDuration(
                      values.cycleLength,
                      values.menstruationDuration + 1,
                    ),
                  })
                }
                disabled={values.menstruationDuration >= menstruationMax}
                aria-label={t("cycle.setupMenstruationIncreaseAria")}
              >
                <PlusIcon className="v2-cycle-setup__stepper-icon" aria-hidden />
              </button>
              <button
                type="button"
                className="v2-cycle-setup__row-action"
                onClick={() => setEditing(null)}
              >
                {t("cycle.setupRowDone")}
              </button>
            </div>
          ) : (
            <>
              <span className="v2-cycle-setup__row-value">
                {daysLabel(values.menstruationDuration)}
              </span>
              <button
                type="button"
                className="v2-cycle-setup__row-action"
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
                onClick={() => {
                  const next = clampCycleLength(values.cycleLength - 1);
                  emit({
                    ...values,
                    cycleLength: next,
                    menstruationDuration: clampMenstruationDuration(
                      next,
                      values.menstruationDuration,
                    ),
                  });
                }}
                disabled={values.cycleLength <= CYCLE_LENGTH_MIN}
                aria-label={t("cycle.setupLengthDecreaseAria")}
              >
                <MinusIcon className="v2-cycle-setup__stepper-icon" aria-hidden />
              </button>
              <span className="v2-cycle-setup__row-value">
                {daysLabel(values.cycleLength)}
              </span>
              <button
                type="button"
                className="v2-cycle-setup__stepper-btn"
                onClick={() =>
                  emit({
                    ...values,
                    cycleLength: clampCycleLength(values.cycleLength + 1),
                  })
                }
                disabled={values.cycleLength >= CYCLE_LENGTH_MAX}
                aria-label={t("cycle.setupLengthIncreaseAria")}
              >
                <PlusIcon className="v2-cycle-setup__stepper-icon" aria-hidden />
              </button>
              <button
                type="button"
                className="v2-cycle-setup__row-action"
                onClick={() => setEditing(null)}
              >
                {t("cycle.setupRowDone")}
              </button>
            </div>
          ) : (
            <>
              <span className="v2-cycle-setup__row-value">
                {daysLabel(values.cycleLength)}
              </span>
              <button
                type="button"
                className="v2-cycle-setup__row-action"
                onClick={() => setEditing("length")}
              >
                {t("cycle.setupChange")}
              </button>
            </>
          )}
        </div>
      </div>

      <p className="v2-cycle-setup__footnote">{t("cycle.setupDefaultsFootnote")}</p>
    </div>
  );
}
