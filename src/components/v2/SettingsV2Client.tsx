"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { resolveCurrentPhaseKey } from "@/components/dagstart/design/CyclusButton";
import { useI18n } from "@/lib/i18n";
import { shouldShowPwaInstallHint } from "@/lib/pwaInstallHint";

import V2CycleSettingsSection, {
  v2CycleSettingsSummary,
} from "./V2CycleSettingsSection";
import { V2AppShell } from "./V2Chrome";
import { useV2 } from "./V2Context";
import { getV2CycleChipInfo } from "./V2CycleChip";
import { persistV2PreferredName } from "./v2DisplayName";
import V2SettingsAccordion, {
  V2SettingsIconAccount,
  V2SettingsIconBell,
  V2SettingsIconCycle,
  V2SettingsIconLock,
  V2SettingsIconUser,
  V2SettingsIconWarn,
} from "./V2SettingsAccordion";
import {
  V2LocaleButtons,
  V2SettingsTextLink,
  V2SettingsToggle,
} from "./V2SettingsUi";
import {
  exportV2LocalData,
  isV2MutedToday,
  readV2Settings,
  V2_SETTINGS_KEY,
  writeV2Settings,
  type V2ReminderCadence,
  type V2Settings,
} from "./v2Settings";
import { todayYmd } from "./v2Tasks";
import {
  disableV2ReturnReminder,
  enableV2ReturnReminder,
  requestV2NotificationPermission,
  scheduleV2ReturnNotification,
  setReminderCadence,
  supportsBrowserNotification,
} from "./v2ReturnReminder";
import {
  trackV2NotificationMutedToday,
  trackV2OpenTaskReminderOptIn,
  trackV2QuoteOptIn,
  trackV2ReminderCadenceChanged,
  trackV2ReturnReminderOptIn,
} from "./v2Analytics";

const CADENCE_OPTIONS: { value: V2ReminderCadence; label: string }[] = [
  { value: "none", label: "Geen" },
  { value: "morning", label: "Ochtend" },
  { value: "evening", label: "Avond" },
  { value: "both", label: "Beide" },
];

type AccordionId = "basis" | "cyclus" | "meldingen" | "privacy" | "account";

