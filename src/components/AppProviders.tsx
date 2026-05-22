"use client";

import { Suspense, useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import ErrorBoundary from "@/components/ErrorBoundary";
import { DeferredVercelObservability } from "@/components/DeferredVercelObservability";
import { VisualViewportBridge } from "@/components/VisualViewportBridge";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { TaskProvider } from "@/context/TaskContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { trackSessionAbandoned } from "@/utils/events";
import { AnalyticsInternalBridge } from "@/components/AnalyticsInternalBridge";
import { PasswordRecoveryRedirect } from "@/components/PasswordRecoveryRedirect";
import { I18nProvider } from "@/lib/i18n";
import { ConsentProvider } from "@/lib/posthog/ConsentContext";
import { PostHogProvider } from "@/lib/posthog/PostHogProvider";
import { PostHogPageviews } from "@/components/posthog/PostHogPageviews";
import { PostHogAuthEffects } from "@/components/posthog/PostHogAuthEffects";
import { SignupAttributionCapture } from "@/components/SignupAttributionCapture";
import { CookieBanner } from "@/components/posthog/CookieBanner";

/** Zichtbare fallback zonder Tailwind — voorkomt ‘wit scherm’ bij trage chunks of Suspense. */
function FullscreenLoading() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f3f4f6",
        color: "#111827",
        padding: 24,
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: "1.1rem", fontWeight: 600, margin: "0 0 8px" }}>
          Structuro laden…
        </p>
        <p style={{ fontSize: "0.875rem", margin: 0, opacity: 0.75 }}>
          Een ogenblik geduld.
        </p>
      </div>
    </div>
  );
}

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

/**
 * Wachtlijst-/inschrijfpagina: geen TaskProvider (geen sync met ingelogde app-state).
 * Voorkomt dat anonieme bezoekers onnodig de volledige app-shell laden.
 */
function isWaitlistMarketingPath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === "/wachtlijst" || pathname === "/wachtlijst/") return true;
  return pathname === "/inschrijven" || pathname.startsWith("/inschrijven/");
}

function ConditionalAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (isWaitlistMarketingPath(pathname)) {
    return <Suspense fallback={<FullscreenLoading />}>{children}</Suspense>;
  }
  return (
    <TaskProvider>
      <SidebarProvider>
        <Suspense fallback={<FullscreenLoading />}>{children}</Suspense>
      </SidebarProvider>
    </TaskProvider>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <ConsentProvider>
          <PostHogProvider>
            <Suspense fallback={null}>
              <PostHogPageviews />
            </Suspense>
            <PostHogAuthEffects />
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
