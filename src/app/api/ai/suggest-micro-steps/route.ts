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
import { consumeAnonymousGlobalMicroStepsCap } from "@/lib/ai/anonymousGlobalMicroStepsCap";
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Anonieme callers: rate-limit EERST (ook template-hits). Voorkomt dat bots
  // het endpoint leeghameren; echte users hebben genoeg aan 2/min en 3/uur.
  let anonQuota: ReturnType<typeof consumeAnonymousMicroStepsQuota> | null =
    null;
  if (!user) {
    anonQuota = consumeAnonymousMicroStepsQuota(getClientIp(request));
    if (!anonQuota.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: "rate_limited",
          limit: anonQuota.limit,
          remaining: anonQuota.remaining,
          reason: anonQuota.reason,
        },
        {
          status: 429,
          headers: { "Retry-After": anonQuota.reason === "burst" ? "60" : "3600" },
        },
      );
    }
  }

  const template = matchMicroStepTemplate(title, locale);
  if (template) {
    return NextResponse.json({
      ok: true,
      steps: template.steps,
      source: "template",
      remaining: anonQuota?.remaining ?? null,
      limit: anonQuota?.limit ?? null,
    });
  }

  if (!user) {
    // Globale noodrem (UTC-dag, hele app): alleen echte AI, niet templates.
    let globalCap;
    try {
      globalCap = await consumeAnonymousGlobalMicroStepsCap();
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      if (message === "service_role_unavailable") {
        return NextResponse.json(
          { ok: false, error: "service_role_unavailable" },
          { status: 503 },
        );
      }
      return NextResponse.json(
        { ok: false, error: "global_cap_check_failed" },
        { status: 500 },
      );
    }

    if (!globalCap.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: "global_cap_reached",
          limit: globalCap.limit,
          remaining: 0,
        },
        {
          status: 429,
          headers: { "Retry-After": "3600" },
        },
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
        remaining: Math.min(anonQuota?.remaining ?? 0, globalCap.remaining),
        limit: anonQuota?.limit ?? 0,
        global_remaining: globalCap.remaining,
        global_limit: globalCap.limit,
      });
    } catch (error) {
      return suggestionErrorResponse(error);
    }
  }

  let peekQuota;
  try {
    peekQuota = await peekMicroStepsAiQuota(user.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    if (message === "service_role_unavailable") {
      return NextResponse.json(
        { ok: false, error: "service_role_unavailable" },
        { status: 503 }
      );
    }
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
      quota = await consumeMicroStepsAiQuota(user.id);
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
