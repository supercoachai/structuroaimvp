import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * AVG-borging: elke tabel met een persoonskoppeling (user_id) moet door
 * delete_account_data worden gewist of geanonimiseerd. Deze lijst is de
 * geverifieerde live-stand (public-tabellen met user_id, 11 juni 2026).
 * Voeg een tabel toe wanneer er een nieuwe user-tabel bijkomt; de test
 * faalt zodra de delete-functie achterloopt.
 */
const USER_TABLES = [
  "ai_daily_usage",
  "analytics_events",
  "daily_checkins",
  "daily_shutdowns",
  "daystart_lunch_reminder_sends",
  "daystart_reminder_sends",
  "parked_thoughts",
  "push_subscriptions",
  "shutdown_reminder_sends",
  "tasks",
  "user_insights",
] as const;

function loadLatestDeleteFunction(): string {
  const dir = fileURLToPath(new URL("../../supabase/migrations", import.meta.url));
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let latest = "";
  for (const file of files) {
    const sql = readFileSync(join(dir, file), "utf8");
    if (sql.includes("FUNCTION public.delete_account_data")) {
      latest = sql;
    }
  }
  return latest;
}

describe("delete_account_data dekking", () => {
  const sql = loadLatestDeleteFunction();

  it("er bestaat een delete_account_data-migratie", () => {
    expect(sql.length).toBeGreaterThan(0);
  });

  for (const table of USER_TABLES) {
    it(`verwerkt ${table}`, () => {
      const handled =
        new RegExp(`DELETE FROM\\s+${table}\\b`).test(sql) ||
        new RegExp(`UPDATE\\s+${table}\\b`).test(sql);
      expect(handled).toBe(true);
    });
  }
});
