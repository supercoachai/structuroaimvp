"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { AuthMessagePanel } from "@/components/auth/AuthMessagePanel";
import { parseAuthHashFragment } from "@/lib/auth/recoveryHash";
import { useI18n } from "@/lib/i18n";
import StructuroLogoLoading from "@/components/structuro/StructuroLogoLoading";

function isPkceVerifierError(
  errorCode: string | null,
  errorDescription: string | null
): boolean {
  if (errorCode === "pkce_code_verifier_not_found") return true;
  const desc = (errorDescription ?? "").toLowerCase();
  return (
    desc.includes("pkce") ||
    desc.includes("code verifier") ||
    desc.includes("code_verifier")
  );
}

function AuthCodeErrorContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const [hashChecked, setHashChecked] = useState(false);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    const parsed = parseAuthHashFragment(window.location.hash);
    if (parsed.hasRecoveryTokens) {
      setRecovering(true);
    }
    setHashChecked(true);
  }, []);

  const hashParams = useMemo(
    () =>
      typeof window !== "undefined"
        ? parseAuthHashFragment(window.location.hash)
        : parseAuthHashFragment(""),
    [hashChecked]
  );

  const errorCode =
    hashParams.errorCode ??
    searchParams?.get("error_code") ??
    searchParams?.get("error") ??
    null;
  const errorDescription =
    hashParams.errorDescription ??
    searchParams?.get("error_description") ??
    null;

  const isPkce = isPkceVerifierError(errorCode, errorDescription);

  const { title, body, primaryHref, primaryLabel, secondaryHref, secondaryLabel } =
    useMemo(() => {
      if (errorCode === "otp_expired") {
        return {
          title: t("authError.otpTitle"),
          body: t("authError.otpBody"),
          primaryHref: "/login?herstel=1",
          primaryLabel: t("authError.ctaReset"),
          secondaryHref: "/login",
          secondaryLabel: t("authError.ctaLogin"),
        };
      }
      if (isPkce) {
        return {
          title: t("authError.pkceTitle"),
          body: t("authError.pkceBody"),
          primaryHref: "/login",
          primaryLabel: t("authError.ctaMagic"),
          secondaryHref: "/login?herstel=1",
          secondaryLabel: t("authError.ctaReset"),
        };
      }
      if (errorCode === "exchange_failed") {
        return {
          title: t("authError.exchangeTitle"),
          body: t("authError.exchangeBody"),
          primaryHref: "/login?herstel=1",
          primaryLabel: t("authError.ctaReset"),
          secondaryHref: "/login",
          secondaryLabel: t("authError.ctaLogin"),
        };
      }
      if (errorCode === "missing_code") {
        return {
          title: t("authError.missingTitle"),
          body: t("authError.missingBody"),
          primaryHref: "/login?herstel=1",
          primaryLabel: t("authError.ctaReset"),
          secondaryHref: "/login",
          secondaryLabel: t("authError.ctaLogin"),
        };
      }
      return {
        title: t("authError.genericTitle"),
        body: t("authError.genericBody"),
        primaryHref: "/login",
        primaryLabel: t("authError.ctaLogin"),
        secondaryHref: "/login?herstel=1",
        secondaryLabel: t("authError.ctaReset"),
      };
    }, [errorCode, isPkce, t]);

  if (!hashChecked || recovering) {
    return <StructuroLogoLoading />;
  }

  return (
    <AuthMessagePanel
      title={title}
      body={body}
      primaryHref={primaryHref}
      primaryLabel={primaryLabel}
      secondaryHref={secondaryHref}
      secondaryLabel={secondaryLabel}
    />
  );
}

export default function AuthCodeErrorPage() {
  return (
    <Suspense fallback={<StructuroLogoLoading />}>
      <AuthCodeErrorContent />
    </Suspense>
  );
}
