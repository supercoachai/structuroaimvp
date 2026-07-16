"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import { useI18n } from "@/lib/i18n";
import {
  detectMobileInstallPlatform,
  type MobileInstallPlatform,
} from "@/lib/pwaInstallHint";
import { usePwaInstallPrompt } from "@/lib/usePwaInstallPrompt";

import {
  trackV2PwaInstallPromptAvailable,
  trackV2PwaInstallPromptClicked,
  trackV2PwaInstallPromptResult,
  trackV2PwaInstallShown,
} from "./v2Analytics";
import { v2Styles } from "./theme";

type V2InstallHintProps = {
  onContinue: () => void;
  continueBusy?: boolean;
  continueLabel?: string;
};

const STEP_KEYS: Record<MobileInstallPlatform, string[]> = {
  ios: ["welkomPage.installIos1", "welkomPage.installIos2", "welkomPage.installIos3"],
  android: [
    "welkomPage.installAndroid1",
    "welkomPage.installAndroid2",
    "welkomPage.installAndroid3",
  ],
};

const HINT_KEYS: Record<MobileInstallPlatform, string> = {
  ios: "welkomPage.installIosSafariNote",
  android: "welkomPage.installAndroidHint",
};

function InstallStepText({ html }: { html: string }) {
  return (
    <p
      style={{ ...v2Styles.body, fontSize: 15, margin: 0, flex: 1 }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

const segGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 6,
  marginBottom: 4,
};

const segBtn = (active: boolean): CSSProperties => ({
  minHeight: 48,
  borderRadius: 12,
  border: active ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
  backgroundColor: active ? "rgba(45, 90, 86, 0.06)" : "#FFFFFF",
  color: active ? "var(--text)" : "var(--text-muted)",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
});

const stepRow: CSSProperties = {
  display: "flex",
  gap: 14,
  alignItems: "flex-start",
  padding: "12px 0",
  borderTop: "1px solid var(--border)",
};

const stepNum: CSSProperties = {
  flexShrink: 0,
  width: 28,
  height: 28,
  borderRadius: "50%",
  backgroundColor: "rgba(45, 90, 86, 0.1)",
  color: "var(--accent)",
  fontSize: 14,
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export default function V2InstallHint({
  onContinue,
  continueBusy = false,
  continueLabel,
}: V2InstallHintProps) {
  const { t } = useI18n();
  const [platform, setPlatform] = useState<MobileInstallPlatform>("ios");
  const [installBusy, setInstallBusy] = useState(false);
  const shownCaptured = useRef(false);
  const { canPromptInstall, promptInstall } = usePwaInstallPrompt();

  useEffect(() => {
    const detected = detectMobileInstallPlatform();
    if (detected) setPlatform(detected);
  }, []);

  useEffect(() => {
    if (shownCaptured.current) return;
    shownCaptured.current = true;
    trackV2PwaInstallShown(detectMobileInstallPlatform() ?? platform);
  }, [platform]);

  useEffect(() => {
    if (!canPromptInstall || platform !== "android") return;
    trackV2PwaInstallPromptAvailable();
  }, [canPromptInstall, platform]);

  const handleNativeInstall = async () => {
    if (installBusy) return;
    setInstallBusy(true);
    trackV2PwaInstallPromptClicked();
    try {
      const outcome = await promptInstall();
      trackV2PwaInstallPromptResult(outcome);
    } finally {
      setInstallBusy(false);
    }
  };

  const showNativeAndroidInstall = platform === "android" && canPromptInstall;

  return (
    <>
      <div style={{ ...v2Styles.card, padding: "18px 16px", gap: 12 }}>
        <div role="tablist" aria-label="Platform" style={segGrid}>
          {(["ios", "android"] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={platform === id}
              style={segBtn(platform === id)}
              onClick={() => setPlatform(id)}
            >
              {t(
                id === "ios"
                  ? "welkomPage.installTabIos"
                  : "welkomPage.installTabAndroid",
              )}
            </button>
          ))}
        </div>

        {showNativeAndroidInstall ? (
          <button
            type="button"
            className="v2-cta"
            style={v2Styles.cta}
            disabled={installBusy}
            onClick={() => void handleNativeInstall()}
          >
            {installBusy
              ? t("registrerenPage.submitBusy")
              : t("welkomPage.installAndroidNativeCta")}
          </button>
        ) : null}

        <div>
          {STEP_KEYS[platform].map((key, index) => (
            <div
              key={key}
              style={{
                ...stepRow,
                borderTop: index === 0 ? "none" : stepRow.borderTop,
                paddingTop: index === 0 ? 0 : 12,
              }}
            >
              <span style={stepNum}>{index + 1}</span>
              <InstallStepText html={t(key)} />
            </div>
          ))}
        </div>

        <p style={{ ...v2Styles.body, fontSize: 13, margin: 0 }}>
          {t(HINT_KEYS[platform])}
        </p>
      </div>

      <div style={v2Styles.actions}>
        <button
          type="button"
          className="v2-cta"
          style={v2Styles.cta}
          disabled={continueBusy}
          onClick={onContinue}
        >
          {continueBusy
            ? t("registrerenPage.submitBusy")
            : (continueLabel ?? t("welkomPage.installContinueCta"))}
        </button>
        <button
          type="button"
          style={v2Styles.skipLink}
          onClick={onContinue}
          disabled={continueBusy}
        >
          {t("welkomPage.installSkip")}
        </button>
      </div>
    </>
  );
}
