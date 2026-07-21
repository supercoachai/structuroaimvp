"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { MinusIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useI18n } from "@/lib/i18n";
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

import CycleDatePicker, { isoDateLocal } from "./CycleDatePicker";

const PRIMARY_BUTTON_BASE =
  "w-full rounded-xl bg-amber-400 py-3.5 text-base font-semibold text-slate-900 shadow-sm transition-colors duration-200 hover:bg-amber-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60";

function todayIso(): string {
  return isoDateLocal(new Date());
}

function maxBackIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - CYCLE_SETUP_MAX_DAYS_BACK);
  return isoDateLocal(d);
}

export type CycleSetupFormProps = {
  initialLastPeriodStart?: string | null;
  initialAverageLength?: number | null;
  initialMenstruationDuration?: number | null;
  /** Resolves wanneer opslaan klaar is. Als de promise rejects, blijft de UI in busy=false. */
  onSubmit: (
    lastPeriodStart: string,
    averageLength: number,
    menstruationDuration: number
  ) => Promise<void>;
  /** Optionele knop linksonder (bv. "Annuleren") in modals. */
  secondaryAction?: { label: string; onClick: () => void; disabled?: boolean };
  submitLabelOverride?: string;
  /** v2: cream+navy custom kalender i.p.v. native date input. */
  variant?: "default" | "v2";
};

export default function CycleSetupForm({
  initialLastPeriodStart,
  initialAverageLength,
  initialMenstruationDuration,
  onSubmit,
  secondaryAction,
  submitLabelOverride,
  variant = "default",
}: CycleSetupFormProps) {
  const { t } = useI18n();
  const todayStr = useMemo(todayIso, []);
  const minBack = useMemo(maxBackIso, []);
  const [periodStart, setPeriodStart] = useState<string>(
    initialLastPeriodStart && initialLastPeriodStart >= minBack
      ? initialLastPeriodStart
      : todayStr
  );
  const [length, setLength] = useState<number>(
    typeof initialAverageLength === "number"
      ? clampCycleLength(initialAverageLength)
      : CYCLE_LENGTH_DEFAULT
  );
  const [menstruationDuration, setMenstruationDuration] = useState<number>(() =>
    clampMenstruationDuration(
      typeof initialAverageLength === "number"
        ? clampCycleLength(initialAverageLength)
        : CYCLE_LENGTH_DEFAULT,
      typeof initialMenstruationDuration === "number"
        ? initialMenstruationDuration
        : MENSTRUATION_DURATION_DEFAULT
    )
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const menstruationMax = maxMenstruationDurationForCycle(length);

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
        clampMenstruationDuration(safeLength, menstruationDuration)
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-6 text-left">
      <div className="space-y-2">
        <label
          htmlFor="cycle-period-start"
          className="block text-sm font-semibold text-slate-700"
        >
          {t("cycle.setupPeriodLabel")}
        </label>
        {variant === "v2" ? (
          <CycleDatePicker
            id="cycle-period-start"
            value={periodStart}
            min={minBack}
            max={todayStr}
            onChange={setPeriodStart}
            disabled={busy}
          />
        ) : (
          <input
            id="cycle-period-start"
            type="date"
            value={periodStart}
            min={minBack}
            max={todayStr}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              setPeriodStart(v);
            }}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300/40"
            style={{ colorScheme: "light" } as CSSProperties}
          />
        )}
        <p className="text-xs text-slate-500">{t("cycle.setupPeriodHint")}</p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">
          {t("cycle.setupMenstruationLabel")}
        </p>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <button
            type="button"
            onClick={decreaseMenstruation}
            disabled={menstruationDuration <= 1 || busy}
            aria-label={t("cycle.setupMenstruationDecreaseAria")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <MinusIcon className="h-4 w-4" aria-hidden />
          </button>
          <div className="flex flex-1 flex-col items-center">
            <span className="text-2xl font-semibold font-mono tabular-nums text-slate-900">
              {menstruationDuration}
            </span>
            <span className="text-xs text-slate-500">
              {t("cycle.setupLengthDays")}
            </span>
          </div>
          <button
            type="button"
            onClick={increaseMenstruation}
            disabled={menstruationDuration >= menstruationMax || busy}
            aria-label={t("cycle.setupMenstruationIncreaseAria")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <PlusIcon className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <p className="text-xs text-slate-500">{t("cycle.setupMenstruationHint")}</p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">
          {t("cycle.setupLengthLabel")}
        </p>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <button
            type="button"
            onClick={decreaseLength}
            disabled={length <= CYCLE_LENGTH_MIN || busy}
            aria-label={t("cycle.setupLengthDecreaseAria")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <MinusIcon className="h-4 w-4" aria-hidden />
          </button>
          <div className="flex flex-1 flex-col items-center">
            <span className="text-2xl font-semibold font-mono tabular-nums text-slate-900">
              {length}
            </span>
            <span className="text-xs text-slate-500">
              {t("cycle.setupLengthDays")}
            </span>
          </div>
          <button
            type="button"
            onClick={increaseLength}
            disabled={length >= CYCLE_LENGTH_MAX || busy}
            aria-label={t("cycle.setupLengthIncreaseAria")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <PlusIcon className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <p className="text-xs text-slate-500">{t("cycle.setupLengthHint")}</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {t("cycle.setupSaveError", { detail: error })}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 pt-1">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy}
          className={PRIMARY_BUTTON_BASE}
        >
          {busy
            ? t("cycle.setupSaving")
            : (submitLabelOverride ?? t("cycle.setupSubmit"))}
        </button>
        {secondaryAction ? (
          <button
            type="button"
            onClick={secondaryAction.onClick}
            disabled={secondaryAction.disabled || busy}
            className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {secondaryAction.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}
