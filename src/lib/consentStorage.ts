/** Telecomwet-kader: GA4 pas na expliciete analytics-toestemming. */

export const CONSENT_STORAGE_KEY = "structuro_consent_v1";

export type ConsentPayload = {
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
};

function safeParse(raw: string | null): ConsentPayload | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<ConsentPayload>;
    return {
      analytics: Boolean(o.analytics),
      marketing: Boolean(o.marketing),
      timestamp: typeof o.timestamp === "string" ? o.timestamp : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function readStoredConsent(): ConsentPayload | null {
  if (typeof window === "undefined") return null;
  try {
    return safeParse(window.localStorage.getItem(CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeConsent(patch: Partial<Pick<ConsentPayload, "analytics" | "marketing">>): ConsentPayload {
  const prev = readStoredConsent();
  const next: ConsentPayload = {
    analytics: patch.analytics ?? prev?.analytics ?? false,
    marketing: patch.marketing ?? prev?.marketing ?? false,
    timestamp: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("structuro_consent_changed", { detail: next }));
  }
  return next;
}

export function hasAnalyticsConsent(): boolean {
  return readStoredConsent()?.analytics === true;
}

/** Verwijdert alle keuzes zodat de consentbanner terugkomt na `structuro_consent_changed`. */
export function clearStoredConsent(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CONSENT_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("structuro_consent_changed"));
  } catch {
    /* ignore */
  }
}
