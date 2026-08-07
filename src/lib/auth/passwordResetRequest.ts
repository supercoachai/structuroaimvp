import { createClient } from "@supabase/supabase-js";

import { generateAuthLink } from "@/lib/auth/generateAuthLink";
import { lookupProfileByEmail } from "@/lib/auth/lookupProfileByEmail";
import { renderPasswordResetMail } from "@/lib/email/authMailTemplates";
import { sendResendEmail } from "@/lib/email/resendClient";
import { DEFAULT_LIFECYCLE_REPLY_TO } from "@/lib/lifecycleMail/replyTo";
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

async function sendBrandedPasswordResetEmail(input: {
  email: string;
  redirectTo: string;
  preferredName: string | null;
}): Promise<boolean> {
  if (!process.env.RESEND_API_KEY?.trim()) return false;

  const link = await generateAuthLink({
    type: "recovery",
    email: input.email,
    redirectTo: input.redirectTo,
  });
  if (!link) return false;

  const mail = renderPasswordResetMail({
    resetUrl: link.actionLink,
    preferredName: input.preferredName,
  });

  const sent = await sendResendEmail({
    to: input.email,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
    replyTo: DEFAULT_LIFECYCLE_REPLY_TO,
    tags: [{ name: "auth", value: "password_reset" }],
  });

  return sent.ok && !sent.skipped;
}

async function sendSupabasePasswordResetEmail(input: {
  email: string;
  redirectTo: string;
  captchaToken?: string;
}): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("not_configured");
  }

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await supabase.auth.resetPasswordForEmail(input.email, {
    redirectTo: input.redirectTo,
    ...(input.captchaToken ? { captchaToken: input.captchaToken } : {}),
  });
  if (error) throw error;
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

  if (!createServiceRoleClient()) {
    return { ok: false, error: "not_configured" };
  }

  const profile = await lookupProfileByEmail(normalized);
  const userId = profile?.id ?? null;

  try {
    const brandedSent = profile
      ? await sendBrandedPasswordResetEmail({
          email: normalized,
          redirectTo: input.redirectTo,
          preferredName: profile.preferred_name,
        })
      : false;

    if (!brandedSent) {
      await sendSupabasePasswordResetEmail({
        email: normalized,
        redirectTo: input.redirectTo,
        captchaToken: input.captchaToken,
      });
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
  } catch (err) {
    await logPasswordResetRequest({
      userId,
      outcome: "send_failed",
      clientIp: input.clientIp ?? null,
    });
    throw err;
  }
}
