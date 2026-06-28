"use client";

import { Suspense, useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import ErrorBoundary from "@/components/ErrorBoundary";
import { DeferredVercelObservability } from "@/components/DeferredVercelObservability";
import { VisualViewportBridge } from "@/components/VisualViewportBridge";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { TaskProvider } from "@/context/TaskContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { InfoDismissalsProvider } from "@/contexts/InfoDismissalsContext";
import { trackSessionAbandoned } from "@/utils/events";
import { AnalyticsInternalBridge } from "@/components/AnalyticsInternalBridge";
import { AuthHashErrorRedirect } from "@/components/AuthHashErrorRedirect";
import { PasswordRecoveryRedirect } from "@/components/PasswordRecoveryRedirect";
import { I18nProvider } from "@/lib/i18n";
import { ConsentProvider } from "@/lib/posthog/ConsentContext";
import { PostHogProvider } from "@/lib/posthog/PostHogProvider";
import { PostHogPageviews } from "@/components/posthog/PostHogPageviews";
import { PostHogAuthEffects } from "@/components/posthog/PostHogAuthEffects";
import { AppOpenedTracker } from "@/components/posthog/AppOpenedTracker";
import { SignupAttributionCapture } from "@/components/SignupAttributionCapture";
import { CookieBanner } from "@/components/posthog/CookieBanner";
import { MarketingAcquisitionConsent } from "@/components/posthog/MarketingAcquisitionConsent";
import { AcquisitionLandingTracker } from "@/components/posthog/AcquisitionLandingTracker";
import { OnboardingActivationTracker } from "@/components/posthog/OnboardingActivationTracker";
import AppLayout from "@/components/layout/AppLayout";
import { ClientRuntimeGuards } from "@/components/ClientRuntimeGuards";
import AppShellSuspenseFallback from "@/components/shell/AppShellSuspenseFallback";
import { ToastHost } from "@/components/Toast";
import { PrivacySetupGate } from "@/components/consent/PrivacySetupGate";
import { shouldUseAppShell } from "@/lib/appShell";
import { isWaitlistMarketingPath } from "@/lib/marketingPaths";

/** Eenmalig: oude key die focusduur bevatte; duration komt nu alleen uit URL + taak. */
function RemoveLegacyFocusDurationKey() {
  useEffect(() => {
    try {
      localStorage.removeItem("focus_duration");
    } catch {
      /* ignore */
    }
  }, []);
  return null;
}

function GaSessionAbandonListener() {
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname ?? "/";

  useEffect(() => {
    const onLeave = () => {
      trackSessionAbandoned(pathRef.current || "/");
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, []);

  return null;
}

function ConditionalAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (isWaitlistMarketingPath(pathname)) {
    return <Suspense fallback={<AppShellSuspenseFallback />}>{children}</Suspense>;
  }
  const skipTaskProvider =
    pathname === "/abonnement" ||
    pathname?.startsWith("/abonnement/") ||
    pathname?.startsWith("/welkom/install");
  const content = shouldUseAppShell(pathname) ? (
    <AppLayout>{children}</AppLayout>
  ) : (
    children
  );
  const shell = (
    <InfoDismissalsProvider>
      <SidebarProvider>
        <div className="flex h-full min-h-0 w-full flex-1 flex-col">
          <Suspense fallback={<AppShellSuspenseFallback />}>{content}</Suspense>
        </div>
      </SidebarProvider>
    </InfoDismissalsProvider>
  );
  if (skipTaskProvider) {
    return shell;
  }
  return <TaskProvider>{shell}</TaskProvider>;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <ConsentProvider>
          <PostHogProvider>
            <MarketingAcquisitionConsent />
            <Suspense fallback={null}>
              <PostHogPageviews />
              <AcquisitionLandingTracker />
              <OnboardingActivationTracker />
            </Suspense>
            <SignupAttributionCapture />
            <PostHogAuthEffects />
            <AppOpenedTracker />
            <RemoveLegacyFocusDurationKey />
            <ClientRuntimeGuards />
            <AuthHashErrorRedirect />
            <PasswordRecoveryRedirect />
            <AnalyticsInternalBridge />
            <Suspense fallback={null}>
              <GaSessionAbandonListener />
            </Suspense>
            <VisualViewportBridge />
            <GoogleAnalytics />
            <PrivacySetupGate>
              <ConditionalAppShell>{children}</ConditionalAppShell>
            </PrivacySetupGate>
            <DeferredVercelObservability />
          </PostHogProvider>
          <CookieBanner />
          <ToastHost />
        </ConsentProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}
