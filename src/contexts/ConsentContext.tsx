'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createClient } from '@/lib/supabase/client';

/** localStorage key – ook in resetStorage.ts opgenomen voor volledige wipe */
export const ANALYTICS_CONSENT_STORAGE_KEY = 'structuro_analytics_consent';

export type AnalyticsConsentValue = 'pending' | 'granted' | 'denied';

type ConsentContextType = {
  /** true zodra localStorage én (optioneel) profiel zijn uitgelezen */
  consentReady: boolean;
  analyticsConsent: AnalyticsConsentValue;
  /** Expliciete toestemming voor niet-strikt-noodzakelijke analytics (GA4) */
  hasAnalyticsConsent: boolean;
  grantAnalyticsConsent: () => void;
  denyAnalyticsConsent: () => void;
  /** Toon de banner opnieuw (bijv. vanuit Instellingen) zonder meteen keuze te wissen */
  reopenConsentBanner: () => void;
  /** Of de onderste banner zichtbaar moet zijn */
  showConsentBanner: boolean;
};

const ConsentContext = createContext<ConsentContextType | undefined>(undefined);

function readLocalConsent(): AnalyticsConsentValue {
  if (typeof window === 'undefined') return 'pending';
  try {
    const raw = localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    if (raw === 'granted' || raw === 'denied') return raw;
  } catch {
    /* ignore */
  }
  return 'pending';
}

async function fetchProfileConsent(userId: string): Promise<'granted' | 'denied' | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('analytics_consent')
      .eq('id', userId)
      .maybeSingle();
    if (error) return null;
    const v = data?.analytics_consent;
    if (v === 'granted' || v === 'denied') return v;
  } catch {
    /* tabel/kolom ontbreekt of netwerk */
  }
  return null;
}

async function persistProfileConsent(userId: string, value: 'granted' | 'denied') {
  try {
    const supabase = createClient();
    await supabase.from('profiles').upsert(
      { id: userId, analytics_consent: value },
      { onConflict: 'id' }
    );
  } catch {
    /* ignore */
  }
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [consentReady, setConsentReady] = useState(false);
  const [analyticsConsent, setAnalyticsConsent] =
    useState<AnalyticsConsentValue>('pending');
  const [forceBanner, setForceBanner] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const local = readLocalConsent();
      if (local !== 'pending') {
        if (!cancelled) {
          setAnalyticsConsent(local);
          setConsentReady(true);
        }
        return;
      }

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.id && !cancelled) {
          const fromProfile = await fetchProfileConsent(user.id);
          if (fromProfile) {
            try {
              localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, fromProfile);
            } catch {
              /* ignore */
            }
            setAnalyticsConsent(fromProfile);
          }
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setConsentReady(true);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const grantAnalyticsConsent = useCallback(() => {
    setAnalyticsConsent('granted');
    setForceBanner(false);
    try {
      localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, 'granted');
    } catch {
      /* ignore */
    }
    void (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.id) await persistProfileConsent(user.id, 'granted');
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const denyAnalyticsConsent = useCallback(() => {
    setAnalyticsConsent('denied');
    setForceBanner(false);
    try {
      localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, 'denied');
    } catch {
      /* ignore */
    }
    void (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.id) await persistProfileConsent(user.id, 'denied');
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const reopenConsentBanner = useCallback(() => {
    setForceBanner(true);
  }, []);

  const showConsentBanner =
    consentReady && (analyticsConsent === 'pending' || forceBanner);

  const value = useMemo<ConsentContextType>(
    () => ({
      consentReady,
      analyticsConsent,
      hasAnalyticsConsent: analyticsConsent === 'granted',
      grantAnalyticsConsent,
      denyAnalyticsConsent,
      reopenConsentBanner,
      showConsentBanner,
    }),
    [
      consentReady,
      analyticsConsent,
      grantAnalyticsConsent,
      denyAnalyticsConsent,
      reopenConsentBanner,
      showConsentBanner,
    ]
  );

  return (
    <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
  );
}

export function useConsent() {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    throw new Error('useConsent moet binnen ConsentProvider gebruikt worden');
  }
  return ctx;
}