export default function SettingsV2Client() {
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const { state, ready, update, resetAllLocalData } = useV2();

  const [settings, setSettings] = useState<V2Settings>(() => readV2Settings());
  const [nameInput, setNameInput] = useState("");
  const [nameSaved, setNameSaved] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [showInstallHint, setShowInstallHint] = useState(false);
  const [openId, setOpenId] = useState<AccordionId | null>(null);

  useEffect(() => {
    setShowInstallHint(shouldShowPwaInstallHint());
  }, []);

  useEffect(() => {
    if (!ready) return;
    setNameInput(state.name);
  }, [ready, state.name]);

  useEffect(() => {
    const stored = readV2Settings();
    setSettings(stored);
    setLocale(stored.locale);
  }, [setLocale]);

  const wipeWord = locale === "en" ? "DELETE" : "WISSEN";

  const cyclePhaseLabel = useMemo(() => {
    if (!state.cyclusOptIn) return null;
    const info = getV2CycleChipInfo(true);
    if (!info) return null;
    const key = resolveCurrentPhaseKey(
      info.day,
      info.cycleLength,
      info.menstruationDuration,
    );
    return key ? t(`cycle.contextPhase_${key}`) : null;
  }, [state.cyclusOptIn, settings.lastPeriodStart, settings.cycleLength, settings.menstruationDuration, t]);

  const cycleSubtitle = v2CycleSettingsSummary(
    state.cyclusOptIn,
    settings,
    cyclePhaseLabel,
  );

  const cadenceLabel =
    CADENCE_OPTIONS.find((o) => o.value === settings.reminderCadence)?.label ??
    "Geen";

  const toggle = (id: AccordionId) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  const handleSaveName = () => {
    const value = persistV2PreferredName(nameInput);
    update({ name: value });
    setNameSaved(true);
    window.setTimeout(() => setNameSaved(false), 1800);
  };

  const handleLocaleChange = (code: "nl" | "en") => {
    const next = { ...settings, locale: code };
    writeV2Settings(next);
    setSettings(next);
    setLocale(code);
  };

  const handleAnalyticsToggle = () => {
    const next = { ...settings, analyticsConsent: !settings.analyticsConsent };
    writeV2Settings(next);
    setSettings(next);
  };

  const handleCadenceChange = async (cadence: V2ReminderCadence) => {
    const prev = settings.reminderCadence;
    if (prev === cadence) return;

    if (cadence === "none") {
      disableV2ReturnReminder();
    } else if (prev === "none") {
      const variant = enableV2ReturnReminder();
      trackV2ReturnReminderOptIn({ variant });
      if (variant === "notification" && supportsBrowserNotification()) {
        await requestV2NotificationPermission();
        scheduleV2ReturnNotification();
      }
      setReminderCadence(cadence);
    } else {
      setReminderCadence(cadence);
      if (supportsBrowserNotification() && Notification.permission === "granted") {
        scheduleV2ReturnNotification();
      }
    }

    trackV2ReminderCadenceChanged({ cadence });
    setSettings(readV2Settings());
  };

  const handleOpenTaskReminderToggle = () => {
    const turningOn = !settings.openTaskReminderEnabled;
    const next = { ...settings, openTaskReminderEnabled: turningOn };
    writeV2Settings(next);
    setSettings(next);
    if (turningOn) trackV2OpenTaskReminderOptIn({});
  };

  const handleQuoteToggle = () => {
    const turningOn = !settings.quoteEnabled;
    const next = { ...settings, quoteEnabled: turningOn };
    writeV2Settings(next);
    setSettings(next);
    if (turningOn) trackV2QuoteOptIn({});
  };

  const handleMuteTodayToggle = () => {
    const turningOn = !settings.muteTodayPaused;
    const next = {
      ...settings,
      muteTodayPaused: turningOn,
      muteTodayPausedOn: turningOn ? todayYmd() : null,
    };
    writeV2Settings(next);
    setSettings(next);
    if (turningOn) trackV2NotificationMutedToday({});
  };

  const mutedToday = isV2MutedToday(settings);

  const handleCycleSettingsChange = (patch: Partial<V2Settings>) => {
    const next = { ...settings, ...patch };
    writeV2Settings(next);
    setSettings(next);
  };

  const handleExport = () => {
    const data = exportV2LocalData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `structuro-v2-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReplayIntro = () => {
    router.push("/v2/onboarding?replay=1");
  };

  const handleWipeData = () => {
    if (!confirmWipe) {
      setConfirmWipe(true);
      setConfirmText("");
      return;
    }
    if (confirmText.toLowerCase() !== wipeWord.toLowerCase()) return;
    resetAllLocalData();
    try {
      window.localStorage.removeItem(V2_SETTINGS_KEY);
    } catch {
      // negeren
    }
    router.push("/v2/onboarding");
  };

  const cancelWipe = () => {
    setConfirmWipe(false);
    setConfirmText("");
  };

  return (
    <V2AppShell>
      <div className="v2-settings">
        <header className="v2-settings__header">
          <h1
            className="v2-serif"
            style={{ fontSize: "var(--fs-display)" }}
          >
            {t("settings.title")}
          </h1>
          <p className="v2-settings__subtitle">Tik open wat je wilt aanpassen.</p>
        </header>

        <div className="v2-settings__list">
          <V2SettingsAccordion
            id="basis"
            title="Basis"
            subtitle="Taal · Aanspreeknaam"
            icon={<V2SettingsIconUser />}
            open={openId === "basis"}
            onToggle={() => toggle("basis")}
          >
            <div className="v2-settings-panel">
              <div className="v2-settings-panel__block">
                <p className="v2-settings-panel__label">{t("settings.languageTitle")}</p>
                <p className="v2-settings-panel__hint">{t("settings.languageHint")}</p>
                <div className="v2-settings-panel__control">
                  <V2LocaleButtons
                    locale={settings.locale}
                    onChange={handleLocaleChange}
                    labels={{
                      nl: t("settings.languageNl"),
                      en: t("settings.languageEn"),
                    }}
                  />
                </div>
              </div>
              <div className="v2-settings-panel__block">
                <p className="v2-settings-panel__label">{t("settings.displayNameTitle")}</p>
                <p className="v2-settings-panel__hint">{t("settings.displayNameHint")}</p>
                <div className="v2-settings-panel__stack">
                  <input
                    type="text"
                    className="v2-field"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveName();
                    }}
                    placeholder={t("settings.displayNamePlaceholder")}
                  />
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleSaveName}
                    style={{
                      alignSelf: "flex-start",
                      minHeight: 44,
                      padding: "10px 18px",
                      fontSize: 14,
                    }}
                  >
                    {nameSaved ? t("settings.toastNameSaved") : t("settings.save")}
                  </button>
                </div>
              </div>
            </div>
          </V2SettingsAccordion>

          <V2SettingsAccordion
            id="cyclus"
            title="Cyclus"
            subtitle={cycleSubtitle}
            icon={<V2SettingsIconCycle />}
            open={openId === "cyclus"}
            onToggle={() => toggle("cyclus")}
          >
            <V2CycleSettingsSection
              settings={settings}
              onSettingsChange={handleCycleSettingsChange}
            />
          </V2SettingsAccordion>

          <V2SettingsAccordion
            id="meldingen"
            title="Meldingen & nudges"
            subtitle={`Cadans: ${cadenceLabel}`}
            icon={<V2SettingsIconBell />}
            open={openId === "meldingen"}
            onToggle={() => toggle("meldingen")}
          >
            <div className="v2-settings-panel">
              <div className="v2-settings-panel__block">
                <p className="v2-settings-panel__label">Herinneringscadans</p>
                <p className="v2-settings-panel__hint">
                  Opt-in, standaard uit. Max 1 melding per 24 uur.
                </p>
                <div className="v2-settings-panel__pills">
                  {CADENCE_OPTIONS.map((opt) => {
                    const active = settings.reminderCadence === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={`v2-settings-pill${active ? " is-active" : ""}`}
                        onClick={() => void handleCadenceChange(opt.value)}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="v2-settings-panel__row">
                <button
                  type="button"
                  className="v2-settings-panel__row-copy"
                  onClick={handleOpenTaskReminderToggle}
                >
                  <span className="v2-settings-panel__label">Open ding van vandaag</span>
                  <span className="v2-settings-panel__hint">
                    Alleen als focus gestart is en nog niet afgerond.
                  </span>
                </button>
                <V2SettingsToggle
                  checked={settings.openTaskReminderEnabled}
                  onChange={handleOpenTaskReminderToggle}
                  ariaLabel="Open ding van vandaag"
                />
              </div>

              <div className="v2-settings-panel__row">
                <button
                  type="button"
                  className="v2-settings-panel__row-copy"
                  onClick={handleQuoteToggle}
                >
                  <span className="v2-settings-panel__label">Af en toe een rustige zin</span>
                  <span className="v2-settings-panel__hint">
                    Max 1× per dag. Warm, geen druk.
                  </span>
                </button>
                <V2SettingsToggle
                  checked={settings.quoteEnabled}
                  onChange={handleQuoteToggle}
                  ariaLabel="Af en toe een rustige zin"
                />
              </div>

              <div className="v2-settings-panel__row">
                <button
                  type="button"
                  className="v2-settings-panel__row-copy"
                  onClick={handleMuteTodayToggle}
                >
                  <span className="v2-settings-panel__label">Alles vandaag op pauze</span>
                  <span className="v2-settings-panel__hint">
                    Onderdrukt zachte prompts. Reset morgen.
                  </span>
                </button>
                <V2SettingsToggle
                  checked={mutedToday}
                  onChange={handleMuteTodayToggle}
                  ariaLabel="Alles vandaag op pauze"
                />
              </div>
            </div>
          </V2SettingsAccordion>

          <V2SettingsAccordion
            id="privacy"
            title="Privacy"
            subtitle={`Anonieme analyse: ${settings.analyticsConsent ? "aan" : "uit"}`}
            icon={<V2SettingsIconLock />}
            open={openId === "privacy"}
            onToggle={() => toggle("privacy")}
          >
            <div className="v2-settings-panel">
              <div className="v2-settings-panel__row">
                <button
                  type="button"
                  className="v2-settings-panel__row-copy"
                  onClick={handleAnalyticsToggle}
                >
                  <span className="v2-settings-panel__label">
                    {t("settings.analyticsTitle")}
                  </span>
                  <span className="v2-settings-panel__hint">
                    {t("settings.analyticsHint")}
                  </span>
                </button>
                <V2SettingsToggle
                  checked={settings.analyticsConsent}
                  onChange={handleAnalyticsToggle}
                  ariaLabel={t("settings.analyticsTitle")}
                />
              </div>
            </div>
          </V2SettingsAccordion>

          <V2SettingsAccordion
            id="account"
            title="Account"
            subtitle="Homescreen · export · uitloggen"
            icon={<V2SettingsIconAccount />}
            open={openId === "account"}
            onToggle={() => toggle("account")}
          >
            <div className="v2-settings-panel v2-settings-panel--links">
              {showInstallHint ? (
                <Link href="/v2/install?from=settings" className="v2-settings-link">
                  {t("welkomPage.installTitle")}
                </Link>
              ) : null}
              <button
                type="button"
                className="v2-settings-link"
                onClick={handleExport}
              >
                {t("settings.exportCta")}
              </button>
              <button
                type="button"
                className="v2-settings-link"
                onClick={handleReplayIntro}
              >
                {t("settings.tourCta")}
              </button>
              <Link href="/v2/login" className="v2-settings-link">
                {t("settings.logout")}
              </Link>
            </div>
          </V2SettingsAccordion>
        </div>

        <section className="v2-settings-danger" aria-label="Gevaarlijke acties">
          <div className="v2-settings-danger__head">
            <span className="v2-settings-danger__icon" aria-hidden>
              <V2SettingsIconWarn />
            </span>
            <div>
              <p className="v2-settings-danger__title">
                Account & gegevens verwijderen
              </p>
              <p className="v2-settings-danger__body">
                Verwijdert je account en alle gegevens permanent. Kan niet ongedaan
                gemaakt worden.
              </p>
            </div>
          </div>

          {!confirmWipe ? (
            <button
              type="button"
              className="v2-settings-danger__cta"
              onClick={handleWipeData}
            >
              Alle gegevens wissen
            </button>
          ) : (
            <div className="v2-settings-danger__confirm">
              <p className="v2-settings-panel__hint" style={{ margin: 0 }}>
                {t("settings.wipeConfirmLine", { word: wipeWord })}
              </p>
              <input
                type="text"
                className="v2-field"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={t("settings.wipePlaceholder")}
              />
              <div className="v2-settings-danger__confirm-actions">
                <button
                  type="button"
                  className="v2-settings-danger__cta"
                  onClick={handleWipeData}
                >
                  {t("settings.wipeFinal")}
                </button>
                <V2SettingsTextLink onClick={cancelWipe}>
                  {t("settings.cancel")}
                </V2SettingsTextLink>
              </div>
            </div>
          )}
        </section>

        <div className="v2-settings__legal">
          <Link href="/v2/privacy" className="v2-link">
            {t("settings.legalPrivacy")}
          </Link>
          <Link href="/v2/terms" className="v2-link">
            {t("settings.legalTerms")}
          </Link>
        </div>
      </div>
    </V2AppShell>
  );
}
