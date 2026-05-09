"use client";

import { createClient } from "@/lib/supabase/client";
import {
  CYCLE_LENGTH_DEFAULT,
  clampCycleLength,
  type CycleProfile,
} from "./types";

const NEW_OR_MISSING_COLUMN_HINTS = [
  "column",
  "schema cache",
  "does not exist",
  "Could not find",
];

function isMissingColumnError(message: string | null | undefined): boolean {
  if (!message) return false;
  return NEW_OR_MISSING_COLUMN_HINTS.some((hint) => message.includes(hint));
}

/** Lees cyclusvelden uit profiles. Geeft default-profile terug als kolommen ontbreken. */
export async function loadCycleProfile(userId: string): Promise<CycleProfile> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("cycle_tracking_consent_at, cycle_last_period_start, cycle_average_length")
    .eq("id", userId)
    .maybeSingle();

  if (error && !isMissingColumnError(error.message)) {
    throw new Error(error.message);
  }

  const row = data as
    | {
        cycle_tracking_consent_at?: string | null;
        cycle_last_period_start?: string | null;
        cycle_average_length?: number | null;
      }
    | null;

  return {
    consentAt: row?.cycle_tracking_consent_at ?? null,
    lastPeriodStart: row?.cycle_last_period_start ?? null,
    averageLength:
      typeof row?.cycle_average_length === "number"
        ? clampCycleLength(row.cycle_average_length)
        : CYCLE_LENGTH_DEFAULT,
  };
}

/** Eerste consent + setup. Schrijft consent-timestamp, period-start en lengte. */
export async function saveCycleConsent(
  userId: string,
  lastPeriodStart: string,
  averageLength: number
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      cycle_tracking_consent_at: new Date().toISOString(),
      cycle_last_period_start: lastPeriodStart,
      cycle_average_length: clampCycleLength(averageLength),
    })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

/** Pas alleen de start-datum van de laatste menstruatie aan. */
export async function updateCyclePeriodStart(
  userId: string,
  lastPeriodStart: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ cycle_last_period_start: lastPeriodStart })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

/** Pas alleen de gemiddelde cycluslengte aan (clamped naar 21-35). */
export async function updateCycleAverageLength(
  userId: string,
  averageLength: number
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ cycle_average_length: clampCycleLength(averageLength) })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

/**
 * Verwijder alle cyclus-data voor deze gebruiker:
 * - profiles: consentAt = NULL, period-start = NULL, lengte = default
 * - daily_checkins: cycle_phase = NULL voor alle rijen van deze user
 */
export async function clearAllCycleData(userId: string): Promise<void> {
  const supabase = createClient();

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({
      cycle_tracking_consent_at: null,
      cycle_last_period_start: null,
      cycle_average_length: CYCLE_LENGTH_DEFAULT,
    })
    .eq("id", userId);
  if (profileErr) throw new Error(profileErr.message);

  const { error: checkinErr } = await supabase
    .from("daily_checkins")
    .update({ cycle_phase: null })
    .eq("user_id", userId);
  if (checkinErr && !isMissingColumnError(checkinErr.message)) {
    throw new Error(checkinErr.message);
  }
}
