"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import {
  ANALYTICS_CONSENT_KEY,
  readAnalyticsConsentFromStorage,
} from "./consentStorage";

export type ConsentState = "unknown" | "granted" | "denied";

type ConsentContextValue = {
  consent: ConsentState;
  /** localStorage gelezen; voorkomt cookiebanner-flash bij refresh. */
  consentReady: boolean;
  grant: () => void;
  deny: () => void;
  reset: () => void;
};

const ConsentContext = createContext<ConsentContextValue>({
  consent: "unknown",
  consentReady: false,
  grant: () => {},
  deny: () => {},
  reset: () => {},
});

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<ConsentState>("unknown");
  const [consentReady, setConsentReady] = useState(false);

  useLayoutEffect(() => {
    const stored = readAnalyticsConsentFromStorage();
    if (stored) setConsent(stored);
    setConsentReady(true);
  }, []);

  const grant = useCallback(() => {
    try {
      localStorage.setItem(ANALYTICS_CONSENT_KEY, "granted");
    } catch {
      /* ignore */
    }
    setConsent("granted");
  }, []);

  const deny = useCallback(() => {
    try {
      localStorage.setItem(ANALYTICS_CONSENT_KEY, "denied");
    } catch {
      /* ignore */
    }
    setConsent("denied");
  }, []);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(ANALYTICS_CONSENT_KEY);
    } catch {
      /* ignore */
    }
    setConsent("unknown");
  }, []);

  const value = useMemo(
    () => ({ consent, consentReady, grant, deny, reset }),
    [consent, consentReady, grant, deny, reset]
  );

  return (
    <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
  );
}

export const useConsent = () => useContext(ConsentContext);
