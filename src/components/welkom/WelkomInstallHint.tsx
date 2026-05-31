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

export default function WelkomInstallHint({
  visible,
  onContinue,
  continueBusy = false,
  continueLabel,
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
    <div className="w-full max-w-sm text-left">
      <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm backdrop-blur-sm">
        <p className="text-sm font-semibold text-slate-900">
          {t("welkomPage.installTitle")}
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
          {t("welkomPage.installBody")}
        </p>

        <div className="mt-4 flex gap-2">
          {(["ios", "android"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setPlatform(id)}
              className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                platform === id
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
              }`}
            >
              {t(id === "ios" ? "welkomPage.installTabIos" : "welkomPage.installTabAndroid")}
            </button>
          ))}
        </div>

        {showNativeAndroidInstall ? (
          <div className="mt-4">
            <button
              type="button"
              disabled={installBusy}
              onClick={() => void handleNativeInstall()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60"
            >
              {installBusy ? (
                <>
                  <span
                    className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                    aria-hidden
                  />
                  {busyLabel}
                </>
              ) : (
                t("welkomPage.installAndroidNativeCta")
              )}
            </button>
            <p className="mt-2 text-center text-[11px] leading-relaxed text-slate-500">
              {t("welkomPage.installAndroidNativeHint")}
            </p>
          </div>
        ) : null}

        {platform === "android" && showNativeAndroidInstall ? (
          <p className="mt-4 text-[11px] font-medium text-slate-500">
            {t("welkomPage.installAndroidFallbackNote")}
          </p>
        ) : null}

        <ol className={`space-y-2.5 ${showNativeAndroidInstall ? "mt-3" : "mt-4"}`}>
          {STEP_KEYS[platform].map((key, index) => (
            <li key={key} className="flex gap-2.5 text-xs leading-relaxed text-slate-700">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">
                {index + 1}
              </span>
              <span>{t(key)}</span>
            </li>
          ))}
        </ol>

        {platform === "ios" ? (
          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
            {t("welkomPage.installIosSafariNote")}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        disabled={continueBusy}
        onClick={handleContinue}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 active:scale-[0.98] disabled:opacity-60"
      >
        {continueBusy ? (
          <>
            <span
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"
              aria-hidden
            />
            {busyLabel}
          </>
        ) : (
          continueLabel
        )}
      </button>
    </div>
  );
}
