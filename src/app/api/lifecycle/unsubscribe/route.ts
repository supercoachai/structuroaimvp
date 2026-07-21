import { NextResponse } from "next/server";

import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { verifyLifecycleUnsubscribeToken } from "@/lib/lifecycleMail/unsubscribeToken";
import { captureServerEvent } from "@/lib/posthog/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function htmlPage(title: string, body: string): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>
  body { font-family: Georgia, serif; background: #F7F4EF; color: #1F2A2A; margin: 0; padding: 48px 20px; }
  main { max-width: 420px; margin: 0 auto; background: #fff; padding: 28px 24px; border-radius: 12px; border: 1px solid #E5E0D8; }
  h1 { font-size: 22px; margin: 0 0 12px; }
  p { font-size: 16px; line-height: 1.5; margin: 0 0 10px; }
  a { color: #2D5A56; }
</style>
</head>
<body><main><h1>${title}</h1>${body}</main></body>
</html>`;
  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

/** One-click unsubscribe voor lifecycle-mails (token in query). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const userId = verifyLifecycleUnsubscribeToken(token);

  if (!userId) {
    return htmlPage(
      "Link ongeldig",
      "<p>Deze afmeldlink werkt niet meer. Je kunt ook in de app onder Instellingen om hulp vragen via info@structuro.eu.</p>"
    );
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return htmlPage(
      "Even niet mogelijk",
      "<p>Afmelding kon nu niet worden opgeslagen. Mail info@structuro.eu, dan regelen we het handmatig.</p>"
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update({ unsubscribe_lifecycle: true })
    .eq("id", userId);

  if (error) {
    console.error("[lifecycle/unsubscribe]", error.message);
    return htmlPage(
      "Even niet mogelijk",
      "<p>Afmelding kon nu niet worden opgeslagen. Mail info@structuro.eu.</p>"
    );
  }

  try {
    await captureServerEvent(
      userId,
      ANALYTICS_EVENTS.lifecycle_email_unsubscribed,
      { channel: "server" }
    );
  } catch {
    /* best-effort */
  }

  return htmlPage(
    "Je bent afgemeld",
    "<p>Je ontvangt geen lifecycle-mails meer van Structuro. Transactionele mails (zoals wachtwoord reset) blijven wel werken.</p><p><a href=\"/\">Terug naar Structuro</a></p>"
  );
}
