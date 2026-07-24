"use client";

import { useEffect } from "react";

import { CalmErrorPanel } from "@/components/CalmErrorPanel";
import { captureClientException } from "@/lib/posthog/captureExceptionClient";
import { getErrorUiCopy, resolveClientLocale } from "@/lib/i18n/clientLocale";
import { normalizeError } from "@/lib/normalizeError";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const normalized = normalizeError(error);
    captureClientException(normalized, {
      route: "global",
      digest: "digest" in error ? error.digest : undefined,
      boundary: "global-error",
    });
  }, [error]);

  const copy = getErrorUiCopy();
  const locale = resolveClientLocale();

  return (
    <html lang={locale}>
      <body style={{ margin: 0, backgroundColor: "#fdfbf4" }}>
        <CalmErrorPanel
          fullScreen
          title={copy.title}
          body={copy.body}
          note={copy.translatorNote}
          retryLabel={copy.retryLabel}
          refreshLabel={copy.refreshLabel}
          onRetry={() => reset()}
        />
      </body>
    </html>
  );
}
