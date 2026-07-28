"use client";

import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isBarePagePath, shouldUseAppShell } from "@/lib/appShell";
import {
  isPrivacySetupCompleted,
  migrateLegacyPrivacySetupIfNeeded,
} from "@/lib/privacySetup";
import { useConsent } from "@/lib/posthog/ConsentContext";
import { resolveLiveHomePathClient } from "@/lib/v2/v2LabAccess";

export function PrivacySetupGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { consentReady } = useConsent();
  const [legacyChecked, setLegacyChecked] = useState(false);

  useLayoutEffect(() => {
    migrateLegacyPrivacySetupIfNeeded();
    setLegacyChecked(true);
  }, []);

  useEffect(() => {
    if (!legacyChecked || !consentReady) return;

    const onConsentPage = pathname === "/consent" || pathname.startsWith("/consent/");

    if (isPrivacySetupCompleted()) {
      if (onConsentPage) router.replace(resolveLiveHomePathClient());
      return;
    }

    if (onConsentPage || isBarePagePath(pathname)) return;

    if (shouldUseAppShell(pathname)) {
      router.replace("/consent");
    }
  }, [consentReady, legacyChecked, pathname, router]);

  return children;
}
