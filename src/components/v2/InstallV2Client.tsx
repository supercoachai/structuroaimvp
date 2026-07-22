"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useI18n } from "@/lib/i18n";
import { shouldShowPwaInstallHint } from "@/lib/pwaInstallHint";

import V2InstallHint from "./V2InstallHint";
import { V2Header, V2Page, V2Reassurance } from "./V2Chrome";
import { trackV2PwaInstallSkipped } from "./v2Analytics";
import { v2FlowWrapStyle, v2Styles } from "./theme";

export default function InstallV2Client() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const previewInstall =
    process.env.NODE_ENV === "development" &&
    searchParams?.get("previewInstall") === "1";
  const fromSettings = searchParams?.get("from") === "settings";
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const continueHref = fromSettings ? "/v2/settings" : "/v2/onboarding";
  const continueLabel = fromSettings
    ? t("welkomPage.installContinueSettings")
    : t("welkomPage.installContinueCta");

  useEffect(() => {
    if (previewInstall || fromSettings) {
      setReady(true);
      return;
    }
    if (!shouldShowPwaInstallHint()) {
      router.replace("/v2/onboarding");
      return;
    }
    setReady(true);
  }, [previewInstall, fromSettings, router]);

  const continueToNext = () => {
    if (busy) return;
    setBusy(true);
    trackV2PwaInstallSkipped();
    router.push(continueHref);
  };

  if (!ready) {
    return (
      <V2Page>
        <p style={{ ...v2Styles.body, textAlign: "center", margin: "auto" }}>
          …
        </p>
      </V2Page>
    );
  }

  return (
    <V2Page>
      <V2Header exitHref={fromSettings ? "/v2/settings" : "/v2/onboarding"} />

      <div style={v2Styles.flowShell}>
        <div style={v2FlowWrapStyle("welcome")}>
          <section className="v2-fade" style={{ ...v2Styles.card, gap: 12 }}>
            <p style={v2Styles.kicker}>{t("welkomPage.installKicker")}</p>
            <h1 style={v2Styles.title}>
              {t("welkomPage.installHeadingLine1")}
              <br />
              {t("welkomPage.installHeadingLine2")}
            </h1>
            <p style={v2Styles.body}>{t("welkomPage.installBody")}</p>
          </section>

          <V2InstallHint
            onContinue={continueToNext}
            continueBusy={busy}
            continueLabel={continueLabel}
          />

          <V2Reassurance>Overslaan mag altijd. Je kunt dit later in instellingen.</V2Reassurance>
        </div>
      </div>
    </V2Page>
  );
}
