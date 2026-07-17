"use client";

import { useMemo, useState, type CSSProperties } from "react";

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
import {
  V2SettingsRow,
  V2SettingsToggle,
} from "./V2SettingsUi";
import { type V2Settings } from "./v2Settings";
import { ensureV2CyclePeriodStart } from "./V2CycleChip";
import { v2Styles } from "./theme";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseLocalIsoDate(iso: string): Date | null {
  const parts = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!parts) return null;
  const year = Number(parts[1]);
  const month = Number(parts[2]) - 1;
  const day = Number(parts[3]);
  const d = new Date(year, month, day);
  if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) {
    return null;
  }
  return d;
}

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

function Stepper({
  value,
  onDecrease,
  onIncrease,
  decreaseDisabled,
  increaseDisabled,
  decreaseAria,
  increaseAria,
  unit,
}: {
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
  decreaseDisabled: boolean;
  increaseDisabled: boolean;
  decreaseAria: string;
  increaseAria: string;
  unit: string;
}) {
  return (
    <div style={v2Styles.settingsStepperRow}>
      <button
        type="button"
        className="v2-stepper-btn"
        aria-label={decreaseAria}
        disabled={decreaseDisabled}
        onClick={onDecrease}
        style={{
          ...v2Styles.settingsStepperBtn,
          opacity: decreaseDisabled ? 0.4 : 1,
        }}
      >
        −
      </button>
      <div style={v2Styles.settingsStepperValue}>
        <p style={v2Styles.settingsStepperNumber}>{value}</p>
        <p style={{ ...v2Styles.settingsHint, margin: "2px 0 0" }}>{unit}</p>
      </div>
      <button
        type="button"
        className="v2-stepper-btn"
        aria-label={increaseAria}
        disabled={increaseDisabled}
        onClick={onIncrease}
        style={{
          ...v2Styles.settingsStepperBtn,
          opacity: increaseDisabled ? 0.4 : 1,
        }}
      >
        +
      </button>
    </div>
  );
}

const settingsFieldLabel: CSSProperties = {
  margin: 0,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
};

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

  const todayStr = useMemo(() => isoDate(new Date()), []);
  const minBack = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - CYCLE_SETUP_MAX_DAYS_BACK);
    return isoDate(d);
  }, []);

  const periodDisplay = formatDate(settings.lastPeriodStart, locale);
  const draftPeriod =
    settings.lastPeriodStart && settings.lastPeriodStart >= minBack
      ? settings.lastPeriodStart
      : todayStr;

  const patch = (next: Partial<V2Settings>) => onSettingsChange(next);

  const setConsent = (on: boolean) => {
    update({ cyclusOptIn: on });
    if (on) ensureV2CyclePeriodStart();
  };

  return (
    <>
      <V2SettingsRow
        label={t("cycle.settingsTitle")}
        hint={t("cycle.settingsHint")}
        last={!consentOn}
        onLabelClick={() => setConsent(!consentOn)}
      >
        <V2SettingsToggle
          checked={consentOn}
          onChange={() => setConsent(!consentOn)}
          ariaLabel={t("cycle.settingsTitle")}
        />
      </V2SettingsRow>

      {consentOn ? (
        <div style={v2Styles.settingsExpanded}>
          <div style={v2Styles.settingsInnerCard}>
            <p style={settingsFieldLabel}>{t("cycle.settingsPeriodLabel")}</p>
            {periodDisplay ? (
              <p style={v2Styles.settingsPeriodDate}>{periodDisplay}</p>
            ) : (
              <p style={v2Styles.settingsPeriodEmpty}>
                {t("cycle.setupPeriodHint")}
              </p>
            )}

            {adjustOpen ? (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <label htmlFor="v2-cycle-period-start" style={{ ...v2Styles.settingsHint, margin: 0 }}>
                  {t("cycle.setupPeriodLabel")}
                </label>
                <input
                  id="v2-cycle-period-start"
                  type="date"
                  className="v2-field"
                  value={draftPeriod}
                  min={minBack}
                  max={todayStr}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) return;
                    patch({ lastPeriodStart: v });
                  }}
                  style={{ ...v2Styles.input, fontSize: 15, minHeight: 48 }}
                />
                <button
                  type="button"
                  className="v2-textlink"
                  onClick={() => setAdjustOpen(false)}
                  style={{
                    ...v2Styles.textlink,
                    alignSelf: "flex-start",
                    fontSize: 13,
                    fontWeight: 600,
                    padding: "4px 0",
                  }}
                >
                  {t("cycle.settingsRemoveConfirmCancel")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="v2-secondary"
                onClick={() => setAdjustOpen(true)}
                style={{
                  ...v2Styles.ctaSecondary,
                  marginTop: 10,
                  alignSelf: "flex-start",
                  width: "auto",
                  minHeight: 40,
                  padding: "8px 14px",
                  fontSize: 13,
                }}
              >
                {t("cycle.settingsAdjustPeriod")}
              </button>
            )}
          </div>

          <div style={v2Styles.settingsInnerCard}>
            <p style={settingsFieldLabel}>{t("cycle.settingsLengthLabel")}</p>
            <Stepper
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
          </div>

          <div style={v2Styles.settingsInnerCard}>
            <p style={settingsFieldLabel}>{t("cycle.settingsMenstruationLabel")}</p>
            <Stepper
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
    </>
  );
}
