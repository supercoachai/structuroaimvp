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
import { PasswordRecoveryRedirect } from "@/components/PasswordRecoveryRedirect";
import { I18nProvider } from "@/lib/i18n";
import { ConsentProvider } from "@/lib/posthog/ConsentContext";
import { PostHogProvider } from "@/lib/posthog/PostHogProvider";
import { PostHogPageviews } from "@/components/posthog/PostHogPageviews";
import { PostHogAuthEffects } from "@/components/posthog/PostHogAuthEffects";
import { AppOpenedTracker } from "@/components/posthog/AppOpenedTracker";
import { SignupAttributionCapture } from "@/components/SignupAttributionCapture";
import { CookieBanner } from "@/components/posthog/CookieBanner";
import { MarketingWaitlistConsent } from "@/components/posthog/MarketingWaitlistConsent";
import AppLayout from "@/components/layout/AppLayout";
import { isBarePagePath, shouldUseAppShell } from "@/lib/appShell";
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
    return <Suspense fallback={null}>{children}</Suspense>;
  }
  const content = shouldUseAppShell(pathname) ? (
    <AppLayout>{children}</AppLayout>
  ) : (
    children
  );
  return (
    <TaskProvider>
      <InfoDismissalsProvider>
        <SidebarProvider>
          <div className="flex h-full min-h-0 w-full flex-1 flex-col">
            <Suspense fallback={null}>{content}</Suspense>
          </div>
        </SidebarProvider>
      </InfoDismissalsProvider>
    </TaskProvider>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <ConsentProvider>
          <PostHogProvider>
            <MarketingWaitlistConsent />
            <Suspense fallback={null}>
              <PostHogPageviews />
            </Suspense>
            <PostHogAuthEffects />
            <AppOpenedTracker />
            <SignupAttributionCapture />
            <RemoveLegacyFocusDurationKey />
            <PasswordRecoveryRedirect />
            <AnalyticsInternalBridge />
            <Suspense fallback={null}>
              <GaSessionAbandonListener />
            </Suspense>
            <VisualViewportBridge />
            <GoogleAnalytics />
            <ConditionalAppShell>{children}</ConditionalAppShell>
            <DeferredVercelObservability />
          </PostHogProvider>
          <CookieBanner />
        </ConsentProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}
