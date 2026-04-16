"use client";

import { Suspense, type ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import ErrorBoundary from "@/components/ErrorBoundary";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { TaskProvider } from "@/context/TaskContext";
import { SidebarProvider } from "@/contexts/SidebarContext";

/** Zichtbare fallback zonder Tailwind — voorkomt ‘wit scherm’ bij trage chunks of Suspense. */
function FullscreenLoading() {
  return (
    <div
      style={{
        minHeight: "100vh",
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

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <>
        <GoogleAnalytics />
        <TaskProvider>
          <SidebarProvider>
            <Suspense fallback={<FullscreenLoading />}>{children}</Suspense>
          </SidebarProvider>
        </TaskProvider>
        <Analytics />
        <SpeedInsights />
      </>
    </ErrorBoundary>
  );
}
