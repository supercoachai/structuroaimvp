"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ANALYTICS_CONSENT_KEY } from "./consentStorage";

export type ConsentState = "unknown" | "granted" | "denied";

type ConsentContextValue = {
  consent: ConsentState;
  grant: () => void;
  deny: () => void;
  reset: () => void;
};

const ConsentContext = createContext<ConsentContextValue>({
  consent: "unknown",
  grant: () => {},
  deny: () => {},
  reset: () => {},
});

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<ConsentState>("unknown");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(ANALYTICS_CONSENT_KEY);
      if (stored === "granted" || stored === "denied") {
        setConsent(stored);
      }
    } catch {
      /* ignore */
    }
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
    () => ({ consent, grant, deny, reset }),
    [consent, grant, deny, reset]
  );

  return (
    <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
  );
}

export const useConsent = () => useContext(ConsentContext);
