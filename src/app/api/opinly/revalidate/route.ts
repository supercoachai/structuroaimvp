import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { opinlyConfig } from "@opinly/next";
import { routeParams } from "@opinly/shared";
import type { OpinlyWebhookEvent } from "@opinly/backend";

import { withApiErrorTracking } from "@/lib/posthog/withApiErrorTracking";

export const runtime = "nodejs";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

function authorized(request: Request): boolean {
  const secret = process.env.OPINLY_WEBHOOK_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;
  return timingSafeEqual(token, secret);
}

function pathsForEvent(event: OpinlyWebhookEvent): string[] {
  const blogPrefix = opinlyConfig.blogPrefix || "/blog";
  if (event.type === "content.paths-invalidated") {
    return event.data.paths.map((path) =>
      path.startsWith("/") ? path : `${blogPrefix}/${path}`
    );
  }
  return event.data.changed.map((change) => {
    const segments = routeParams(opinlyConfig, change);
    return segments.length ? `${blogPrefix}/${segments.join("/")}` : blogPrefix;
  });
}

async function postOpinlyRevalidate(request: Request) {
  if (!process.env.OPINLY_WEBHOOK_SECRET?.trim()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let event: OpinlyWebhookEvent;
  try {
    event = (await request.json()) as OpinlyWebhookEvent;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (
    event?.type !== "content.routes-changed" &&
    event?.type !== "content.paths-invalidated"
  ) {
    return NextResponse.json({ error: "unsupported_event" }, { status: 400 });
  }

  revalidateTag("opinly");
  for (const path of pathsForEvent(event)) {
    revalidatePath(path);
  }
  revalidatePath("/blog/rss.xml");
  revalidatePath("/blog/sitemap.xml");

  return NextResponse.json({ ok: true });
}

export const POST = withApiErrorTracking("api.opinly.revalidate", postOpinlyRevalidate);
