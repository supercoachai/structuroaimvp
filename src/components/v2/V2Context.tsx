"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type V2Energy = "low" | "enough" | "high";

export type V2State = {
  /** Naam draagt door de reis zonder auth. */
  name: string;
  energy: V2Energy | null;
  /** Gekozen dingen van vandaag (aantal hangt af van energie). */
  things: string[];
  /** Zacht why-anker: waarvoor doe je dit. */
  why: string;
  /** Wat het je oplevert. */
  whyOutcome: string;
  /** Shutdown-light: lus van vandaag gesloten. */
  todayDone: boolean;
  /** Of cyclus optioneel is aangezet (vóór eerste energy/dagstart). */
  cyclusOptIn: boolean;
};

const STORAGE_KEY = "v2_journey";

/** Anonieme v2-keys op shared browsers. Niet user-scoped; wis bij login. */
export const V2_ANONYMOUS_STORAGE_KEYS = [
  STORAGE_KEY,
  "v2_dump",
  "v2_dump_draft",
  "v2_tasks",
  "v2_settings",
  "v2_adaptive",
] as const;

/**
 * Privacy over anon-state: bij auth wissen we anonieme v2-localStorage zodat
 * gebruiker B op een gedeelde browser geen dump/taken/journey van A ziet.
 * (Geen user.id-keying vandaag; cloud/session is de bron na login.)
 */
export function clearAnonymousV2LocalStorage(): void {
  if (typeof window === "undefined") return;
  try {
    for (const key of V2_ANONYMOUS_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Privémodus / blocked storage: negeren.
  }
}

type LegacyV2Stored = Partial<V2State> & { thing?: string | null; learnHints?: boolean };

function hydrateV2State(raw: string | null): V2State {
  if (!raw) return v2EmptyState;
  try {
    const parsed = JSON.parse(raw) as LegacyV2Stored;
    const { learnHints: _legacyLearnHints, thing, ...rest } = parsed;
    const things = Array.isArray(parsed.things)
      ? parsed.things
      : parsed.thing && typeof parsed.thing === "string" && parsed.thing.trim().length > 0
        ? [parsed.thing.trim()]
        : [];
    return {
      ...v2EmptyState,
      ...rest,
      things,
    };
  } catch {
    return v2EmptyState;
  }
}

export const v2EmptyState: V2State = {
  name: "",
  energy: null,
  things: [],
  why: "",
  whyOutcome: "",
  todayDone: false,
  cyclusOptIn: false,
};

type V2ContextValue = {
  state: V2State;
  /** Ready = localStorage is gelezen (vermijdt hydratie-flits). */
  ready: boolean;
  update: (patch: Partial<V2State>) => void;
  reset: () => void;
  /** Wis alle lokale v2-testdata (journey, taken, dump). */
  resetAllLocalData: () => void;
};

const V2Context = createContext<V2ContextValue | null>(null);

export function V2Provider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<V2State>(v2EmptyState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setState(hydrateV2State(raw));
    } catch {
      // Corrupte of geblokkeerde storage negeren we stilletjes.
    }
    setReady(true);
  }, []);

  const persist = useCallback((next: V2State) => {
    setState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Privémodus kan storage blokkeren. Geen blokkade voor de flow.
    }
  }, []);

  const update = useCallback(
    (patch: Partial<V2State>) => {
      setState((prev) => {
        const next = { ...prev, ...patch };
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // negeren
        }
        return next;
      });
    },
    [],
  );

  const reset = useCallback(() => {
    persist(v2EmptyState);
  }, [persist]);

  const resetAllLocalData = useCallback(() => {
    clearAnonymousV2LocalStorage();
    persist(v2EmptyState);
  }, [persist]);

  return (
    <V2Context.Provider value={{ state, ready, update, reset, resetAllLocalData }}>
      {children}
    </V2Context.Provider>
  );
}

export function useV2(): V2ContextValue {
  const ctx = useContext(V2Context);
  if (!ctx) {
    throw new Error("useV2 moet binnen een V2Provider gebruikt worden.");
  }
  return ctx;
}

/** Voorgekauwd ding met taak-energie (moeilijkheid), zichtbaar in de keuzelijst. */
export type V2Suggestion = { title: string; energy: V2Energy };

/** Voorgekauwde dingen per energie-bak. Geen minuten, geen tijdblindheid. */
export const V2_SUGGESTIONS: Record<V2Energy, V2Suggestion[]> = {
  low: [
    { title: "Eén glas water pakken", energy: "low" },
    { title: "Eén bericht beantwoorden", energy: "low" },
    { title: "Twee minuten opruimen", energy: "low" },
  ],
  enough: [
    { title: "Die ene mail versturen", energy: "enough" },
    { title: "Tien minuten opruimen", energy: "enough" },
    { title: "Een blokje om", energy: "enough" },
  ],
  high: [
    { title: "Aan dat ene project beginnen", energy: "high" },
    { title: "Administratie wegwerken", energy: "high" },
    { title: "Een afspraak inplannen", energy: "high" },
  ],
};

export const V2_ENERGY_OPTIONS: { value: V2Energy; label: string; hint: string }[] = [
  { value: "low", label: "Laag", hint: "Klein en zacht is prima vandaag." },
  { value: "enough", label: "Genoeg", hint: "Twee dingen zijn haalbaar." },
  { value: "high", label: "Hoog", hint: "Drie dingen passen vandaag." },
];
