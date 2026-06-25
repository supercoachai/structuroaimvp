"use client";

import { useEffect } from "react";

import { captureClientException } from "@/lib/posthog/captureExceptionClient";
import { getRouteErrorUiCopy } from "@/lib/i18n/clientLocale";
import { tryRecoverableChunkReload } from "@/lib/recoverableChunkReload";

type RouteSegmentErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
  route: string;
  extra?: Record<string, unknown>;
};

export function RouteSegmentError({
  error,
  reset,
  route,
  extra,
}: RouteSegmentErrorProps) {
  useEffect(() => {
    if (tryRecoverableChunkReload(error)) return;
    captureClientException(error, {
      route,
      digest: error.digest,
      ...extra,
    });
  }, [error, route, extra]);

  const copy = getRouteErrorUiCopy();

  return (
    <div
      style={{
        minHeight: "50dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: "100%",
          backgroundColor: "#ffffff",
          borderRadius: 12,
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          border: "1px solid #e2e8f0",
          padding: 24,
        }}
      >
        <h1
          style={{
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "#0f172a",
            margin: "0 0 8px",
          }}
        >
          {copy.title}
        </h1>
        <p
          style={{
            fontSize: "0.95rem",
            color: "#475569",
            margin: "0 0 16px",
            lineHeight: 1.5,
          }}
        >
          {copy.body}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              width: "100%",
              padding: "10px 16px",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: "0.95rem",
              cursor: "pointer",
            }}
          >
            {copy.retryLabel}
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              width: "100%",
              padding: "10px 16px",
              backgroundColor: "#f8fafc",
              color: "#334155",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: "0.95rem",
              cursor: "pointer",
            }}
          >
            {copy.refreshLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
