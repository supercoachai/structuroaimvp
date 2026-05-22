"use client";

import NextError from "next/error";
import { useEffect } from "react";

import { captureClientException } from "@/lib/posthog/captureExceptionClient";

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

  return (
    <html lang="nl">
      <body>
        <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
          <p style={{ marginBottom: 12 }}>
            Er ging iets mis in de app. Probeer de pagina te vernieuwen.
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
            Opnieuw proberen
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
            Pagina vernieuwen
          </button>
        </div>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
