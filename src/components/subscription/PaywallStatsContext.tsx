"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { RetentionStats } from "@/lib/retentionStats";

type PaywallStatsContextValue = {
  stats: RetentionStats | null;
  setStats: (stats: RetentionStats) => void;
};

const PaywallStatsContext = createContext<PaywallStatsContextValue | null>(null);

export function PaywallStatsProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<RetentionStats | null>(null);
  const value = useMemo(() => ({ stats, setStats }), [stats]);
  return (
    <PaywallStatsContext.Provider value={value}>
      {children}
    </PaywallStatsContext.Provider>
  );
}

export function usePaywallStats(): PaywallStatsContextValue {
  const ctx = useContext(PaywallStatsContext);
  if (!ctx) {
    throw new Error("usePaywallStats must be used within PaywallStatsProvider");
  }
  return ctx;
}

/** Zet stats in context zodra de server-stream binnen is. */
export function PaywallStatsHydrator({ stats }: { stats: RetentionStats }) {
  const { setStats } = usePaywallStats();
  useLayoutEffect(() => {
    setStats(stats);
  }, [setStats, stats]);
  return null;
}
