"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useI18n } from "@/lib/i18n";

import { shouldShowPwaInstallHint } from "@/lib/pwaInstallHint";

import V2CycleSettingsSection from "./V2CycleSettingsSection";
import { V2AppShell } from "./V2Chrome";
import { useV2 } from "./V2Context";
import {
  V2LocaleButtons,
  V2SettingsLinkActions,
  V2SettingsRow,
  V2SettingsSection,
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
import { v2Styles } from "./theme";
import {
  disableV2ReturnReminder,
  enableV2ReturnReminder,
  getV2ReturnVariant,
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

  const handleSaveName = () => {
    const value = nameInput.trim();
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

  const returnVariant = getV2ReturnVariant();

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
      <div style={v2Styles.settingsPage}>
        <header>
          <h1 style={v2Styles.title}>{t("settings.title")}</h1>
          <p style={v2Styles.body}>{t("settings.subtitle")}</p>
          <p style={{ ...v2Styles.settingsHint, marginTop: 8 }}>
            Account en cloud-sync via Bewaar je dag. Tot die tijd blijft alles lokaal
            op dit apparaat.
          </p>
        </header>

        <V2SettingsSection title={t("settings.sectionPreferences")}>
          <V2SettingsRow label={t("settings.languageTitle")} hint={t("settings.languageHint")}>
            <V2LocaleButtons
              locale={settings.locale}
              onChange={handleLocaleChange}
              labels={{
                nl: t("settings.languageNl"),
                en: t("settings.languageEn"),
              }}
            />
          </V2SettingsRow>

          <V2SettingsRow
            label={t("settings.displayNameTitle")}
            hint={t("settings.displayNameHint")}
            stack
            last
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input
                type="text"
                className="v2-field"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                }}
                placeholder={t("settings.displayNamePlaceholder")}
                style={v2Styles.input}
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
          </V2SettingsRow>
        </V2SettingsSection>

        <V2SettingsSection title={t("cycle.settingsTitle")}>
          <V2CycleSettingsSection
            settings={settings}
            onSettingsChange={handleCycleSettingsChange}
          />
        </V2SettingsSection>

        <V2SettingsSection title="Vandaag">
          <V2SettingsRow
            label="Zet alles vandaag op pauze"
            hint="Onderdrukt zachte prompts en suggesties voor vandaag. Reset vanzelf morgen."
            last
            onLabelClick={handleMuteTodayToggle}
          >
            <V2SettingsToggle
              checked={mutedToday}
              onChange={handleMuteTodayToggle}
              ariaLabel="Zet alles vandaag op pauze"
            />
          </V2SettingsRow>
        </V2SettingsSection>

        <V2SettingsSection title="Herinneringen">
          <V2SettingsRow
            label="Herinneringscadans"
            hint={
              returnVariant
                ? `Opt-in, standaard uit. Max 1 melding per 24 uur. Variant: ${returnVariant === "notification" ? "melding" : "widget op home"}. Werkt lokaal zolang een tab open is.`
                : "Opt-in, standaard uit. Max 1 melding per 24 uur. Werkt lokaal zolang een tab open is."
            }
            stack
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {CADENCE_OPTIONS.map((opt) => {
                const active = settings.reminderCadence === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => void handleCadenceChange(opt.value)}
                    style={{
                      borderRadius: 10,
                      padding: "8px 12px",
                      fontSize: 13,
                      fontWeight: 600,
                      border: active ? "none" : "1px solid var(--border)",
                      backgroundColor: active ? "var(--accent)" : "#FFFFFF",
                      color: active ? "#FFFFFF" : "var(--text)",
                      cursor: "pointer",
                      touchAction: "manipulation",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </V2SettingsRow>

          <V2SettingsRow
            label="Open ding van vandaag"
            hint="Alleen als je focus gestart hebt en nog niet afgerond. Max 1× per dag, altijd skippable."
            onLabelClick={handleOpenTaskReminderToggle}
          >
            <V2SettingsToggle
              checked={settings.openTaskReminderEnabled}
              onChange={handleOpenTaskReminderToggle}
              ariaLabel="Open ding van vandaag"
            />
          </V2SettingsRow>

          <V2SettingsRow
            label="Af en toe een rustige zin"
            hint="Max 1× per dag op home of in een ochtendmelding. Warm, geen druk."
            last
            onLabelClick={handleQuoteToggle}
          >
            <V2SettingsToggle
              checked={settings.quoteEnabled}
              onChange={handleQuoteToggle}
              ariaLabel="Af en toe een rustige zin"
            />
          </V2SettingsRow>
        </V2SettingsSection>

        <V2SettingsSection title={t("settings.sectionPrivacy")}>
          <V2SettingsRow
            label={t("settings.analyticsTitle")}
            hint={t("settings.analyticsHint")}
            last
            onLabelClick={handleAnalyticsToggle}
          >
            <V2SettingsToggle
              checked={settings.analyticsConsent}
              onChange={handleAnalyticsToggle}
              ariaLabel={t("settings.analyticsTitle")}
            />
          </V2SettingsRow>
        </V2SettingsSection>

        <V2SettingsSection title={t("settings.sectionAccount")}>
          <V2SettingsLinkActions>
            {showInstallHint ? (
              <Link
                href="/v2/install?from=settings"
                className="v2-link"
                style={v2Styles.textlink}
              >
                {t("welkomPage.installTitle")}
              </Link>
            ) : null}
            <V2SettingsTextLink onClick={handleExport}>
              {t("settings.exportCta")}
            </V2SettingsTextLink>
            <V2SettingsTextLink onClick={handleReplayIntro}>
              {t("settings.tourCta")}
            </V2SettingsTextLink>
            <Link href="/v2/login" className="v2-link" style={v2Styles.textlink}>
              {t("settings.logout")}
            </Link>
            <p style={{ ...v2Styles.settingsHint, margin: "4px 0 0" }}>
              Inloggen en uitloggen zijn in v2 alleen ter referentie. Productie gebruikt /login.
            </p>
          </V2SettingsLinkActions>

          <div
            style={{
              borderTop: "1px solid var(--border)",
              padding: "16px 18px",
            }}
          >
            <p style={v2Styles.settingsLabel}>{t("settings.wipeTitle")}</p>
            <p style={v2Styles.settingsHint}>{t("settings.wipeHint")}</p>

            {!confirmWipe ? (
              <div style={{ marginTop: 12 }}>
                <V2SettingsTextLink variant="danger" onClick={handleWipeData}>
                  {t("settings.wipeCta")}
                </V2SettingsTextLink>
              </div>
            ) : (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  backgroundColor: "rgba(45, 90, 86, 0.04)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <p style={{ ...v2Styles.settingsHint, margin: 0 }}>
                  {t("settings.wipeConfirmLine", { word: wipeWord })}
                </p>
                <input
                  type="text"
                  className="v2-field"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={t("settings.wipePlaceholder")}
                  style={{ ...v2Styles.input, fontSize: 14, minHeight: 44 }}
                />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                  <V2SettingsTextLink variant="danger" onClick={handleWipeData}>
                    {t("settings.wipeFinal")}
                  </V2SettingsTextLink>
                  <V2SettingsTextLink onClick={cancelWipe}>
                    {t("settings.cancel")}
                  </V2SettingsTextLink>
                </div>
              </div>
            )}
          </div>
        </V2SettingsSection>

        <p style={{ ...v2Styles.settingsHint, textAlign: "center", margin: 0 }}>
          {t("settings.footerPrivacy")}
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
          <Link href="/privacy" className="v2-link" style={v2Styles.textlink}>
            {t("settings.legalPrivacy")}
          </Link>
          <Link href="/terms" className="v2-link" style={v2Styles.textlink}>
            {t("settings.legalTerms")}
          </Link>
        </div>
      </div>
    </V2AppShell>
  );
}
