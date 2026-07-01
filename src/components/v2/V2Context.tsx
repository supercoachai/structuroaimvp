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
  /** Het ene gekozen ding van vandaag. */
  thing: string | null;
  /** Zacht why-anker: waarvoor doe je dit. */
  why: string;
  /** Wat het je oplevert. */
  whyOutcome: string;
  /** Shutdown-light: lus van vandaag gesloten. */
  todayDone: boolean;
  /** Of cyclus optioneel is aangezet (na eerste waarde). */
  cyclusOptIn: boolean;
};

const STORAGE_KEY = "v2_journey";

export const v2EmptyState: V2State = {
  name: "",
  energy: null,
  thing: null,
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
};

const V2Context = createContext<V2ContextValue | null>(null);

export function V2Provider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<V2State>(v2EmptyState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<V2State>;
        setState({ ...v2EmptyState, ...parsed });
      }
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

  return (
    <V2Context.Provider value={{ state, ready, update, reset }}>
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

/** Voorgekauwde dingen per energie-bak. Geen minuten, geen tijdblindheid. */
export const V2_SUGGESTIONS: Record<V2Energy, string[]> = {
  low: ["Eén glas water pakken", "Eén bericht beantwoorden", "Twee minuten opruimen"],
  enough: ["Die ene mail versturen", "Tien minuten opruimen", "Een blokje om"],
  high: [
    "Aan dat ene project beginnen",
    "Administratie wegwerken",
    "Een afspraak inplannen",
  ],
};

export const V2_ENERGY_OPTIONS: { value: V2Energy; label: string; hint: string }[] = [
  { value: "low", label: "Laag", hint: "Klein en zacht is prima vandaag." },
  { value: "enough", label: "Genoeg", hint: "Eén ding is haalbaar." },
  { value: "high", label: "Veel", hint: "Pak iets wat je vooruit helpt." },
];
