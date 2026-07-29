"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useI18n } from "@/lib/i18n";
import {
  markPwaInstallHintDismissed,
  shouldShowPwaInstallHint,
} from "@/lib/pwaInstallHint";

import V2InstallHint from "./V2InstallHint";
import { V2Header, V2Page, V2Reassurance } from "./V2Chrome";
import StructuroLogoLoading from "@/components/structuro/StructuroLogoLoading";
import { trackV2PwaInstallSkipped } from "./v2Analytics";
import { v2FlowWrapStyle, v2Styles } from "./theme";

type InstallFrom = "settings" | "consent" | "app" | null;

/** from=app|checkout|stripe → terug naar home na install. */
function resolveInstallFrom(
  raw: string | null | undefined,
): InstallFrom {
  if (raw === "settings" || raw === "consent") return raw;
  if (raw === "app" || raw === "checkout" || raw === "stripe") return "app";
  return null;
}

function continueHrefFor(from: InstallFrom): string {
  if (from === "settings") return "/settings";
  if (from === "consent") return "/consent";
  if (from === "app") return "/";
  return "/onboarding";
}

export default function InstallV2Client() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const previewInstall =
    process.env.NODE_ENV === "development" &&
    searchParams?.get("previewInstall") === "1";
  const from = resolveInstallFrom(searchParams?.get("from"));
  const explicitReturn = from !== null;
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const continueHref = continueHrefFor(from);
  const continueLabel =
    from === "settings"
      ? t("welkomPage.installContinueSettings")
      : from === "consent"
        ? t("welkomPage.installContinueConsent")
        : from === "app"
          ? t("welkomPage.installContinueHome")
          : t("welkomPage.installContinueCta");

  useEffect(() => {
    if (previewInstall || explicitReturn) {
      // Settings/consent: altijd tonen. App/checkout: alleen als hint nog relevant.
      if (from === "app" && !previewInstall && !shouldShowPwaInstallHint()) {
        router.replace("/");
        return;
      }
      setReady(true);
      return;
    }
    if (!shouldShowPwaInstallHint()) {
      router.replace("/onboarding");
      return;
    }
    setReady(true);
  }, [previewInstall, explicitReturn, from, router]);

  const continueToNext = () => {
    if (busy) return;
    setBusy(true);
    markPwaInstallHintDismissed();
    trackV2PwaInstallSkipped();
    router.push(continueHref);
  };

  if (!ready) {
    return (
      <V2Page>
        <StructuroLogoLoading fullScreen={false} className="min-h-[50vh] bg-transparent" size={72} />
      </V2Page>
    );
  }

  return (
    <V2Page>
      <V2Header exitHref={continueHref} />

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
