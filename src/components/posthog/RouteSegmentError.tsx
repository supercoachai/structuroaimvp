"use client";

import { useEffect } from "react";

import { CalmErrorPanel } from "@/components/CalmErrorPanel";
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
    <CalmErrorPanel
      title={copy.title}
      body={copy.body}
      retryLabel={copy.retryLabel}
      refreshLabel={copy.refreshLabel}
      onRetry={() => reset()}
    />
  );
}
