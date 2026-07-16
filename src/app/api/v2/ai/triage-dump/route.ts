import { NextResponse } from "next/server";
import { z } from "zod";

import { consumeAnonymousTriageDumpQuota } from "@/lib/ai/anonymousTriageDumpRateLimit";
import { templateTriageDump } from "@/lib/ai/triageDumpTemplates";
import { triageDump } from "@/lib/ai/triageDump";
import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";
import { getClientIp } from "@/lib/wachtlijst/rateLimit";

const itemSchema = z.object({
  id: z.string().trim().min(1).max(64),
  content: z.string().trim().min(1).max(500),
  ageHint: z.boolean().optional(),
});

const bodySchema = z.object({
  items: z.array(itemSchema).min(1).max(3),
  locale: z.enum(["nl", "en"]).optional(),
});

function triageErrorResponse(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : "unknown";
  if (message === "ai_not_configured" || message === "items_required") {
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
  console.error("triage-dump:", error);
  return NextResponse.json({ ok: false, error: "generation_failed" }, { status: 500 });
}

async function postTriageDump(request: Request) {
  let parsed: z.infer<typeof bodySchema>;
  try {
    const raw = await request.json();
    parsed = bodySchema.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const items = parsed.items.map((item) => ({
    id: item.id,
    content: item.content,
    ageHint: item.ageHint,
  }));

  const template = templateTriageDump(items);
  const hasTemplateOnly = template.length === items.length;

  const quota = consumeAnonymousTriageDumpQuota(getClientIp(request));
  if (!quota.allowed) {
    if (hasTemplateOnly) {
      return NextResponse.json({
        ok: true,
        results: template,
        source: "template",
        remaining: quota.remaining,
        limit: quota.limit,
      });
    }
    return NextResponse.json(
      {
        ok: false,
        error: "rate_limited",
        limit: quota.limit,
        remaining: quota.remaining,
      },
      { status: 429 },
    );
  }

  try {
    const result = await triageDump({ items, locale: parsed.locale });
    return NextResponse.json({
      ok: true,
      results: result.results,
      source: result.source,
      remaining: quota.remaining,
      limit: quota.limit,
    });
  } catch (error) {
    if (hasTemplateOnly) {
      return NextResponse.json({
        ok: true,
        results: template,
        source: "template",
        remaining: quota.remaining,
        limit: quota.limit,
      });
    }
    return triageErrorResponse(error);
  }
}

export const POST = withApiErrorTracking("POST /api/v2/ai/triage-dump", postTriageDump);
