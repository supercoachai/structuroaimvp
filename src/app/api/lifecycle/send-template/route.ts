import { NextResponse } from "next/server";

import { isAdminSecretValid } from "@/lib/admin/adminSession";
import { sendLifecycleTemplateToUser } from "@/lib/lifecycleMail/sendOne";
import { renderLifecycleMail } from "@/lib/lifecycleMail/templates";
import { signLifecycleUnsubscribeToken } from "@/lib/lifecycleMail/unsubscribeToken";
import { getAppOrigin } from "@/lib/appUrl";
import { sendResendEmail } from "@/lib/email/resendClient";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { captureServerEvent } from "@/lib/posthog/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import type {
  LifecycleCandidate,
  LifecycleTemplateId,
} from "@/lib/lifecycleMail/types";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ALLOWED: LifecycleTemplateId[] = [
  "s0_checkout_resume",
  "s0_checkout_help",
  "s5_paywall",
];

function assertAuthorized(request: Request): boolean {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (token && isAdminSecretValid("activity", token)) return true;
  const cron = process.env.CRON_SECRET?.trim() ?? "";
  if (cron && auth === `Bearer ${cron}`) return true;
  return false;
}

/**
 * Ops: stuur één lifecycle-template (forceerbaar) naar userIds.
 * Auth: Bearer STRUCTURO_ACTIVITY_ADMIN_SECRET of CRON_SECRET
 *
 * POST { userIds: string[], templateId: "s0_checkout_resume", force?: true }
 */
async function postSendTemplate(request: Request) {
  if (!assertAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    userIds?: string[];
    templateId?: string;
    force?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const templateId = (body.templateId ?? "").trim() as LifecycleTemplateId;
  if (!ALLOWED.includes(templateId)) {
    return NextResponse.json(
      { error: "template niet toegestaan", allowed: ALLOWED },
      { status: 400 }
    );
  }

  const userIds = (body.userIds ?? []).map((id) => id.trim()).filter(Boolean);
  if (userIds.length === 0 || userIds.length > 20) {
    return NextResponse.json({ error: "userIds 1–20 vereist" }, { status: 400 });
  }

  const force = Boolean(body.force);
  const outcomes = [];

  for (const userId of userIds) {
    if (!force) {
      const result = await sendLifecycleTemplateToUser({
        userId,
        templateId,
        wave: "manual",
      });
      outcomes.push(result);
      continue;
    }

    // Force: skip eligibility, wel unsubscribe/paid checks via candidate load.
    const supabase = createServiceRoleClient();
    if (!supabase) {
      outcomes.push({
        userId,
        status: "failed",
        error: "geen service role",
      });
      continue;
    }

    const { data } = await supabase
      .from("lifecycle_candidates_v1")
      .select(
        "user_id, email, preferred_name, created_at, signup_source, subscription_status, subscription_current_period_end, last_dagstart_date, unsubscribe_lifecycle, is_test, app_trial_override_until, checkout_started_at, checkin_count, last_checkin_date"
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (!data) {
      outcomes.push({ userId, status: "skipped", note: "geen candidate" });
      continue;
    }

    const candidate = data as LifecycleCandidate;
    const status = (candidate.subscription_status ?? "").toLowerCase();
    if (status === "trialing" || status === "active") {
      outcomes.push({
        userId,
        email: candidate.email,
        status: "skipped",
        note: "al trial/paid",
      });
      continue;
    }

    const token = signLifecycleUnsubscribeToken(candidate.user_id);
    const origin = getAppOrigin();
    const unsubscribeUrl = token
      ? `${origin}/api/lifecycle/unsubscribe?token=${encodeURIComponent(token)}`
      : `${origin}/instellingen`;

    const mail = renderLifecycleMail(templateId, candidate, unsubscribeUrl);

    const { data: existing } = await supabase
      .from("lifecycle_email_log")
      .select("id")
      .eq("user_id", userId)
      .eq("template_id", templateId)
      .eq("cohort_key", mail.cohortKey)
      .maybeSingle();

    if (existing) {
      outcomes.push({
        userId,
        email: candidate.email,
        status: "already_sent",
        cohortKey: mail.cohortKey,
      });
      continue;
    }

    const sent = await sendResendEmail({
      to: candidate.email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      replyTo: process.env.LIFECYCLE_REPLY_TO?.trim() || undefined,
      tags: [
        { name: "lifecycle", value: templateId },
        { name: "wave", value: "manual_force" },
      ],
    });

    if (!sent.ok) {
      outcomes.push({
        userId,
        email: candidate.email,
        status: "failed",
        error: sent.error,
      });
      continue;
    }
    if (sent.skipped) {
      outcomes.push({
        userId,
        email: candidate.email,
        status: "skipped",
        note: "RESEND_API_KEY missing",
      });
      continue;
    }

    await supabase.from("lifecycle_email_log").insert({
      user_id: userId,
      template_id: templateId,
      cohort_key: mail.cohortKey,
    });

    try {
      await captureServerEvent(userId, ANALYTICS_EVENTS.lifecycle_email_sent, {
        template_id: templateId,
        cohort_key: mail.cohortKey,
        wave: "manual_force",
        channel: "server",
      });
    } catch {
      /* best-effort */
    }

    outcomes.push({
      userId,
      email: candidate.email,
      status: "sent",
      subject: mail.subject,
      ctaPath: mail.ctaPath,
      resendId: sent.id,
    });
  }

  return NextResponse.json({ ok: true, force, templateId, outcomes });
}

export const POST = withApiErrorTracking(
  "POST /api/lifecycle/send-template",
  postSendTemplate
);
