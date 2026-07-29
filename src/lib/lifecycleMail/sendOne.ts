import { getAppOrigin } from "@/lib/appUrl";
import { sendResendEmail } from "@/lib/email/resendClient";
import { isProtectedTestAccount } from "@/lib/protectedTestAccount";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { captureServerEvent } from "@/lib/posthog/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

import {
  isLifecycleV2AudienceCandidate,
  lifecycleMailSendsEnabled,
  lifecycleMailTestAllowlist,
  resolveLifecycleMailAudience,
  type LifecycleMailAudience,
} from "./audience";
import { eligibleTemplatesForCandidate } from "./segments";
import { renderLifecycleMail } from "./templates";
import { signLifecycleUnsubscribeToken } from "./unsubscribeToken";
import { subscriptionCancelPageUrl } from "@/lib/stripe/subscriptionCancelToken";
import type {
  LifecycleCandidate,
  LifecycleSendOutcome,
  LifecycleTemplateId,
} from "./types";

function unsubscribeUrlFor(userId: string): string {
  const token = signLifecycleUnsubscribeToken(userId);
  const origin = getAppOrigin();
  if (!token) return `${origin}/instellingen`;
  return `${origin}/api/lifecycle/unsubscribe?token=${encodeURIComponent(token)}`;
}

function isTestAudienceCandidate(c: LifecycleCandidate): boolean {
  if (c.is_test) return true;
  if (isProtectedTestAccount(c.email)) return true;
  const allow = lifecycleMailTestAllowlist();
  return allow.has(c.email.trim().toLowerCase());
}

function audienceAllowsCandidate(
  c: LifecycleCandidate,
  audience: LifecycleMailAudience
): boolean {
  if (audience === "off") return false;
  if (audience === "test") return isTestAudienceCandidate(c);
  if (audience === "v2") {
    return (
      !c.is_test &&
      !isProtectedTestAccount(c.email) &&
      isLifecycleV2AudienceCandidate(c)
    );
  }
  return !c.is_test && !isProtectedTestAccount(c.email);
}

async function loadCandidate(
  userId: string
): Promise<LifecycleCandidate | null> {
  const supabase = createServiceRoleClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("lifecycle_candidates_v1")
    .select(
      "user_id, email, preferred_name, created_at, signup_source, subscription_status, subscription_current_period_end, last_dagstart_date, unsubscribe_lifecycle, is_test, app_trial_override_until, checkin_count, last_checkin_date"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[lifecycle-mail] loadCandidate", error.message);
    return null;
  }
  return (data as LifecycleCandidate | null) ?? null;
}

async function alreadySent(
  userId: string,
  templateId: LifecycleTemplateId,
  cohortKey: string
): Promise<boolean> {
  const supabase = createServiceRoleClient();
  if (!supabase) return true;
  const { data } = await supabase
    .from("lifecycle_email_log")
    .select("id")
    .eq("user_id", userId)
    .eq("template_id", templateId)
    .eq("cohort_key", cohortKey)
    .maybeSingle();
  return Boolean(data);
}

async function markSent(
  userId: string,
  templateId: LifecycleTemplateId,
  cohortKey: string
): Promise<void> {
  const supabase = createServiceRoleClient();
  if (!supabase) return;
  const { error } = await supabase.from("lifecycle_email_log").insert({
    user_id: userId,
    template_id: templateId,
    cohort_key: cohortKey,
  });
  if (error && !error.message.includes("duplicate")) {
    console.error("[lifecycle-mail] log insert failed", error.message);
  }
}

export type SendLifecycleOneResult = LifecycleSendOutcome & {
  dryRun: boolean;
  audience: LifecycleMailAudience;
  note?: string;
};

/**
 * Stuur één lifecycle-template naar één user (idempotent).
 * Zelfde audience/enable-gates als de cron-batch.
 */
