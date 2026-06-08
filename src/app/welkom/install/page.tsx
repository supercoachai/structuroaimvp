"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import WelkomInstallHint from "@/components/welkom/WelkomInstallHint";
import { useI18n } from "@/lib/i18n";
import { shouldShowPwaInstallHint } from "@/lib/pwaInstallHint";
import "./homescreen-install.css";

function WelkomInstallPageInner() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const previewInstall =
    process.env.NODE_ENV === "development" &&
    searchParams?.get("previewInstall") === "1";
  const fromParam = searchParams?.get("from");
  const returnPath =
    fromParam === "consent"
      ? "/consent"
      : fromParam === "settings"
        ? "/settings"
        : null;
  const [ready, setReady] = useState(false);
  const explicitReturn = returnPath !== null;

  useEffect(() => {
    if (previewInstall || explicitReturn) {
      setReady(true);
      return;
    }
    if (!shouldShowPwaInstallHint()) {
      router.replace("/onboarding");
      return;
    }
    setReady(true);
  }, [previewInstall, explicitReturn, router]);

  const backHref =
    returnPath ?? (previewInstall ? "/welkom?previewInstall=1" : "/welkom");

  if (!ready) {
    return (
      <div className="homescreen-install">
        <p className="loading">…</p>
      </div>
    );
  }

  return (
    <div className="homescreen-install">
      <main className="screen">
        <div className="topbar">
          <button
            type="button"
            className="back"
            onClick={() => router.push(backHref)}
            aria-label={t("welkomPage.installBack")}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M15 5l-7 7 7 7"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className="head">
          <p className="kicker">{t("welkomPage.installKicker")}</p>
          <h1>
            {t("welkomPage.installHeadingLine1")}
            <br />
            {t("welkomPage.installHeadingLine2")}
          </h1>
          <p className="sub">{t("welkomPage.installBody")}</p>
        </div>

        <WelkomInstallHint
          visible
          onContinue={() => router.push(returnPath ?? "/onboarding")}
          continueLabel={
            fromParam === "consent"
              ? t("welkomPage.installContinueConsent")
              : fromParam === "settings"
                ? t("welkomPage.installContinueSettings")
                : t("welkomPage.installContinueCta")
          }
          skipLabel={t("welkomPage.installSkip")}
          busyLabel={t("registrerenPage.submitBusy")}
        />
      </main>
    </div>
  );
}

export default function WelkomInstallPage() {
  return (
    <Suspense
      fallback={
        <div className="homescreen-install">
          <p className="loading">…</p>
        </div>
      }
    >
      <WelkomInstallPageInner />
    </Suspense>
  );
}
