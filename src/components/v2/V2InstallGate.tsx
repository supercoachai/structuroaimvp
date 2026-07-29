"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import StructuroLogoLoading from "@/components/structuro/StructuroLogoLoading";
import {
  PWA_INSTALL_FROM_APP_PATH,
  shouldShowPwaInstallHint,
} from "@/lib/pwaInstallHint";

/**
 * Op home voor ingelogde users: eenmalig naar PWA-install als de hint nog
 * relevant is. Dek gift/comp, override, event-trial én Stripe-users af die
 * de install anders oversloegen (geen checkout-return).
 *
 * Alleen mounten vanuit HomeV2Client (server rendert die alleen bij sessie).
 */
export default function V2InstallGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!shouldShowPwaInstallHint()) {
      setReady(true);
      return;
    }
    router.replace(PWA_INSTALL_FROM_APP_PATH);
  }, [router]);

  if (!ready) {
    return (
      <StructuroLogoLoading
        fullScreen={false}
        className="min-h-[50vh] bg-transparent"
        size={72}
      />
    );
  }

  return <>{children}</>;
}
