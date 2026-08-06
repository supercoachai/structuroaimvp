import { NextResponse } from "next/server";

import { isAdminSecretValid } from "@/lib/admin/adminSession";
import { sendResendEmail } from "@/lib/email/resendClient";
import { resolveLifecycleReplyTo } from "@/lib/lifecycleMail/replyTo";
import { renderLifecycleMail } from "@/lib/lifecycleMail/templates";
import type {
  LifecycleCandidate,
  LifecycleTemplateId,
} from "@/lib/lifecycleMail/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PREVIEW_TEMPLATES: LifecycleTemplateId[] = [
  "s0_hello",
  "s0_welcome",
  "s0_checkout_resume",
  "s0_checkout_help",
  "s1_day2",
  "s2_still",
  "s3_value",
  "s4_pre_paywall",
  "s5_paywall",
  "s6_winback",
  "s_winback_never_started",
  "s_winback_warm",
];

function assertAuthorized(request: Request): boolean {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (token && isAdminSecretValid("activity", token)) return true;
  const cron = process.env.CRON_SECRET?.trim() ?? "";
  if (cron && auth === `Bearer ${cron}`) return true;
  return false;
}

function previewCandidate(): LifecycleCandidate {
  return {
    user_id: "00000000-0000-4000-8000-000000000001",
    email: "info@structuro.eu",
    preferred_name: "Niels",
    created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    signup_source: null,
    subscription_status: "none",
    subscription_current_period_end: null,
    last_dagstart_date: null,
    unsubscribe_lifecycle: false,
    is_test: true,
    app_trial_override_until: null,
    checkout_started_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    checkin_count: 3,
    last_checkin_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
  };
}

/**
 * Stuur alle lifecycle-templates als [TEST] naar één adres.
 * Auth: Authorization: Bearer $STRUCTURO_ACTIVITY_ADMIN_SECRET (of CRON_SECRET)
 *
 * GET/POST /api/lifecycle/preview-send?to=info@structuro.eu
 * Schrijft níet naar lifecycle_email_log.
 */
async function handle(request: Request) {
  if (!assertAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const toRaw = (url.searchParams.get("to") ?? "info@structuro.eu").trim();
  const to = toRaw.toLowerCase();
  if (!to.includes("@") || to.length > 200) {
    return NextResponse.json({ error: "invalid to" }, { status: 400 });
  }

  const onlyRaw = (url.searchParams.get("only") ?? "").trim();
  const onlyIds = onlyRaw
    ? onlyRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const templates = onlyIds.length
    ? PREVIEW_TEMPLATES.filter((id) => onlyIds.includes(id))
    : PREVIEW_TEMPLATES;
  if (onlyIds.length && templates.length === 0) {
    return NextResponse.json(
      { error: "unknown only template id", allowed: PREVIEW_TEMPLATES },
      { status: 400 }
    );
  }

  const candidate = previewCandidate();
  const unsubscribeUrl = "https://www.structuro.ai/instellingen";
  const results: Array<{
    templateId: LifecycleTemplateId;
    subject: string;
    ok: boolean;
    id?: string;
    skipped?: boolean;
    error?: string;
  }> = [];

  for (const templateId of templates) {
    const mail = renderLifecycleMail(templateId, candidate, unsubscribeUrl);
    const subject = `[TEST] ${mail.subject}`;
    const result = await sendResendEmail({
      to,
      subject,
      text: mail.text,
      html: mail.html,
      replyTo: resolveLifecycleReplyTo(),
      tags: [
        { name: "lifecycle", value: templateId },
        { name: "wave", value: "preview" },
        { name: "audience", value: "preview" },
      ],
    });

    if (!result.ok) {
      results.push({
        templateId,
        subject,
        ok: false,
        error: result.error,
      });
      continue;
    }

    results.push({
      templateId,
      subject,
      ok: true,
      id: result.id,
      skipped: result.skipped,
    });
  }

  const sent = results.filter((r) => r.ok && !r.skipped).length;
  const skipped = results.filter((r) => r.skipped).length;
  const failed = results.filter((r) => !r.ok).length;

  return NextResponse.json({
    ok: failed === 0 && skipped === 0,
    to,
    sent,
    skipped,
    failed,
    results,
  });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
