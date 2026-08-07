import { NextResponse } from "next/server";

import { buildAuthCallbackUrl } from "@/lib/auth/buildAuthCallbackUrl";
import { generateAuthLink } from "@/lib/auth/generateAuthLink";
import { lookupProfileByEmail } from "@/lib/auth/lookupProfileByEmail";
import { normalizeSignupEmail } from "@/lib/auth/signupEmail";
import { renderLoginCodeMail } from "@/lib/email/authMailTemplates";
import { sendResendEmail } from "@/lib/email/resendClient";
import { DEFAULT_LIFECYCLE_REPLY_TO } from "@/lib/lifecycleMail/replyTo";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { getClientIp, isWaitlistRateLimited } from "@/lib/wachtlijst/rateLimit";
import { createClient } from "@supabase/supabase-js";

function mapSendError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("rate limit") && m.includes("email")) return "rate_limit_email";
  if (m.includes("rate limit")) return "rate_limit";
  return "send_failed";
}

async function sendSupabaseLoginOtp(input: {
  email: string;
  redirectTo: string;
  captchaToken?: string;
}): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("not_configured");

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await supabase.auth.signInWithOtp({
    email: input.email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: input.redirectTo,
      ...(input.captchaToken ? { captchaToken: input.captchaToken } : {}),
    },
  });
  if (error) throw error;
}

async function postSendLoginCode(request: Request) {
  const clientIp = getClientIp(request);
  if (isWaitlistRateLimited(clientIp)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const email =
    body &&
    typeof body === "object" &&
    "email" in body &&
    typeof (body as { email?: unknown }).email === "string"
      ? (body as { email: string }).email
      : null;
  const nextPath =
    body &&
    typeof body === "object" &&
    "nextPath" in body &&
    typeof (body as { nextPath?: unknown }).nextPath === "string"
      ? (body as { nextPath: string }).nextPath
      : "/onboarding";
  const captchaToken =
    body &&
    typeof body === "object" &&
    "captchaToken" in body &&
    typeof (body as { captchaToken?: unknown }).captchaToken === "string"
      ? (body as { captchaToken: string }).captchaToken.trim()
      : undefined;

  const normalized = normalizeSignupEmail(email ?? "");
  if (!normalized) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  if (!createServiceRoleClient()) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  const redirectTo = buildAuthCallbackUrl(nextPath);
  const profile = await lookupProfileByEmail(normalized);
  if (!profile) {
    return NextResponse.json({ ok: true });
  }

  try {
    const canBrand = Boolean(process.env.RESEND_API_KEY?.trim());

    if (canBrand) {
      const link = await generateAuthLink({
        type: "magiclink",
        email: normalized,
        redirectTo,
      });
      if (!link?.emailOtp) {
        throw new Error("auth_link_failed");
      }

      const mail = renderLoginCodeMail({
        loginUrl: link.actionLink,
        otpCode: link.emailOtp,
        preferredName: profile?.preferred_name,
      });

      const sent = await sendResendEmail({
        to: normalized,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        replyTo: DEFAULT_LIFECYCLE_REPLY_TO,
        tags: [{ name: "auth", value: "login_code" }],
      });

      if (!sent.ok) {
        throw new Error(sent.error ?? "send_failed");
      }
      if (sent.skipped) {
        throw new Error("send_failed");
      }
    } else {
      await sendSupabaseLoginOtp({
        email: normalized,
        redirectTo,
        captchaToken,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "send_failed";
    const code = mapSendError(message);
    const status = code.startsWith("rate_limit") ? 429 : 502;
    return NextResponse.json({ ok: false, error: code }, { status });
  }
}

export const POST = withApiErrorTracking(
  "/api/auth/send-login-code",
  postSendLoginCode
);
