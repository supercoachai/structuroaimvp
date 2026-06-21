import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";
import {
  LENGTH_LIMITS,
  firstLengthError,
  validateLength,
} from "@/lib/validateLength";
import {
  consumeMicroStepsAiQuota,
  peekMicroStepsAiQuota,
} from "@/lib/ai/microStepsRateLimit";
import { consumeAnonymousMicroStepsQuota } from "@/lib/ai/anonymousMicroStepsRateLimit";
import { getClientIp } from "@/lib/wachtlijst/rateLimit";
import { matchMicroStepTemplate } from "@/lib/ai/microStepTemplates";
import { suggestMicroSteps } from "@/lib/ai/suggestMicroSteps";

/** AI-generatiefouten op een uniforme JSON-respons mappen. */
function suggestionErrorResponse(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : "unknown";
  if (message === "ai_not_configured") {
    return NextResponse.json(
      { ok: false, error: "ai_not_configured" },
      { status: 503 }
    );
  }
  if (message === "invalid_micro_steps") {
    return NextResponse.json(
      { ok: false, error: "generation_failed" },
      { status: 500 }
    );
  }
  console.error("suggest-micro-steps:", error);
  return NextResponse.json(
    { ok: false, error: "generation_failed" },
    { status: 500 }
  );
}

type RequestBody = {
  title?: string;
  energyLevel?: "low" | "medium" | "high";
  durationMin?: number;
  locale?: "nl" | "en";
};

async function postSuggestMicroSteps(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  const lengthError = firstLengthError([
    validateLength("title", title, LENGTH_LIMITS.TASK_TITLE),
  ]);
  if (!title || lengthError) {
    return NextResponse.json(
      { ok: false, error: "invalid_title", message: lengthError },
      { status: 400 }
    );
  }

  const energyLevel =
    body.energyLevel === "low" ||
    body.energyLevel === "medium" ||
    body.energyLevel === "high"
      ? body.energyLevel
      : null;

  const durationMin =
    typeof body.durationMin === "number" &&
    Number.isFinite(body.durationMin) &&
    body.durationMin > 0
      ? Math.min(480, Math.round(body.durationMin))
      : null;

  const locale = body.locale === "en" ? "en" : "nl";

  const template = matchMicroStepTemplate(title, locale);
  if (template) {
    return NextResponse.json({
      ok: true,
      steps: template.steps,
      source: "template",
      remaining: null,
      limit: null,
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Anonieme onboarding-gebruiker: AI-microstappen mogen geprobeerd worden vóór
  // account-aanmaak. Strikte best-effort IP-limiet i.p.v. de per-user DB-quota.
  if (!user) {
    const anonQuota = consumeAnonymousMicroStepsQuota(getClientIp(request));
    if (!anonQuota.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: "rate_limited",
          limit: anonQuota.limit,
          remaining: anonQuota.remaining,
        },
        { status: 429 }
      );
    }

    try {
      const result = await suggestMicroSteps({
        title,
        energyLevel,
        durationMin,
        locale,
      });
      return NextResponse.json({
        ok: true,
        steps: result.steps,
        source: result.source,
        remaining: anonQuota.remaining,
        limit: anonQuota.limit,
      });
    } catch (error) {
      return suggestionErrorResponse(error);
    }
  }

  let peekQuota;
  try {
    peekQuota = await peekMicroStepsAiQuota(supabase);
  } catch {
    return NextResponse.json(
      { ok: false, error: "quota_check_failed" },
      { status: 500 }
    );
  }

  if (!peekQuota.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "rate_limited",
        limit: peekQuota.limit,
        remaining: peekQuota.remaining,
      },
      { status: 429 }
    );
  }

  try {
    const result = await suggestMicroSteps({
      title,
      energyLevel,
      durationMin,
      locale,
    });

    let quota = peekQuota;
    try {
      quota = await consumeMicroStepsAiQuota(supabase);
    } catch {
      console.error("suggest-micro-steps: quota consume after success failed");
    }

    return NextResponse.json({
      ok: true,
      steps: result.steps,
      source: result.source,
      remaining: quota.remaining,
      limit: quota.limit,
    });
  } catch (error) {
    return suggestionErrorResponse(error);
  }
}

export const POST = withApiErrorTracking(
  "POST /api/ai/suggest-micro-steps",
  postSuggestMicroSteps
);
