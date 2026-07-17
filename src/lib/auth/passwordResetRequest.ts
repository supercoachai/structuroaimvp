import { createClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { captureServerEvent } from "@/lib/posthog/server";
import { shouldSkipServerAnalyticsForUser } from "@/lib/posthog/serverAnalyticsGuard";

export type PasswordResetRequestOutcome =
  | "email_sent"
  | "unknown_email"
  | "send_failed";

export type PasswordResetRequestResult = {
  /** Altijd true naar de client (geen e-mail-enumeratie). */
  ok: true;
  outcome: PasswordResetRequestOutcome;
};

function normalizeEmail(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@")) return null;
  if (trimmed.length > 254) return null;
  return trimmed;
}

async function lookupUserIdByEmail(email: string): Promise<string | null> {
  const admin = createServiceRoleClient();
  if (!admin) return null;

  const { data, error } = (await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle()) as {
    data: { id: string } | null;
    error: { message: string } | null;
  };

  if (error || !data?.id) return null;
  return String(data.id);
}

async function logPasswordResetRequest(input: {
  userId: string | null;
  outcome: PasswordResetRequestOutcome;
  clientIp: string | null;
}): Promise<void> {
  const payload = {
    user_id: input.userId,
    outcome: input.outcome,
    client_ip: input.clientIp,
  };

  console.info("[auth/password-reset-request]", payload);

  if (input.userId && !(await shouldSkipServerAnalyticsForUser(input.userId))) {
    await captureServerEvent(input.userId, ANALYTICS_EVENTS.password_reset_requested, {
      outcome: input.outcome,
      channel: "server",
    });
  }
}

/**
 * Server-side wachtwoordherstel met traceerbare logging (user_id, geen e-mail in logs).
 * Retourneert altijd ok:true naar de client als het e-mailadres formaat geldig is.
 */
export async function requestPasswordResetEmail(input: {
  email: string;
  redirectTo: string;
  clientIp?: string | null;
  captchaToken?: string;
}): Promise<
  | { ok: false; error: "invalid_email" | "not_configured" }
  | PasswordResetRequestResult
> {
  const normalized = normalizeEmail(input.email);
  if (!normalized) {
    return { ok: false, error: "invalid_email" };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return { ok: false, error: "not_configured" };
  }

  const userId = await lookupUserIdByEmail(normalized);

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await supabase.auth.resetPasswordForEmail(normalized, {
    redirectTo: input.redirectTo,
    ...(input.captchaToken ? { captchaToken: input.captchaToken } : {}),
  });

  if (error) {
    await logPasswordResetRequest({
      userId,
      outcome: "send_failed",
      clientIp: input.clientIp ?? null,
    });
    throw error;
  }

  const outcome: PasswordResetRequestOutcome = userId
    ? "email_sent"
    : "unknown_email";

  await logPasswordResetRequest({
    userId,
    outcome,
    clientIp: input.clientIp ?? null,
  });

  return { ok: true, outcome };
}
