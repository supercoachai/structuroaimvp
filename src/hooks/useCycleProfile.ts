"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "./useUser";
import { loadCycleProfile } from "@/lib/cycle/cycleProfileDb";
import { calculateCyclePhase } from "@/lib/cycle/calculatePhase";
import {
  CYCLE_LENGTH_DEFAULT,
  type CycleProfile,
  type CyclePhase,
} from "@/lib/cycle/types";

export type UseCycleProfileResult = {
  loading: boolean;
  consentOn: boolean;
  profile: CycleProfile;
  /**
   * Bereken huidige cyclusfase als de gebruiker consent heeft gegeven.
   * Returned 'unknown' als er geen geldige menstruatiestart is opgeslagen.
   * Returned null als er geen consent is.
   */
  computePhaseToday: () => CyclePhase | null;
};

export function useCycleProfile(): UseCycleProfileResult {
  const { user, loading: userLoading } = useUser();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<CycleProfile>({
    consentAt: null,
    lastPeriodStart: null,
    averageLength: CYCLE_LENGTH_DEFAULT,
  });

  useEffect(() => {
    if (userLoading) return;
    let cancelled = false;
    (async () => {
      if (!user?.id) {
        if (!cancelled) {
          setProfile({
            consentAt: null,
            lastPeriodStart: null,
            averageLength: CYCLE_LENGTH_DEFAULT,
          });
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      try {
        const data = await loadCycleProfile(user.id);
        if (!cancelled) setProfile(data);
      } catch (e) {
        console.warn("useCycleProfile load:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, userLoading]);

  const consentOn = Boolean(profile.consentAt);

  const computePhaseToday = useMemo(
    () => () => {
      if (!consentOn) return null;
      if (!profile.lastPeriodStart) return "unknown" as CyclePhase;
      const startDate = new Date(profile.lastPeriodStart + "T00:00:00");
      if (Number.isNaN(startDate.getTime())) return "unknown" as CyclePhase;
      return calculateCyclePhase(startDate, profile.averageLength);
    },
    [consentOn, profile.lastPeriodStart, profile.averageLength]
  );

  return {
    loading: userLoading || loading,
    consentOn,
    profile,
    computePhaseToday,
  };
}
