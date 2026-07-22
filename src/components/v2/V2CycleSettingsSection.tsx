"use client";

import { useMemo, useState } from "react";

import CycleDatePicker, {
  isoDateLocal,
  parseLocalIsoDate,
} from "@/components/cycle/CycleDatePicker";
import { resolveCurrentPhaseKey } from "@/components/dagstart/design/CyclusButton";
import { useI18n } from "@/lib/i18n";
import {
  CYCLE_LENGTH_MAX,
  CYCLE_LENGTH_MIN,
  CYCLE_SETUP_MAX_DAYS_BACK,
  clampCycleLength,
  clampMenstruationDuration,
  maxMenstruationDurationForCycle,
} from "@/lib/cycle/types";

import { useV2 } from "./V2Context";
import { V2SettingsToggle } from "./V2SettingsUi";
import { patchV2Settings, readV2Settings, type V2Settings } from "./v2Settings";
import { ensureV2CyclePeriodStart, getV2CycleChipInfo } from "./V2CycleChip";
import { V2_ORB_PHASE_COLORS } from "@/components/dagstart/design/CycleRing";

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return "";
  const d = parseLocalIsoDate(iso);
  if (!d) return iso;
  return d.toLocaleDateString(locale === "en" ? "en-GB" : "nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function CompactStepper({
  label,
  value,
  unit,
  onDecrease,
  onIncrease,
  decreaseDisabled,
  increaseDisabled,
  decreaseAria,
  increaseAria,
}: {
  label: string;
  value: number;
  unit: string;
  onDecrease: () => void;
  onIncrease: () => void;
  decreaseDisabled: boolean;
  increaseDisabled: boolean;
  decreaseAria: string;
  increaseAria: string;
}) {
  return (
    <div className="v2-cycle-compact-stepper">
      <p className="v2-cycle-compact-stepper__label">{label}</p>
      <div className="v2-cycle-compact-stepper__row">
        <button
          type="button"
          className="v2-cycle-compact-stepper__btn"
          aria-label={decreaseAria}
          disabled={decreaseDisabled}
          onClick={onDecrease}
        >
          −
        </button>
        <div className="v2-cycle-compact-stepper__value">
          <span className="v2-cycle-compact-stepper__num">{value}</span>
          <span className="v2-cycle-compact-stepper__unit">{unit}</span>
        </div>
        <button
          type="button"
          className="v2-cycle-compact-stepper__btn"
          aria-label={increaseAria}
          disabled={increaseDisabled}
          onClick={onIncrease}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function v2CycleSettingsSummary(
  cyclusOptIn: boolean,
  settings: V2Settings,
  phaseLabel: string | null,
): string {
  if (!cyclusOptIn) return "Uit";
  const info = getV2CycleChipInfo(true);
  if (!info || !phaseLabel) return "Aan";
  return `Aan · dag ${info.day}, ${phaseLabel.toLowerCase()}`;
}

export default function V2CycleSettingsSection({
  settings,
  onSettingsChange,
}: {
  settings: V2Settings;
  onSettingsChange: (patch: Partial<V2Settings>) => void;
}) {
  const { t, locale } = useI18n();
  const { state, update } = useV2();
  const consentOn = state.cyclusOptIn;
  const [adjustOpen, setAdjustOpen] = useState(false);

  const todayStr = useMemo(() => isoDateLocal(new Date()), []);
  const minBack = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - CYCLE_SETUP_MAX_DAYS_BACK);
    return isoDateLocal(d);
  }, []);

  const periodDisplay = formatDate(settings.lastPeriodStart, locale);
  const draftPeriod =
    settings.lastPeriodStart && settings.lastPeriodStart >= minBack
      ? settings.lastPeriodStart
      : todayStr;

  const chip = consentOn ? getV2CycleChipInfo(true) : null;
  const phaseKey = chip
    ? resolveCurrentPhaseKey(
        chip.day,
        chip.cycleLength,
        chip.menstruationDuration,
      )
    : null;
  const phaseLabel = phaseKey ? t(`cycle.contextPhase_${phaseKey}`) : null;
  const phaseAccent = phaseKey ? V2_ORB_PHASE_COLORS[phaseKey] : "#C4785A";

  const patch = (next: Partial<V2Settings>) => onSettingsChange(next);

  const setConsent = (on: boolean) => {
    update({ cyclusOptIn: on });
    if (on) {
      ensureV2CyclePeriodStart();
      patchV2Settings({ cycleOptInPromptDismissed: true });
      const fresh = readV2Settings();
      onSettingsChange({
        lastPeriodStart: fresh.lastPeriodStart,
        cycleLength: fresh.cycleLength,
        menstruationDuration: fresh.menstruationDuration,
      });
    }
  };

  return (
    <div className="v2-cycle-settings">
      <div className="v2-cycle-settings__toggle-row">
        <button
          type="button"
          className="v2-cycle-settings__toggle-copy"
          onClick={() => setConsent(!consentOn)}
        >
          <span className="v2-cycle-settings__toggle-title">
            {t("cycle.settingsTitle")}
          </span>
          <span className="v2-cycle-settings__toggle-hint">
            Structuro berekent je fase bij de dagstart.
          </span>
        </button>
        <V2SettingsToggle
          checked={consentOn}
          onChange={() => setConsent(!consentOn)}
          ariaLabel={t("cycle.settingsTitle")}
        />
      </div>

      {consentOn ? (
        <div className="v2-cycle-settings__card">
          <p className="v2-cycle-settings__field-label">
            {t("cycle.settingsPeriodLabel")}
          </p>
          {periodDisplay ? (
            <p className="v2-cycle-settings__date">{periodDisplay}</p>
          ) : (
            <p className="v2-cycle-settings__date-empty">
              {t("cycle.setupPeriodHint")}
            </p>
          )}

          <div className="v2-cycle-settings__status-row">
            {chip && phaseLabel ? (
              <span
                className="v2-cycle-settings__pill"
                style={{ color: phaseAccent, background: `${phaseAccent}1A` }}
              >
                • Dag {chip.day} • {phaseLabel}
              </span>
            ) : (
              <span />
            )}
            <button
              type="button"
              className="v2-cycle-settings__adjust"
              onClick={() => setAdjustOpen((v) => !v)}
            >
              {adjustOpen ? t("cycle.settingsRemoveConfirmCancel") : "Pas aan"}
            </button>
          </div>

          {adjustOpen ? (
            <div className="v2-cycle-settings__picker">
              <CycleDatePicker
                id="v2-cycle-period-start"
                value={draftPeriod}
                min={minBack}
                max={todayStr}
                onChange={(v) => patch({ lastPeriodStart: v })}
              />
            </div>
          ) : null}

          <div className="v2-cycle-settings__steppers">
            <CompactStepper
              label={locale === "en" ? "Cycle length" : "Cycluslengte"}
              value={settings.cycleLength}
              unit={t("cycle.setupLengthDays")}
              decreaseAria={t("cycle.setupLengthDecreaseAria")}
              increaseAria={t("cycle.setupLengthIncreaseAria")}
              decreaseDisabled={settings.cycleLength <= CYCLE_LENGTH_MIN}
              increaseDisabled={settings.cycleLength >= CYCLE_LENGTH_MAX}
              onDecrease={() => {
                const cycleLength = clampCycleLength(settings.cycleLength - 1);
                patch({
                  cycleLength,
                  menstruationDuration: clampMenstruationDuration(
                    cycleLength,
                    settings.menstruationDuration,
                  ),
                });
              }}
              onIncrease={() => {
                patch({ cycleLength: clampCycleLength(settings.cycleLength + 1) });
              }}
            />
            <CompactStepper
              label={
                locale === "en" ? "Period length" : "Menstruatieduur"
              }
              value={settings.menstruationDuration}
              unit={t("cycle.setupLengthDays")}
              decreaseAria={t("cycle.setupMenstruationDecreaseAria")}
              increaseAria={t("cycle.setupMenstruationIncreaseAria")}
              decreaseDisabled={settings.menstruationDuration <= 1}
              increaseDisabled={
                settings.menstruationDuration >=
                maxMenstruationDurationForCycle(settings.cycleLength)
              }
              onDecrease={() => {
                patch({
                  menstruationDuration: clampMenstruationDuration(
                    settings.cycleLength,
                    settings.menstruationDuration - 1,
                  ),
                });
              }}
              onIncrease={() => {
                patch({
                  menstruationDuration: clampMenstruationDuration(
                    settings.cycleLength,
                    settings.menstruationDuration + 1,
                  ),
                });
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
