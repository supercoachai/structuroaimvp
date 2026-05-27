"use client";

import NextError from "next/error";
import { useEffect } from "react";

import { captureClientException } from "@/lib/posthog/captureExceptionClient";
import { getErrorUiCopy, resolveClientLocale } from "@/lib/i18n/clientLocale";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureClientException(error, {
      route: "global",
      digest: error.digest,
      boundary: "global-error",
    });
  }, [error]);

  const copy = getErrorUiCopy();
  const locale = resolveClientLocale();

  return (
    <html lang={locale}>
      <body>
        <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
          <p style={{ marginBottom: 12 }}>{copy.body}</p>
          <p style={{ marginBottom: 16, fontSize: "0.85rem", color: "#64748b" }}>
            {copy.translatorNote}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginRight: 8,
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            {copy.retryLabel}
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "none",
              background: "#2563eb",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            {copy.refreshLabel}
          </button>
        </div>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
