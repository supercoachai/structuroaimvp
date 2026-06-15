export type ParsedAuthHash = {
  type: string | null;
  errorCode: string | null;
  errorDescription: string | null;
  hasRecoveryTokens: boolean;
  hasAuthError: boolean;
};

function parseHashParams(hash: string): URLSearchParams {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  return new URLSearchParams(raw);
}

export function parseAuthHashFragment(hash: string): ParsedAuthHash {
  if (!hash || hash === "#") {
    return {
      type: null,
      errorCode: null,
      errorDescription: null,
      hasRecoveryTokens: false,
      hasAuthError: false,
    };
  }

  const params = parseHashParams(hash);
  const type = params.get("type");
  const errorCode = params.get("error_code") ?? params.get("error");
  const errorDescription = params.get("error_description");
  const hasAccessToken = Boolean(params.get("access_token"));
  const hasRecoveryTokens = hasAccessToken && type === "recovery";
  const hasAuthError = Boolean(errorCode || params.get("error"));

  return {
    type,
    errorCode,
    errorDescription,
    hasRecoveryTokens,
    hasAuthError,
  };
}

export function clearAuthHashFromUrl(): void {
  if (typeof window === "undefined") return;
  try {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  } catch {
    /* ignore */
  }
}
