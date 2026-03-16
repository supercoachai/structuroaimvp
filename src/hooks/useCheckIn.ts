"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "./useUser";
import { getTodayCheckIn, saveCheckInToStorage } from "@/lib/localStorageTasks";
import {
  getCheckInFromSupabase,
  upsertCheckInToSupabase,
  type CheckInPayload,
} from "@/lib/supabase/checkinsDb";

const today = () => new Date().toISOString().split("T")[0];

export type CheckIn = {
  date: string;
  energy_level: string;
  top3_task_ids: string[] | null;
  user_id?: string;
  created_at?: string;
};

export function useCheckIn(): {
  checkIn: CheckIn | null;
  saveCheckIn: (payload: { energy_level: string; top3_task_ids: string[] | null }) => Promise<void>;
  hasCheckedIn: boolean;
  loading: boolean;
} {
  const { user, loading: userLoading } = useUser();
  const [checkIn, setCheckIn] = useState<CheckIn | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const date = today();
    setLoading(true);
    try {
      if (user?.id) {
        try {
          const row = await getCheckInFromSupabase(user.id, date);
          if (row) {
            setCheckIn({
              date: row.date,
              energy_level: row.energy_level ?? "",
              top3_task_ids: row.top3_task_ids ?? null,
              user_id: row.user_id,
              created_at: row.created_at,
            });
          } else {
            setCheckIn(null);
          }
        } catch (supabaseErr: any) {
          // Tabel daily_checkins ontbreekt of andere Supabase-fout → fallback op localStorage
          const msg = supabaseErr?.message ?? "";
          if (msg.includes("schema cache") || msg.includes("does not exist") || msg.includes("daily_checkins")) {
            console.warn("useCheckIn: Supabase-tabel ontbreekt, gebruik localStorage. Run supabase/migration_daily_checkins.sql in Supabase SQL Editor.");
            const local = getTodayCheckIn();
            if (local) {
              setCheckIn({
                date: local.date ?? date,
                energy_level: local.energy_level ?? "",
                top3_task_ids: local.top3_task_ids ?? null,
                user_id: local.user_id,
                created_at: local.created_at,
              });
            } else {
              setCheckIn(null);
            }
          } else {
            throw supabaseErr;
          }
        }
      } else {
        const local = getTodayCheckIn();
        if (local) {
          setCheckIn({
            date: local.date ?? date,
            energy_level: local.energy_level ?? "",
            top3_task_ids: local.top3_task_ids ?? null,
            user_id: local.user_id,
            created_at: local.created_at,
          });
        } else {
          setCheckIn(null);
        }
      }
    } catch (e) {
      console.error("useCheckIn load error:", e);
      setCheckIn(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (userLoading) return;
    load();
  }, [userLoading, load]);

  const saveCheckIn = useCallback(
    async (payload: { energy_level: string; top3_task_ids: string[] | null }) => {
      const date = today();
      if (user?.id) {
        try {
          await upsertCheckInToSupabase(user.id, date, payload as CheckInPayload);
          setCheckIn({
            date,
            energy_level: payload.energy_level,
            top3_task_ids: payload.top3_task_ids,
            user_id: user.id,
            created_at: new Date().toISOString(),
          });
        } catch (err: any) {
          const msg = err?.message ?? "";
          if (msg.includes("schema cache") || msg.includes("does not exist") || msg.includes("daily_checkins") || msg.includes("Could not find table")) {
            console.warn("useCheckIn save: Supabase-tabel ontbreekt, opslaan in localStorage. Run supabase/migration_daily_checkins.sql in Supabase SQL Editor.");
            saveCheckInToStorage({
              date,
              energy_level: payload.energy_level,
              top3_task_ids: payload.top3_task_ids,
              user_id: user.id,
            });
            setCheckIn({
              date,
              energy_level: payload.energy_level,
              top3_task_ids: payload.top3_task_ids,
              user_id: user.id,
              created_at: new Date().toISOString(),
            });
          } else {
            throw err;
          }
        }
      } else {
        saveCheckInToStorage({
          date,
          energy_level: payload.energy_level,
          top3_task_ids: payload.top3_task_ids,
          user_id: "local_user",
        });
        setCheckIn({
          date,
          energy_level: payload.energy_level,
          top3_task_ids: payload.top3_task_ids,
          user_id: "local_user",
          created_at: new Date().toISOString(),
        });
      }
    },
    [user?.id]
  );

  return {
    checkIn,
    saveCheckIn,
    hasCheckedIn: checkIn !== null,
    loading: userLoading || loading,
  };
}
