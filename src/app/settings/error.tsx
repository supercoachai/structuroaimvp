"use client";

import { useEffect } from "react";

import { CalmErrorPanel } from "@/components/CalmErrorPanel";
import { getErrorUiCopy } from "@/lib/i18n/clientLocale";
import { tryRecoverableChunkReload } from "@/lib/recoverableChunkReload";

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    tryRecoverableChunkReload(error);
  }, [error]);

  const copy = getErrorUiCopy();

  return (
    <CalmErrorPanel
      fullScreen
      title={copy.title}
      body={copy.body}
      retryLabel={copy.retryLabel}
      refreshLabel={copy.refreshLabel}
      onRetry={() => reset()}
    />
  );
}
