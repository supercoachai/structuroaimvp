"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { captureProductEvent } from "@/lib/posthog/track";
import {
  detectMobileInstallPlatform,
  type MobileInstallPlatform,
} from "@/lib/pwaInstallHint";
import { usePwaInstallPrompt } from "@/lib/usePwaInstallPrompt";

type WelkomInstallHintProps = {
  visible: boolean;
  onContinue: () => void;
  continueBusy?: boolean;
  continueLabel: string;
  skipLabel: string;
  busyLabel: string;
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
  return <p dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function WelkomInstallHint({
  visible,
  onContinue,
  continueBusy = false,
  continueLabel,
  skipLabel,
  busyLabel,
}: WelkomInstallHintProps) {
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
    if (!visible || shownCaptured.current) return;
    shownCaptured.current = true;
    captureProductEvent("pwa_install_hint_shown", {
      platform_hint: detectMobileInstallPlatform() ?? platform,
    });
  }, [visible, platform]);

  useEffect(() => {
    if (!visible || !canPromptInstall || platform !== "android") return;
    captureProductEvent("pwa_install_prompt_available", {
      platform_hint: "android",
    });
  }, [visible, canPromptInstall, platform]);

  if (!visible) return null;

  const handleContinue = () => {
    captureProductEvent("pwa_install_hint_skipped", { platform_hint: platform });
    onContinue();
  };

  const handleNativeInstall = async () => {
    if (installBusy) return;
    setInstallBusy(true);
    captureProductEvent("pwa_install_prompt_clicked", { platform_hint: "android" });
    try {
      const outcome = await promptInstall();
      captureProductEvent("pwa_install_prompt_result", {
        platform_hint: "android",
        outcome,
      });
    } finally {
      setInstallBusy(false);
    }
  };

  const showNativeAndroidInstall = platform === "android" && canPromptInstall;

  return (
    <>
      <div className="card">
        <div className="seg" role="tablist" aria-label="Platform">
          {(["ios", "android"] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={platform === id}
              className={platform === id ? "on" : undefined}
              onClick={() => setPlatform(id)}
            >
              {t(id === "ios" ? "welkomPage.installTabIos" : "welkomPage.installTabAndroid")}
            </button>
          ))}
        </div>

        {showNativeAndroidInstall ? (
          <div className="native-install">
            <button
              type="button"
              className="btn-native"
              disabled={installBusy}
              onClick={() => void handleNativeInstall()}
            >
              {installBusy ? busyLabel : t("welkomPage.installAndroidNativeCta")}
            </button>
          </div>
        ) : null}

        <div className="steps">
          {STEP_KEYS[platform].map((key, index) => (
            <div className="step" key={key}>
              <span className="num">{index + 1}</span>
              <InstallStepText html={t(key)} />
            </div>
          ))}
        </div>

        <p className="hint">{t(HINT_KEYS[platform])}</p>
      </div>

      <div className="actions">
        <button
          type="button"
          className="btn-primary"
          disabled={continueBusy}
          onClick={handleContinue}
        >
          {continueBusy ? busyLabel : continueLabel}
          {!continueBusy ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke="#fff"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : null}
        </button>
        <div className="skip">
          <button type="button" onClick={handleContinue}>
            {skipLabel}
          </button>
        </div>
      </div>
    </>
  );
}