export async function sendLifecycleTemplateToUser(opts: {
  userId: string;
  templateId: LifecycleTemplateId;
  /** Wave-tag voor analytics/Resend. */
  wave?: string;
  dryRun?: boolean;
  now?: Date;
}): Promise<SendLifecycleOneResult> {
  const now = opts.now ?? new Date();
  const audience = resolveLifecycleMailAudience();
  const enabled = lifecycleMailSendsEnabled();
  const dryRun = Boolean(opts.dryRun) || !enabled;
  const wave = opts.wave ?? "event";

  const base = {
    userId: opts.userId,
    email: "",
    templateId: opts.templateId,
    cohortKey: "",
    dryRun,
    audience,
  } as const;

  if (audience === "off") {
    return {
      ...base,
      status: "skipped",
      note: "LIFECYCLE_MAIL_AUDIENCE=off",
    };
  }

  if (audience === "all" && enabled && !dryRun) {
    if (process.env.LIFECYCLE_MAIL_ALLOW_V1 !== "true") {
      return {
        ...base,
        status: "skipped",
        note: "audience=all geblokkeerd zonder LIFECYCLE_MAIL_ALLOW_V1=true. Gebruik audience=v2 voor card-trial live.",
      };
    }
  }

  const candidate = await loadCandidate(opts.userId);
  if (!candidate) {
    return {
      ...base,
      status: "skipped",
      note: "geen lifecycle-candidate (paid/unsubscribe/geen email/geen profiel)",
    };
  }

  if (!audienceAllowsCandidate(candidate, audience)) {
    return {
      ...base,
      email: candidate.email,
      status: "skipped",
      note: "buiten audience",
    };
  }

  const eligible = eligibleTemplatesForCandidate(candidate, now);
  if (!eligible.includes(opts.templateId)) {
    return {
      userId: candidate.user_id,
      email: candidate.email,
      templateId: opts.templateId,
      cohortKey: "",
      status: "skipped",
      dryRun,
      audience,
      note: "niet eligible voor template",
    };
  }

  const mail = renderLifecycleMail(
    opts.templateId,
    candidate,
    unsubscribeUrlFor(candidate.user_id),
    now,
    opts.templateId === "s4_pre_paywall"
      ? { cancelUrl: subscriptionCancelPageUrl(candidate.user_id) ?? undefined }
      : undefined
  );

  if (await alreadySent(candidate.user_id, opts.templateId, mail.cohortKey)) {
    return {
      userId: candidate.user_id,
      email: candidate.email,
      templateId: opts.templateId,
      cohortKey: mail.cohortKey,
      status: "already_sent",
      dryRun,
      audience,
    };
  }

  if (dryRun) {
    return {
      userId: candidate.user_id,
      email: candidate.email,
      templateId: opts.templateId,
      cohortKey: mail.cohortKey,
      status: "dry_run",
      dryRun: true,
      audience,
    };
  }

  const result = await sendResendEmail({
    to: candidate.email,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
    replyTo: process.env.LIFECYCLE_REPLY_TO?.trim() || undefined,
    tags: [
      { name: "lifecycle", value: opts.templateId },
      { name: "wave", value: wave },
      { name: "audience", value: audience },
    ],
  });

  if (!result.ok) {
    return {
      userId: candidate.user_id,
      email: candidate.email,
      templateId: opts.templateId,
      cohortKey: mail.cohortKey,
      status: "failed",
      error: result.error,
      dryRun,
      audience,
    };
  }

  if (result.skipped) {
    return {
      userId: candidate.user_id,
      email: candidate.email,
      templateId: opts.templateId,
      cohortKey: mail.cohortKey,
      status: "skipped",
      error: "RESEND_API_KEY missing",
      dryRun,
      audience,
    };
  }

  await markSent(candidate.user_id, opts.templateId, mail.cohortKey);
  try {
    await captureServerEvent(
      candidate.user_id,
      ANALYTICS_EVENTS.lifecycle_email_sent,
      {
        template_id: opts.templateId,
        cohort_key: mail.cohortKey,
        wave,
        audience,
        channel: "server",
      }
    );
    if (opts.templateId === "s4_pre_paywall") {
      await captureServerEvent(
        candidate.user_id,
        ANALYTICS_EVENTS.trial_precharge_mailed,
        {
          cohort_key: mail.cohortKey,
          wave,
          channel: "server",
        }
      );
    }
  } catch {
    /* best-effort */
  }

  return {
    userId: candidate.user_id,
    email: candidate.email,
    templateId: opts.templateId,
    cohortKey: mail.cohortKey,
    status: "sent",
    dryRun: false,
    audience,
  };
}

/** Directe welkom-mail na signup (idempotent; cron is vangnet). */
export async function sendLifecycleHelloMail(
  userId: string,
  opts?: { dryRun?: boolean; now?: Date }
): Promise<SendLifecycleOneResult> {
  return sendLifecycleTemplateToUser({
    userId,
    templateId: "s0_hello",
    wave: "signup",
    dryRun: opts?.dryRun,
    now: opts?.now,
  });
}
